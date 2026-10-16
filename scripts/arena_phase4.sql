-- ==============================================================================
-- Script: scripts/arena_phase4.sql
-- Description: Phase 4 Seasons, Soft-Reset Rollover, UGC Safety, Reports, and Blocks
-- ==============================================================================

-- 1. SEASONS TABLE
CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL UNIQUE DEFAULT 1,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.seasons (season_number, name, starts_at, ends_at, is_active)
SELECT 1, 'Season 1: Frostbite', NOW(), NOW() + INTERVAL '14 days', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.seasons WHERE season_number = 1);

-- 2. SEASON RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.season_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_rating INTEGER NOT NULL,
  final_rank INTEGER NOT NULL,
  badge TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_season_results_user ON public.season_results(user_id);
CREATE INDEX IF NOT EXISTS idx_season_results_season ON public.season_results(season_id, final_rank);

-- 3. USER SAFETY: REPORTS TABLE (Apple Guideline 1.2 UGC Compliance)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_id);

-- 4. USER SAFETY: BLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON public.blocks(blocked_id);

-- 5. LEADERBOARD VISIBILITY COLUMN
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'hide_from_leaderboard'
  ) THEN
    ALTER TABLE public.players ADD COLUMN hide_from_leaderboard BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- 6. RLS POLICIES
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seasons are viewable by all authenticated users" ON public.seasons;
CREATE POLICY "Seasons are viewable by all authenticated users"
  ON public.seasons FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Season results are viewable by all authenticated users" ON public.season_results;
CREATE POLICY "Season results are viewable by all authenticated users"
  ON public.season_results FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
CREATE POLICY "Users can insert reports"
  ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can manage their own blocks" ON public.blocks;
CREATE POLICY "Users can manage their own blocks"
  ON public.blocks FOR ALL TO authenticated USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- 7. REPORT_PLAYER
CREATE OR REPLACE FUNCTION public.report_player(p_target UUID, p_reason TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  IF auth.uid() = p_target THEN RAISE EXCEPTION 'You cannot report yourself.'; END IF;
  INSERT INTO public.reports (reporter_id, target_id, reason)
  VALUES (auth.uid(), p_target, TRIM(p_reason));
  RETURN TRUE;
END;
$$;

-- 8. BLOCK_PLAYER & UNBLOCK_PLAYER
CREATE OR REPLACE FUNCTION public.block_player(p_target UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  IF auth.uid() = p_target THEN RAISE EXCEPTION 'You cannot block yourself.'; END IF;
  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (auth.uid(), p_target) ON CONFLICT (blocker_id, blocked_id) DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_player(p_target UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  DELETE FROM public.blocks WHERE blocker_id = auth.uid() AND blocked_id = p_target;
  RETURN TRUE;
END;
$$;

-- 9. SET_LEADERBOARD_VISIBILITY
CREATE OR REPLACE FUNCTION public.set_leaderboard_visibility(p_hide BOOLEAN)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;
  UPDATE public.players SET hide_from_leaderboard = p_hide WHERE user_id = auth.uid();
  RETURN TRUE;
END;
$$;

-- 10. ROLLOVER_SEASON
CREATE OR REPLACE FUNCTION public.rollover_season()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_active_season RECORD;
  v_next_season_num INTEGER;
  v_next_season_name TEXT;
  v_new_season_id UUID;
  v_rank INTEGER := 1;
  v_player RECORD;
  v_badge TEXT;
  v_total_archived INTEGER := 0;
BEGIN
  SELECT * INTO v_active_season FROM public.seasons WHERE is_active = TRUE ORDER BY season_number DESC LIMIT 1;
  IF v_active_season IS NULL THEN RAISE EXCEPTION 'No active season found to rollover.'; END IF;

  FOR v_player IN (
    SELECT pl.user_id, pl.trophies
    FROM public.players pl
    WHERE NOT pl.hidden AND NOT pl.banned
    ORDER BY pl.trophies DESC, pl.lifetime_ep DESC
  ) LOOP
    IF v_rank = 1 THEN v_badge := 'Grand Champion 👑';
    ELSIF v_rank <= 3 THEN v_badge := 'Podium Master 🥇';
    ELSIF v_rank <= 10 THEN v_badge := 'Top 10 Ascended ⚡';
    ELSIF v_rank <= 50 THEN v_badge := 'Titan Elite ⚔️';
    ELSE v_badge := 'Season Veteran 🛡️';
    END IF;

    INSERT INTO public.season_results (season_id, user_id, final_rating, final_rank, badge)
    VALUES (v_active_season.id, v_player.user_id, v_player.trophies, v_rank, v_badge);

    v_rank := v_rank + 1;
    v_total_archived := v_total_archived + 1;
  END LOOP;

  UPDATE public.players
  SET trophies = GREATEST(0, ROUND(trophies * 0.70)::INTEGER), energy = 2, shield_until = NULL;

  UPDATE public.profiles
  SET trophies = pl.trophies
  FROM public.players pl WHERE profiles.id = pl.user_id;

  UPDATE public.seasons SET is_active = FALSE WHERE id = v_active_season.id;

  v_next_season_num := v_active_season.season_number + 1;
  v_next_season_name := 'Season ' || v_next_season_num || ': Deep Freeze';

  INSERT INTO public.seasons (season_number, name, starts_at, ends_at, is_active)
  VALUES (v_next_season_num, v_next_season_name, NOW(), NOW() + INTERVAL '14 days', TRUE)
  RETURNING id INTO v_new_season_id;

  RETURN jsonb_build_object(
    'previous_season_id', v_active_season.id,
    'previous_season_number', v_active_season.season_number,
    'players_archived', v_total_archived,
    'new_season_id', v_new_season_id,
    'new_season_number', v_next_season_num,
    'new_season_name', v_next_season_name,
    'soft_reset_ratio', 0.70
  );
END;
$$;

-- 11. MY_SEASON_HISTORY
CREATE OR REPLACE FUNCTION public.my_season_history()
RETURNS TABLE (
  season_id UUID,
  season_number INTEGER,
  season_name TEXT,
  final_rating INTEGER,
  final_rank INTEGER,
  badge TEXT,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT s.id AS season_id, s.season_number, s.name AS season_name, sr.final_rating, sr.final_rank, sr.badge, sr.created_at
  FROM public.season_results sr
  JOIN public.seasons s ON s.id = sr.season_id
  WHERE sr.user_id = auth.uid()
  ORDER BY s.season_number DESC;
END;
$$;
