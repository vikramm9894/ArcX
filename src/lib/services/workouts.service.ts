import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type WorkoutRow = Database['public']['Tables']['workouts']['Row'];
export type WorkoutExerciseRow = Database['public']['Tables']['workout_exercises']['Row'];

const WORKOUTS_STORAGE_KEY_PREFIX = '@arc_workouts_';

export async function fetchWorkouts(userId: string): Promise<WorkoutRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .order('workout_date', { ascending: false });

      if (!error && data && data.length > 0) {
        await AsyncStorage.setItem(`${WORKOUTS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
        return data;
      }
    } catch {
      // Fallback
    }
  }

  const local = await AsyncStorage.getItem(`${WORKOUTS_STORAGE_KEY_PREFIX}${userId}`);
  if (local) {
    try {
      return JSON.parse(local) as WorkoutRow[];
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
): Promise<WorkoutRow> {
  const newWorkout: WorkoutRow = {
    id: `local_workout_${Date.now()}`,
    user_id: userId,
    title: workout.title,
    workout_date: workout.workout_date ?? new Date().toISOString().split('T')[0],
    duration_minutes: workout.duration_minutes ?? 45,
    intensity: workout.intensity ?? 'high',
    notes: workout.notes ?? null,
    created_at: new Date().toISOString(),
  };

  // Local storage update
  const existing = await fetchWorkouts(userId);
  const updated = [newWorkout, ...existing];
  await AsyncStorage.setItem(`${WORKOUTS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(updated));

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
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

      if (data) return data;
    } catch {
      // fallback saved
    }
  }

  return newWorkout;
}
