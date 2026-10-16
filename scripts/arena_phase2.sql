-- ==============================================================================
-- ArcX Arena: Phase 2 Battles Migration
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. BATTLES TABLE & INDEXES
CREATE TABLE IF NOT EXISTS public.battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  defender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID,
  seed BIGINT NOT NULL,
  attacker_stats JSONB NOT NULL,
  defender_stats JSONB NOT NULL,
  events JSONB NOT NULL,
  winner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attacker_delta INTEGER NOT NULL,
  defender_delta INTEGER NOT NULL,
  defender_seen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_battles_attacker_created ON public.battles(attacker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_defender_created ON public.battles(defender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battles_pair_cooldown ON public.battles(attacker_id, defender_id, created_at DESC);

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'battles' AND policyname = 'Participants can view their battles'
  ) THEN
    CREATE POLICY "Participants can view their battles"
      ON public.battles FOR SELECT
      USING (auth.uid() IN (attacker_id, defender_id));
  END IF;
END $$;


-- 2. NPC BOTS SEEDING (Bootstrap Matchmaking)
DO $$
DECLARE
  v_bot_id UUID;
  v_i INTEGER;
  v_char TEXT;
BEGIN
  FOR v_i IN 1..10 LOOP
    v_bot_id := ('00000000-0000-0000-0000-' || LPAD(v_i::TEXT, 12, '0'))::UUID;
    v_char := CASE (v_i % 3) WHEN 0 THEN 'titan' WHEN 1 THEN 'sentinel' ELSE 'monk' END;

    INSERT INTO public.profiles (id, full_name, username, goal, focus_pillar, start_date, duration_days, current_streak)
    VALUES (
      v_bot_id,
      'Frost Golem #' || v_i,
      'frost_golem_' || v_i,
      'Guard the Winter Arc',
      'discipline',
      CURRENT_DATE - INTERVAL '14 days',
      90,
      v_i * 3
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.players (
      user_id, character_key, trophies, wins, losses, energy,
      atk, def, crit, hp, level, lifetime_ep, is_bot, last_active_day
    )
    VALUES (
      v_bot_id,
      v_char,
      40 * v_i,
      5 * v_i,
      2 * v_i,
      5,
      25.0 + (3.0 * v_i),
      25.0 + (3.0 * v_i),
      5.0 + (1.5 * v_i),
      100 + (5 * v_i),
      v_i,
      v_i * 120,
      TRUE,
      CURRENT_DATE
    )
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;


-- 3. SIMULATE_BATTLE (Pure Deterministic Function)
CREATE OR REPLACE FUNCTION public.simulate_battle(
  a_stats JSONB,
  d_stats JSONB,
  p_seed BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_seed BIGINT := ABS(p_seed);
  v_a_atk NUMERIC := (a_stats->>'atk')::NUMERIC;
  v_a_def NUMERIC := (a_stats->>'def')::NUMERIC;
  v_a_crit NUMERIC := (a_stats->>'crit')::NUMERIC;
  v_a_hp NUMERIC := (a_stats->>'hp')::NUMERIC;
  v_a_max_hp NUMERIC := v_a_hp;

  v_d_atk NUMERIC := (d_stats->>'atk')::NUMERIC;
  v_d_def NUMERIC := (d_stats->>'def')::NUMERIC;
  v_d_crit NUMERIC := (d_stats->>'crit')::NUMERIC;
  v_d_hp NUMERIC := (d_stats->>'hp')::NUMERIC;
  v_d_max_hp NUMERIC := v_d_hp;

  v_round INTEGER;
  v_events JSONB := '[]'::JSONB;
  v_rand1 NUMERIC;
  v_rand2 NUMERIC;
  v_ratio NUMERIC;
  v_base_pct NUMERIC;
  v_variance NUMERIC;
  v_is_crit BOOLEAN;
  v_dmg_pct NUMERIC;
  v_dmg INTEGER;
  v_winner TEXT;
  v_a_final_pct INTEGER;
  v_d_final_pct INTEGER;
BEGIN
  FOR v_round IN 1..6 LOOP
    v_seed := (v_seed * 16807) % 2147483647;
    v_rand1 := (v_seed::NUMERIC - 1.0) / 2147483646.0;

    v_seed := (v_seed * 16807) % 2147483647;
    v_rand2 := (v_seed::NUMERIC - 1.0) / 2147483646.0;

    v_ratio := GREATEST(0.1, v_a_atk / GREATEST(1.0, v_d_def));
    v_base_pct := LEAST(28.0, GREATEST(5.0, 12.0 * SQRT(v_ratio)));
    v_variance := 0.85 + (v_rand1 * 0.30);
    v_is_crit := (v_rand2 * 100.0) < v_a_crit;

    v_dmg_pct := v_base_pct * v_variance * (CASE WHEN v_is_crit THEN 1.5 ELSE 1.0 END);
    v_dmg_pct := LEAST(32.0, v_dmg_pct);
    v_dmg := GREATEST(5, ROUND(v_d_max_hp * (v_dmg_pct / 100.0))::INTEGER);

    v_d_hp := GREATEST(0.0, v_d_hp - v_dmg);

    v_events := v_events || jsonb_build_object(
      'round', v_round,
      'hitter', 'attacker',
      'damage', v_dmg,
      'damage_pct', ROUND(v_dmg_pct, 1),
      'is_crit', v_is_crit,
      'attacker_hp', ROUND(v_a_hp)::INTEGER,
      'defender_hp', ROUND(v_d_hp)::INTEGER
    );

    IF v_d_hp <= 0 THEN
      EXIT;
    END IF;

    v_seed := (v_seed * 16807) % 2147483647;
    v_rand1 := (v_seed::NUMERIC - 1.0) / 2147483646.0;

    v_seed := (v_seed * 16807) % 2147483647;
    v_rand2 := (v_seed::NUMERIC - 1.0) / 2147483646.0;

    v_ratio := GREATEST(0.1, v_d_atk / GREATEST(1.0, v_a_def));
    v_base_pct := LEAST(28.0, GREATEST(5.0, 12.0 * SQRT(v_ratio)));
    v_variance := 0.85 + (v_rand1 * 0.30);
    v_is_crit := (v_rand2 * 100.0) < v_d_crit;

    v_dmg_pct := v_base_pct * v_variance * (CASE WHEN v_is_crit THEN 1.5 ELSE 1.0 END);
    v_dmg_pct := LEAST(32.0, v_dmg_pct);
    v_dmg := GREATEST(5, ROUND(v_a_max_hp * (v_dmg_pct / 100.0))::INTEGER);

    v_a_hp := GREATEST(0.0, v_a_hp - v_dmg);

    v_events := v_events || jsonb_build_object(
      'round', v_round,
      'hitter', 'defender',
      'damage', v_dmg,
      'damage_pct', ROUND(v_dmg_pct, 1),
      'is_crit', v_is_crit,
      'attacker_hp', ROUND(v_a_hp)::INTEGER,
      'defender_hp', ROUND(v_d_hp)::INTEGER
    );

    IF v_a_hp <= 0 THEN
      EXIT;
    END IF;
  END LOOP;

  v_a_final_pct := ROUND((v_a_hp / v_a_max_hp) * 100)::INTEGER;
  v_d_final_pct := ROUND((v_d_hp / v_d_max_hp) * 100)::INTEGER;

  IF v_a_final_pct > v_d_final_pct THEN
    v_winner := 'attacker';
  ELSE
    v_winner := 'defender';
  END IF;

  RETURN jsonb_build_object(
    'winner', v_winner,
    'rounds_played', v_round,
    'attacker_final_pct', v_a_final_pct,
    'defender_final_pct', v_d_final_pct,
    'events', v_events
  );
END;
$$;


-- 4. FIND_OPPONENTS
CREATE OR REPLACE FUNCTION public.find_opponents()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  character_key TEXT,
  trophies INTEGER,
  level INTEGER,
  wins INTEGER,
  losses INTEGER,
  is_bot BOOLEAN,
  is_shielded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_trophies INTEGER;
BEGIN
  SELECT trophies INTO v_my_trophies 
  FROM public.players 
  WHERE players.user_id = auth.uid();

  IF v_my_trophies IS NULL THEN
    v_my_trophies := 0;
  END IF;

  RETURN QUERY
  SELECT 
    pl.user_id,
    COALESCE(pr.username, pr.full_name, 'Winter Warrior') AS display_name,
    pl.character_key,
    pl.trophies,
    pl.level,
    pl.wins,
    pl.losses,
    pl.is_bot,
    (pl.shield_until IS NOT NULL AND pl.shield_until > NOW()) AS is_shielded
  FROM public.players pl
  JOIN public.profiles pr ON pr.id = pl.user_id
  WHERE pl.user_id <> auth.uid()
    AND NOT pl.hidden
    AND NOT pl.banned
    AND (pl.shield_until IS NULL OR pl.shield_until <= NOW())
    AND NOT EXISTS (
      SELECT 1 FROM public.battles b
      WHERE b.attacker_id = auth.uid() 
        AND b.defender_id = pl.user_id 
        AND b.created_at >= NOW() - INTERVAL '24 hours'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks bl
      WHERE (bl.blocker_id = auth.uid() AND bl.blocked_id = pl.user_id)
         OR (bl.blocker_id = pl.user_id AND bl.blocked_id = auth.uid())
    )
  ORDER BY 
    ABS(pl.trophies - v_my_trophies) ASC,
    pl.last_active_day DESC
  LIMIT 5;
END;
$$;


-- 5. ATTACK
CREATE OR REPLACE FUNCTION public.attack(p_defender UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attacker_id UUID;
  v_attacker_player RECORD;
  v_defender_player RECORD;
  v_seed BIGINT;
  v_sim JSONB;
  v_winner_key TEXT;
  v_winner_id UUID;
  v_ea NUMERIC;
  v_gain INTEGER;
  v_loss INTEGER;
  v_attacker_delta INTEGER;
  v_defender_delta INTEGER;
  v_battle_id UUID;
BEGIN
  v_attacker_id := auth.uid();
  IF v_attacker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  IF v_attacker_id = p_defender THEN
    RAISE EXCEPTION 'Cannot attack yourself.';
  END IF;

  IF NOT (SELECT COALESCE((value->>'enabled')::boolean, true) FROM public.app_config WHERE key = 'arena') THEN
    RAISE EXCEPTION 'ArcX Arena is currently disabled for maintenance.';
  END IF;

  SELECT * INTO v_attacker_player
  FROM public.players
  WHERE user_id = v_attacker_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attacker player record not found. Select a champion first.';
  END IF;

  IF v_attacker_player.energy < 1 THEN
    RAISE EXCEPTION 'Insufficient energy. Complete real daily tasks to earn energy.';
  END IF;

  SELECT * INTO v_defender_player
  FROM public.players
  WHERE user_id = p_defender
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Defender player record not found.';
  END IF;

  IF v_defender_player.shield_until IS NOT NULL AND v_defender_player.shield_until > NOW() THEN
    RAISE EXCEPTION 'Defender is protected by an active shield.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.battles 
    WHERE attacker_id = v_attacker_id 
      AND defender_id = p_defender 
      AND created_at >= NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION '24-hour rematch cooldown is active against this opponent.';
  END IF;

  UPDATE public.players 
  SET energy = energy - 1, updated_at = NOW()
  WHERE user_id = v_attacker_id;

  v_seed := ABS((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT + FLOOR(RANDOM() * 9999)::BIGINT);

  v_sim := public.simulate_battle(
    jsonb_build_object(
      'atk', v_attacker_player.atk,
      'def', v_attacker_player.def,
      'crit', v_attacker_player.crit,
      'hp', v_attacker_player.hp
    ),
    jsonb_build_object(
      'atk', v_defender_player.atk,
      'def', v_defender_player.def,
      'crit', v_defender_player.crit,
      'hp', v_defender_player.hp
    ),
    v_seed
  );

  v_winner_key := v_sim->>'winner';
  IF v_winner_key = 'attacker' THEN
    v_winner_id := v_attacker_id;
  ELSE
    v_winner_id := p_defender;
  END IF;

  v_ea := 1.0 / (1.0 + POWER(10.0, (v_defender_player.trophies - v_attacker_player.trophies)::NUMERIC / 400.0));

  IF v_winner_key = 'attacker' THEN
    v_gain := LEAST(30, GREATEST(8, ROUND(24.0 * (1.0 - v_ea))::INTEGER));
    v_loss := ROUND(v_gain / 2.0)::INTEGER;

    IF v_defender_player.is_bot THEN
      v_gain := GREATEST(4, ROUND(v_gain * 0.5)::INTEGER);
    END IF;

    v_attacker_delta := v_gain;
    v_defender_delta := -v_loss;

    UPDATE public.players SET
      trophies = trophies + v_attacker_delta,
      wins = wins + 1,
      last_active_day = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = v_attacker_id;

    UPDATE public.players SET
      trophies = GREATEST(0, trophies + v_defender_delta),
      losses = losses + 1,
      shield_until = NOW() + INTERVAL '8 hours',
      updated_at = NOW()
    WHERE user_id = p_defender;
  ELSE
    v_loss := LEAST(18, GREATEST(4, ROUND(24.0 * v_ea * 0.6)::INTEGER));
    v_gain := 5;

    v_attacker_delta := -v_loss;
    v_defender_delta := v_gain;

    UPDATE public.players SET
      trophies = GREATEST(0, trophies + v_attacker_delta),
      losses = losses + 1,
      last_active_day = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = v_attacker_id;

    UPDATE public.players SET
      trophies = trophies + v_defender_delta,
      wins = wins + 1,
      updated_at = NOW()
    WHERE user_id = p_defender;
  END IF;

  INSERT INTO public.battles (
    attacker_id, defender_id, seed,
    attacker_stats, defender_stats, events,
    winner_id, attacker_delta, defender_delta, defender_seen, created_at
  )
  VALUES (
    v_attacker_id, p_defender, v_seed,
    jsonb_build_object(
      'name', COALESCE((SELECT full_name FROM public.profiles WHERE id = v_attacker_id), 'Attacker'),
      'character_key', v_attacker_player.character_key,
      'atk', v_attacker_player.atk,
      'def', v_attacker_player.def,
      'crit', v_attacker_player.crit,
      'hp', v_attacker_player.hp,
      'level', v_attacker_player.level
    ),
    jsonb_build_object(
      'name', COALESCE((SELECT full_name FROM public.profiles WHERE id = p_defender), 'Defender'),
      'character_key', v_defender_player.character_key,
      'atk', v_defender_player.atk,
      'def', v_defender_player.def,
      'crit', v_defender_player.crit,
      'hp', v_defender_player.hp,
      'level', v_defender_player.level,
      'is_bot', v_defender_player.is_bot
    ),
    v_sim->'events',
    v_winner_id, v_attacker_delta, v_defender_delta, FALSE, NOW()
  )
  RETURNING id INTO v_battle_id;

  RETURN jsonb_build_object(
    'battle_id', v_battle_id,
    'seed', v_seed,
    'winner_id', v_winner_id,
    'attacker_id', v_attacker_id,
    'defender_id', p_defender,
    'is_victory', (v_winner_id = v_attacker_id),
    'attacker_delta', v_attacker_delta,
    'defender_delta', v_defender_delta,
    'rounds_played', v_sim->'rounds_played',
    'attacker_final_pct', v_sim->'attacker_final_pct',
    'defender_final_pct', v_sim->'defender_final_pct',
    'events', v_sim->'events'
  );
END;
$$;


-- 6. MY_BATTLES & MARK_BATTLE_SEEN
CREATE OR REPLACE FUNCTION public.my_battles(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  battle_id UUID,
  attacker_id UUID,
  defender_id UUID,
  winner_id UUID,
  is_attacker BOOLEAN,
  is_victory BOOLEAN,
  opponent_name TEXT,
  opponent_char TEXT,
  trophies_delta INTEGER,
  created_at TIMESTAMPTZ,
  defender_seen BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id AS battle_id,
    b.attacker_id,
    b.defender_id,
    b.winner_id,
    (b.attacker_id = auth.uid()) AS is_attacker,
    (b.winner_id = auth.uid()) AS is_victory,
    CASE 
      WHEN b.attacker_id = auth.uid() THEN (b.defender_stats->>'name')
      ELSE (b.attacker_stats->>'name')
    END AS opponent_name,
    CASE 
      WHEN b.attacker_id = auth.uid() THEN (b.defender_stats->>'character_key')
      ELSE (b.attacker_stats->>'character_key')
    END AS opponent_char,
    CASE 
      WHEN b.attacker_id = auth.uid() THEN b.attacker_delta
      ELSE b.defender_delta
    END AS trophies_delta,
    b.created_at,
    b.defender_seen
  FROM public.battles b
  WHERE b.attacker_id = auth.uid() OR b.defender_id = auth.uid()
  ORDER BY b.created_at DESC
  LIMIT LEAST(p_limit, 50);
$$;

CREATE OR REPLACE FUNCTION public.mark_battle_seen(p_battle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.battles
  SET defender_seen = TRUE
  WHERE id = p_battle_id AND defender_id = auth.uid();
END;
$$;
