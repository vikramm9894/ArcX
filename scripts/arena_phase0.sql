-- ==============================================================================
-- ArcX Arena: Phase 0 Security & Hardening Migration
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. SERVER-SIDE APP CONFIG & KILL SWITCH
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

INSERT INTO public.app_config (key, value)
VALUES (
  'arena',
  jsonb_build_object(
    'enabled', true,
    'maintenance', false,
    'maintenance_message', 'ArcX Arena is undergoing seasonal maintenance.',
    'season_number', 1,
    'max_daily_ep', 100,
    'energy_rate_ep', 20,
    'max_energy_stock', 5,
    'shield_duration_hours', 8,
    'rematch_cooldown_hours', 24
  )
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_config' AND policyname = 'Anyone can view app config'
  ) THEN
    CREATE POLICY "Anyone can view app config"
      ON public.app_config FOR SELECT
      USING (true);
  END IF;
END $$;


-- 2. CHARACTERS CATALOG (Titan, Sentinel, Monk)
CREATE TABLE IF NOT EXISTS public.characters (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('fitness', 'discipline', 'mindfulness')),
  archetype TEXT NOT NULL,
  bonus JSONB NOT NULL,
  forms JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

INSERT INTO public.characters (key, name, pillar, archetype, bonus, forms)
VALUES
  (
    'titan',
    'Titan',
    'fitness',
    'Iron Juggernaut',
    jsonb_build_object('atk_mult', 1.15, 'desc', 'Physical mastery grants +15% Attack power.'),
    jsonb_build_array(
      jsonb_build_object('tier', 1, 'name', 'Titan Initiate', 'day', 1),
      jsonb_build_object('tier', 2, 'name', 'Iron Forged', 'day', 7),
      jsonb_build_object('tier', 3, 'name', 'Frost Berserker', 'day', 30),
      jsonb_build_object('tier', 4, 'name', 'Ascended Titan', 'day', 90)
    )
  ),
  (
    'sentinel',
    'Sentinel',
    'discipline',
    'Aegis Defender',
    jsonb_build_object('def_mult', 1.15, 'desc', 'Unbroken routine grants +15% Defense shielding.'),
    jsonb_build_array(
      jsonb_build_object('tier', 1, 'name', 'Sentinel Scout', 'day', 1),
      jsonb_build_object('tier', 2, 'name', 'Shieldbearer', 'day', 7),
      jsonb_build_object('tier', 3, 'name', 'Cold Bastion', 'day', 30),
      jsonb_build_object('tier', 4, 'name', 'Immortal Sentinel', 'day', 90)
    )
  ),
  (
    'monk',
    'Monk',
    'mindfulness',
    'Stoic Mystic',
    jsonb_build_object('crit_bonus', 10.0, 'desc', 'Mental clarity grants +10% Critical Strike Chance.'),
    jsonb_build_array(
      jsonb_build_object('tier', 1, 'name', 'Stoic Novice', 'day', 1),
      jsonb_build_object('tier', 2, 'name', 'Clarity Seeker', 'day', 7),
      jsonb_build_object('tier', 3, 'name', 'Mind Centurion', 'day', 30),
      jsonb_build_object('tier', 4, 'name', 'Ascended Monk', 'day', 90)
    )
  )
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'characters' AND policyname = 'Anyone can view characters'
  ) THEN
    CREATE POLICY "Anyone can view characters"
      ON public.characters FOR SELECT
      USING (true);
  END IF;
END $$;


