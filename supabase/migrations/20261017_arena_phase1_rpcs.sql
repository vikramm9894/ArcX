-- ==============================================================================
-- ArcX Arena: Phase 1 RPCs Migration
-- Server-Side EP Calculation, Character Selection & Global Ranking
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SYNC_MY_EP (Server-Side Effort Points Calculation Engine)
-- ------------------------------------------------------------------------------
-- Reads verified raw entries from habit_logs, workout_exercises, and journal_entries.
-- Idempotent: can be invoked multiple times without double-crediting EP or Energy.
CREATE OR REPLACE FUNCTION public.sync_my_ep(p_day DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_active_habits INTEGER := 0;
  v_completed_habits INTEGER := 0;
  v_habit_ep INTEGER := 0;
  v_total_reps INTEGER := 0;
  v_volume_kg NUMERIC := 0;
  v_workout_ep INTEGER := 0;
  v_journal_ep INTEGER := 0;
  v_total_ep INTEGER := 0;
  v_prev_ep INTEGER := 0;
  v_prev_energy_granted INTEGER := 0;
  v_target_energy_earned INTEGER := 0;
  v_energy_delta INTEGER := 0;
  v_ep_delta INTEGER := 0;
  v_current_player RECORD;
  v_new_lifetime_ep INTEGER := 0;
  v_new_level INTEGER := 1;
  v_new_hp INTEGER := 105;
  v_new_energy INTEGER := 2;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- 1. Check Server Kill-Switch
  IF NOT (SELECT COALESCE((value->>'enabled')::boolean, true) FROM public.app_config WHERE key = 'arena') THEN
    RAISE EXCEPTION 'ArcX Arena is currently disabled for maintenance.';
  END IF;

  -- 2. HABITS EP (Max 40 EP)
  SELECT COUNT(*) INTO v_active_habits
  FROM public.habits
  WHERE user_id = v_user_id AND NOT is_archived;

  SELECT COUNT(*) INTO v_completed_habits
  FROM public.habit_logs
  WHERE user_id = v_user_id AND completed_date = p_day;

  IF v_active_habits > 0 THEN
    v_habit_ep := LEAST(40, ROUND(40.0 * v_completed_habits / v_active_habits));
  ELSE
    v_habit_ep := 0;
  END IF;

  -- 3. WORKOUT EP (Max 35 EP)
  -- Formula: min(35, 2 * floor(total_reps / 10) + floor(volume_kg / 250))
  SELECT 
    COALESCE(SUM(we.sets * we.reps), 0),
    COALESCE(SUM(we.sets * we.reps * we.weight_kg), 0)
  INTO v_total_reps, v_volume_kg
  FROM public.workouts w
  JOIN public.workout_exercises we ON we.workout_id = w.id
  WHERE w.user_id = v_user_id AND w.workout_date = p_day;

  v_workout_ep := LEAST(35, (2 * FLOOR(v_total_reps / 10.0) + FLOOR(v_volume_kg / 250.0))::INTEGER);

  -- 4. JOURNAL EP (Max 25 EP)
  IF EXISTS (
    SELECT 1 FROM public.journal_entries 
    WHERE user_id = v_user_id AND entry_date = p_day
  ) THEN
    v_journal_ep := 25;
  ELSE
    v_journal_ep := 0;
  END IF;

  -- Total EP capped strictly at 100
  v_total_ep := LEAST(100, v_habit_ep + v_workout_ep + v_journal_ep);

  -- 5. Read previous EP and Energy state for this day
  SELECT total_ep, energy_granted
  INTO v_prev_ep, v_prev_energy_granted
  FROM public.ep_daily
  WHERE user_id = v_user_id AND day = p_day;

  IF NOT FOUND THEN
    v_prev_ep := 0;
    v_prev_energy_granted := 0;
  END IF;

  -- Energy conversion: 1 energy per 20 EP earned, max 5 energy/day
  v_target_energy_earned := LEAST(5, FLOOR(v_total_ep / 20.0)::INTEGER);
  v_energy_delta := GREATEST(0, v_target_energy_earned - v_prev_energy_granted);
  v_ep_delta := GREATEST(0, v_total_ep - v_prev_ep);

  -- 6. Upsert ep_daily ledger
  INSERT INTO public.ep_daily (
    user_id, day, habit_ep, workout_ep, journal_ep, total_ep, energy_granted, updated_at
  )
  VALUES (
    v_user_id, p_day, v_habit_ep, v_workout_ep, v_journal_ep, v_total_ep, v_target_energy_earned, NOW()
  )
  ON CONFLICT (user_id, day) DO UPDATE SET
    habit_ep = EXCLUDED.habit_ep,
    workout_ep = EXCLUDED.workout_ep,
    journal_ep = EXCLUDED.journal_ep,
    total_ep = EXCLUDED.total_ep,
    energy_granted = EXCLUDED.energy_granted,
    updated_at = NOW();

  -- 7. Update player state if player exists
  SELECT * INTO v_current_player
  FROM public.players
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF FOUND THEN
    v_new_lifetime_ep := v_current_player.lifetime_ep + v_ep_delta;
    v_new_level := FLOOR(SQRT(v_new_lifetime_ep / 40.0))::INTEGER + 1;
    v_new_hp := 100 + (5 * v_new_level);
    v_new_energy := LEAST(5, v_current_player.energy + v_energy_delta);

    UPDATE public.players SET
      lifetime_ep = v_new_lifetime_ep,
      level = v_new_level,
      hp = v_new_hp,
      energy = v_new_energy,
      last_active_day = p_day,
      updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'day', p_day,
    'habit_ep', v_habit_ep,
    'workout_ep', v_workout_ep,
    'journal_ep', v_journal_ep,
    'total_ep', v_total_ep,
    'energy_granted_today', v_target_energy_earned,
    'energy_delta_added', v_energy_delta,
    'current_energy', v_new_energy,
    'level', v_new_level,
    'hp', v_new_hp
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 2. CHOOSE_CHARACTER (Character Selection & Setup)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.choose_character(p_character_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_char RECORD;
  v_base_atk NUMERIC(6,2) := 20.00;
  v_base_def NUMERIC(6,2) := 20.00;
  v_base_crit NUMERIC(5,2) := 5.00;
  v_player RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT * INTO v_char FROM public.characters WHERE key = p_character_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid character key: %', p_character_key;
  END IF;

  -- Apply base character bonuses
  IF p_character_key = 'titan' THEN
    v_base_atk := 20.00 * 1.15;
  ELSIF p_character_key = 'sentinel' THEN
    v_base_def := 20.00 * 1.15;
  ELSIF p_character_key = 'monk' THEN
    v_base_crit := 5.00 + 10.00;
  END IF;

  INSERT INTO public.players (
    user_id, character_key, trophies, wins, losses, energy,
    atk, def, crit, hp, level, lifetime_ep, last_active_day, updated_at
  )
  VALUES (
    v_user_id, p_character_key, 0, 0, 0, 2,
    v_base_atk, v_base_def, v_base_crit, 105, 1, 0, CURRENT_DATE, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    character_key = EXCLUDED.character_key,
    atk = v_base_atk,
    def = v_base_def,
    crit = v_base_crit,
    last_active_day = CURRENT_DATE,
    updated_at = NOW()
  RETURNING * INTO v_player;

  RETURN jsonb_build_object(
    'user_id', v_player.user_id,
    'character_key', v_player.character_key,
    'character_name', v_char.name,
    'archetype', v_char.archetype,
    'energy', v_player.energy,
    'trophies', v_player.trophies,
    'atk', v_player.atk,
    'def', v_player.def,
    'crit', v_player.crit,
    'hp', v_player.hp,
    'level', v_player.level
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. REFRESH_MY_STATS (7-Day Rolling Average Attributes)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_my_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_player RECORD;
  v_streak INTEGER := 1;
  v_streak_mult NUMERIC := 1.0;
  v_avg_workout NUMERIC := 0;
  v_avg_habit NUMERIC := 0;
  v_avg_journal NUMERIC := 0;
  v_calc_atk NUMERIC := 20.00;
  v_calc_def NUMERIC := 20.00;
  v_calc_crit NUMERIC := 5.00;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT * INTO v_player FROM public.players WHERE user_id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found. Select a character first.';
  END IF;

  -- 7-Day rolling average EP from ep_daily
  SELECT 
    COALESCE(AVG(workout_ep), 0),
    COALESCE(AVG(habit_ep), 0),
    COALESCE(AVG(journal_ep), 0)
  INTO v_avg_workout, v_avg_habit, v_avg_journal
  FROM public.ep_daily
  WHERE user_id = v_user_id 
    AND day >= CURRENT_DATE - INTERVAL '6 days' 
    AND day <= CURRENT_DATE;

  -- Streak multiplier on ATK & DEF
  SELECT COALESCE(current_streak, 1) INTO v_streak
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_streak >= 30 THEN
    v_streak_mult := 1.50;
  ELSIF v_streak >= 7 THEN
    v_streak_mult := 1.25;
  ELSIF v_streak >= 3 THEN
    v_streak_mult := 1.10;
  ELSE
    v_streak_mult := 1.00;
  END IF;

  -- Formula:
  -- ATK: 20 + 2 * avgWorkoutEP (20 to 90)
  -- DEF: 20 + 1.75 * avgHabitEP (20 to 90)
  -- CRIT: 5 + avgJournalEP (5 to 30)
  v_calc_atk := LEAST(90.0, 20.0 + (2.0 * v_avg_workout)) * v_streak_mult;
  v_calc_def := LEAST(90.0, 20.0 + (1.75 * v_avg_habit)) * v_streak_mult;
  v_calc_crit := LEAST(30.0, 5.0 + v_avg_journal);

  -- Character archetype buffs
  IF v_player.character_key = 'titan' THEN
    v_calc_atk := v_calc_atk * 1.15;
  ELSIF v_player.character_key = 'sentinel' THEN
    v_calc_def := v_calc_def * 1.15;
  ELSIF v_player.character_key = 'monk' THEN
    v_calc_crit := LEAST(45.0, v_calc_crit + 10.0);
  END IF;

  UPDATE public.players SET
    atk = ROUND(v_calc_atk, 2),
    def = ROUND(v_calc_def, 2),
    crit = ROUND(v_calc_crit, 2),
    last_active_day = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'atk', ROUND(v_calc_atk, 2),
    'def', ROUND(v_calc_def, 2),
    'crit', ROUND(v_calc_crit, 2),
    'streak', v_streak,
    'streak_multiplier', v_streak_mult,
    'avg_workout_ep', ROUND(v_avg_workout, 1),
    'avg_habit_ep', ROUND(v_avg_habit, 1),
    'avg_journal_ep', ROUND(v_avg_journal, 1)
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. GLOBAL_LEADERBOARD (Top N Active Warriors)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.global_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  character_key TEXT,
  trophies INTEGER,
  level INTEGER,
  wins INTEGER,
  losses INTEGER,
  streak INTEGER,
  is_bot BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY pl.trophies DESC, pl.wins DESC) AS rank,
    pl.user_id,
    COALESCE(pr.username, pr.full_name, 'Winter Warrior') AS display_name,
    pl.character_key,
    pl.trophies,
    pl.level,
    pl.wins,
    pl.losses,
    COALESCE(pr.current_streak, 1) AS streak,
    pl.is_bot
  FROM public.players pl
  JOIN public.profiles pr ON pr.id = pl.user_id
  WHERE NOT pl.hidden 
    AND NOT pl.banned 
    AND pl.last_active_day >= CURRENT_DATE - INTERVAL '14 days'
  ORDER BY pl.trophies DESC, pl.wins DESC
  LIMIT LEAST(p_limit, 100);
$$;


-- ------------------------------------------------------------------------------
-- 5. MY_RANK (User's Global Rank & Percentile)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_rank()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_my_trophies INTEGER;
  v_rank BIGINT;
  v_total_players BIGINT;
  v_percentile NUMERIC;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT trophies INTO v_my_trophies
  FROM public.players
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('enrolled', false);
  END IF;

  SELECT COUNT(*) INTO v_total_players
  FROM public.players
  WHERE NOT hidden AND NOT banned AND last_active_day >= CURRENT_DATE - INTERVAL '14 days';

  SELECT 1 + COUNT(*) INTO v_rank
  FROM public.players
  WHERE trophies > v_my_trophies 
    AND NOT hidden 
    AND NOT banned 
    AND last_active_day >= CURRENT_DATE - INTERVAL '14 days';

  IF v_total_players > 0 THEN
    v_percentile := ROUND(100.0 * (v_total_players - v_rank + 1) / v_total_players, 1);
  ELSE
    v_percentile := 100.0;
  END IF;

  RETURN jsonb_build_object(
    'enrolled', true,
    'user_id', v_user_id,
    'rank', v_rank,
    'total_players', v_total_players,
    'percentile', v_percentile,
    'trophies', v_my_trophies
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 6. AROUND_ME (Contextual Leaderboard Neighbors)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.around_me(p_n INTEGER DEFAULT 3)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  character_key TEXT,
  trophies INTEGER,
  level INTEGER,
  wins INTEGER,
  losses INTEGER,
  streak INTEGER,
  is_current_user BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked_players AS (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY pl.trophies DESC, pl.wins DESC) AS rank,
      pl.user_id,
      COALESCE(pr.username, pr.full_name, 'Winter Warrior') AS display_name,
      pl.character_key,
      pl.trophies,
      pl.level,
      pl.wins,
      pl.losses,
      COALESCE(pr.current_streak, 1) AS streak,
      (pl.user_id = auth.uid()) AS is_current_user
    FROM public.players pl
    JOIN public.profiles pr ON pr.id = pl.user_id
    WHERE NOT pl.hidden 
      AND NOT pl.banned 
      AND pl.last_active_day >= CURRENT_DATE - INTERVAL '14 days'
  ),
  my_row AS (
    SELECT rank FROM ranked_players WHERE is_current_user = true
  )
  SELECT rp.*
  FROM ranked_players rp, my_row mr
  WHERE rp.rank BETWEEN (mr.rank - p_n) AND (mr.rank + p_n)
  ORDER BY rp.rank ASC;
$$;
