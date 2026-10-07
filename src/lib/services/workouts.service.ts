import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type WorkoutRow = Database['public']['Tables']['workouts']['Row'];
export type WorkoutExerciseRow = Database['public']['Tables']['workout_exercises']['Row'];

export interface WorkoutWithExercises extends WorkoutRow {
  exercises?: WorkoutExerciseRow[];
}

export interface ExerciseInput {
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
}

const WORKOUTS_STORAGE_KEY_PREFIX = '@arc_workouts_';
const EXERCISES_STORAGE_KEY_PREFIX = '@arc_workout_exercises_';

export async function fetchWorkouts(userId: string): Promise<WorkoutWithExercises[]> {
  let baseWorkouts: WorkoutRow[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('workout_date', { ascending: false });

      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(`${WORKOUTS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
        baseWorkouts = data;
      }
    } catch {
      // Fallback
    }
  }

  if (baseWorkouts.length === 0) {
    const local = await AsyncStorage.getItem(`${WORKOUTS_STORAGE_KEY_PREFIX}${userId}`);
    if (local) {
      try {
        baseWorkouts = JSON.parse(local) as WorkoutRow[];
      } catch {
        baseWorkouts = [];
      }
    }
  }

  // Hydrate exercises for each workout from local storage or remote
  const hydrated: WorkoutWithExercises[] = await Promise.all(
    baseWorkouts.map(async (w) => {
      const exercises = await fetchWorkoutExercises(w.id);
      return { ...w, exercises };
    }),
  );

  return hydrated;
}

export async function fetchWorkoutExercises(workoutId: string): Promise<WorkoutExerciseRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .select('*')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(
          `${EXERCISES_STORAGE_KEY_PREFIX}${workoutId}`,
          JSON.stringify(data),
        );
        return data;
      }
    } catch {
      // Fallback
    }
  }

  const local = await AsyncStorage.getItem(`${EXERCISES_STORAGE_KEY_PREFIX}${workoutId}`);
  if (local) {
    try {
      return JSON.parse(local) as WorkoutExerciseRow[];
    } catch {
      return [];
    }
  }
  return [];
}

export async function logWorkout(
  userId: string,
  workout: {
    title: string;
    workout_date?: string;
    duration_minutes?: number;
    intensity?: 'low' | 'medium' | 'high' | 'extreme';
    notes?: string;
  },
  exercises?: ExerciseInput[],
): Promise<WorkoutWithExercises> {
  const newWorkoutId = `local_workout_${Date.now()}`;
  const dateStr = workout.workout_date ?? new Date().toISOString().split('T')[0];

  const newWorkout: WorkoutRow = {
    id: newWorkoutId,
    user_id: userId,
    title: workout.title,
    workout_date: dateStr,
    duration_minutes: workout.duration_minutes ?? 45,
    intensity: workout.intensity ?? 'high',
    notes: workout.notes ?? null,
    created_at: new Date().toISOString(),
  };

  const createdExercises: WorkoutExerciseRow[] = (exercises ?? []).map((ex, idx) => ({
    id: `local_ex_${Date.now()}_${idx}`,
    workout_id: newWorkoutId,
    exercise_name: ex.exercise_name,
    sets: ex.sets,
    reps: ex.reps,
    weight_kg: ex.weight_kg,
    order_index: idx,
    created_at: new Date().toISOString(),
  }));

  // Local storage update for workout
  const existing = await fetchWorkouts(userId);
  const workoutWithEx: WorkoutWithExercises = {
    ...newWorkout,
    exercises: createdExercises,
  };
  const updated = [workoutWithEx, ...existing];
  await AsyncStorage.setItem(`${WORKOUTS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));

  // Local storage update for exercises
  if (createdExercises.length > 0) {
    await AsyncStorage.setItem(
      `${EXERCISES_STORAGE_KEY_PREFIX}${newWorkoutId}`,
      JSON.stringify(createdExercises),
    );
  }

  if (isSupabaseConfigured) {
    try {
      const { data: remoteWorkout } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          title: newWorkout.title,
          workout_date: newWorkout.workout_date,
          duration_minutes: newWorkout.duration_minutes,
          intensity: newWorkout.intensity,
          notes: newWorkout.notes,
        })
        .select()
        .single();

      if (remoteWorkout) {
        if (exercises && exercises.length > 0) {
          const remoteInserts = exercises.map((ex, idx) => ({
            workout_id: remoteWorkout.id,
            exercise_name: ex.exercise_name,
            sets: ex.sets,
            reps: ex.reps,
            weight_kg: ex.weight_kg,
            order_index: idx,
          }));

          const { data: insertedExercises } = await supabase
            .from('workout_exercises')
            .insert(remoteInserts)
            .select();

          return {
            ...remoteWorkout,
            exercises: insertedExercises ?? createdExercises,
          };
        }
        return { ...remoteWorkout, exercises: createdExercises };
      }
    } catch {
      // fallback saved
    }
  }

  return workoutWithEx;
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<boolean> {
  const existing = await fetchWorkouts(userId);
  const updated = existing.filter((w) => w.id !== workoutId);
  await AsyncStorage.setItem(`${WORKOUTS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));
  await AsyncStorage.removeItem(`${EXERCISES_STORAGE_KEY_PREFIX}${workoutId}`);

  if (isSupabaseConfigured) {
    try {
      await supabase.from('workouts').delete().eq('id', workoutId).eq('user_id', userId);
    } catch {
      // Local copy updated
    }
  }

  return true;
}