-- 3. UNTOUCHABLE PLAYERS GAME STATE (Fix for Problem 1)
CREATE TABLE IF NOT EXISTS public.players (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL REFERENCES public.characters(key),
  trophies INTEGER NOT NULL DEFAULT 0 CHECK (trophies >= 0),
  wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
  losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
  energy INTEGER NOT NULL DEFAULT 2 CHECK (energy >= 0 AND energy <= 5),
  shield_until TIMESTAMPTZ,
  atk NUMERIC(6, 2) NOT NULL DEFAULT 20.00 CHECK (atk >= 20.00),
  def NUMERIC(6, 2) NOT NULL DEFAULT 20.00 CHECK (def >= 20.00),
  crit NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (crit >= 5.00 AND crit <= 50.00),
  hp INTEGER NOT NULL DEFAULT 105 CHECK (hp >= 100),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  lifetime_ep INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_ep >= 0),
  last_active_day DATE NOT NULL DEFAULT CURRENT_DATE,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_players_trophies_active 
  ON public.players(trophies DESC) 
  WHERE NOT hidden AND NOT banned;

CREATE INDEX IF NOT EXISTS idx_players_last_active 
  ON public.players(last_active_day DESC);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Anyone can view active players'
  ) THEN
    CREATE POLICY "Anyone can view active players"
      ON public.players FOR SELECT
      USING (true);
  END IF;
END $$;


-- 4. EP DAILY LEDGER
CREATE TABLE IF NOT EXISTS public.ep_daily (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  habit_ep INTEGER NOT NULL DEFAULT 0 CHECK (habit_ep >= 0 AND habit_ep <= 40),
  workout_ep INTEGER NOT NULL DEFAULT 0 CHECK (workout_ep >= 0 AND workout_ep <= 35),
  journal_ep INTEGER NOT NULL DEFAULT 0 CHECK (journal_ep >= 0 AND journal_ep <= 25),
  total_ep INTEGER NOT NULL DEFAULT 0 CHECK (total_ep >= 0 AND total_ep <= 100),
  energy_granted INTEGER NOT NULL DEFAULT 0 CHECK (energy_granted >= 0 AND energy_granted <= 5),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_ep_daily_user_day ON public.ep_daily(user_id, day DESC);

ALTER TABLE public.ep_daily ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ep_daily' AND policyname = 'Users can view their own EP ledger'
  ) THEN
    CREATE POLICY "Users can view their own EP ledger"
      ON public.ep_daily FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- 5. SECURE FRIENDSHIPS (Fix for Problem 2)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id),
  CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(requester_id, addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can view their friendships'
  ) THEN
    CREATE POLICY "Users can view their friendships"
      ON public.friendships FOR SELECT
      USING (auth.uid() IN (requester_id, addressee_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Users can send friend requests'
  ) THEN
    CREATE POLICY "Users can send friend requests"
      ON public.friendships FOR INSERT
      WITH CHECK (auth.uid() = requester_id AND status = 'pending');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'friendships' AND policyname = 'Addressee can respond to request'
  ) THEN
    CREATE POLICY "Addressee can respond to request"
      ON public.friendships FOR UPDATE
      USING (auth.uid() = addressee_id)
      WITH CHECK (auth.uid() = addressee_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.respond_friend_request(p_friendship_id UUID, p_accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.friendships
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      updated_at = NOW()
  WHERE id = p_friendship_id AND addressee_id = auth.uid() AND status = 'pending';
END;
$$;


-- 6. CASUAL ANTI-CHEAT & DATA SANITY CONSTRAINTS (Fix for Problem 5)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_realistic_exercise_reps'
  ) THEN
    ALTER TABLE public.workout_exercises 
      ADD CONSTRAINT chk_realistic_exercise_reps CHECK (reps > 0 AND reps <= 250);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_realistic_exercise_sets'
  ) THEN
    ALTER TABLE public.workout_exercises 
      ADD CONSTRAINT chk_realistic_exercise_sets CHECK (sets > 0 AND sets <= 25);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_realistic_exercise_weight'
  ) THEN
    ALTER TABLE public.workout_exercises 
      ADD CONSTRAINT chk_realistic_exercise_weight CHECK (weight_kg >= 0 AND weight_kg <= 450);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_workout_date_window'
  ) THEN
    ALTER TABLE public.workouts 
      ADD CONSTRAINT chk_workout_date_window 
      CHECK (workout_date <= CURRENT_DATE AND workout_date >= CURRENT_DATE - INTERVAL '2 days');
  END IF;
END $$;
