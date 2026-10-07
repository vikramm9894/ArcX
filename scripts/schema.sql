-- ==============================================================================
-- WinterARC (ArcX) - Phase 2 Database Schema Migration
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  goal TEXT DEFAULT 'Peak Athletic Condition & Strength',
  focus_pillar TEXT DEFAULT 'discipline' CHECK (focus_pillar IN ('fitness', 'discipline', 'mindfulness')),
  start_date DATE DEFAULT CURRENT_DATE,
  duration_days INTEGER DEFAULT 90 CHECK (duration_days > 0),
  current_streak INTEGER DEFAULT 1 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 1 CHECK (longest_streak >= 0),
  is_onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. HABITS TABLE (User non-negotiables)
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pillar TEXT DEFAULT 'discipline' CHECK (pillar IN ('fitness', 'discipline', 'mindfulness')),
  icon TEXT,
  target_frequency TEXT DEFAULT 'daily',
  is_archived BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. HABIT LOGS TABLE (Daily check-offs)
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT unique_habit_per_day UNIQUE (habit_id, completed_date)
);

-- 4. WORKOUTS TABLE (Fitness sessions)
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER DEFAULT 45,
  intensity TEXT DEFAULT 'high' CHECK (intensity IN ('low', 'medium', 'high', 'extreme')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. WORKOUT EXERCISES TABLE (Sets, Reps, Weight)
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  weight_kg NUMERIC(6, 2) DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 6. JOURNAL ENTRIES TABLE (Mindfulness, Reflections & Mood)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INTEGER DEFAULT 5 CHECK (mood_score BETWEEN 1 AND 5),
  discipline_rating INTEGER DEFAULT 5 CHECK (discipline_rating BETWEEN 1 AND 5),
  reflection_text TEXT,
  gratitude_text TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  CONSTRAINT unique_journal_per_day UNIQUE (user_id, entry_date)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, completed_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, workout_date);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON public.journal_entries(user_id, entry_date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Habits: Users can CRUD their own habits
CREATE POLICY "Users can view own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- Habit Logs: Users can CRUD their own habit logs
CREATE POLICY "Users can view own habit logs"
  ON public.habit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own habit logs"
  ON public.habit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own habit logs"
  ON public.habit_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Workouts: Users can CRUD their own workouts
CREATE POLICY "Users can view own workouts"
  ON public.workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workouts"
  ON public.workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workouts"
  ON public.workouts FOR UPDATE
  USING (auth.uid() = user_id);

-- Workout Exercises: Users can CRUD exercises belonging to their workouts
CREATE POLICY "Users can view own workout exercises"
  ON public.workout_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own workout exercises"
  ON public.workout_exercises FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own workout exercises"
  ON public.workout_exercises FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.workouts w
    WHERE w.id = workout_exercises.workout_id AND w.user_id = auth.uid()
  ));

-- Journal Entries: Users can CRUD their own journal entries
CREATE POLICY "Users can view own journal entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGER: Automatically create profile on user signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, is_onboarded)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
