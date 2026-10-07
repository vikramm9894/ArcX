import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database, Pillar } from '@/lib/database.types';

export type HabitRow = Database['public']['Tables']['habits']['Row'];
export type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];

const HABITS_STORAGE_KEY_PREFIX = '@arc_habits_';
const LOGS_STORAGE_KEY_PREFIX = '@arc_habit_logs_';

const getTodayString = () => new Date().toISOString().split('T')[0];

/**
 * Fetch all active habits for a user
 */
export async function fetchUserHabits(userId: string): Promise<HabitRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('order_index', { ascending: true });

      if (!error && data && data.length > 0) {
        // Cache to AsyncStorage
        await AsyncStorage.setItem(`${HABITS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
        return data;
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback to local storage
  const local = await AsyncStorage.getItem(`${HABITS_STORAGE_KEY_PREFIX}${userId}`);
  if (local) {
    try {
      return JSON.parse(local) as HabitRow[];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Fetch today's completed habit IDs
 */
export async function fetchTodayCompletedHabitIds(
  userId: string,
  dateStr = getTodayString(),
): Promise<string[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id')
        .eq('user_id', userId)
        .eq('completed_date', dateStr);

      if (!error && data) {
        const ids = data.map((d) => d.habit_id);
        await AsyncStorage.setItem(
          `${LOGS_STORAGE_KEY_PREFIX}${userId}_${dateStr}`,
          JSON.stringify(ids),
        );
        return ids;
      }
    } catch {
      // Fallback below
    }
  }

  const local = await AsyncStorage.getItem(`${LOGS_STORAGE_KEY_PREFIX}${userId}_${dateStr}`);
  if (local) {
    try {
      return JSON.parse(local) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Toggle completion of a habit for a given day
 */
export async function toggleHabitLog(
  userId: string,
  habitId: string,
  completed: boolean,
  dateStr = getTodayString(),
): Promise<boolean> {
  // Update local storage first for instant feedback
  const localLogsKey = `${LOGS_STORAGE_KEY_PREFIX}${userId}_${dateStr}`;
  let ids: string[] = [];
  try {
    const raw = await AsyncStorage.getItem(localLogsKey);
    ids = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    ids = [];
  }

  if (completed) {
    if (!ids.includes(habitId)) ids.push(habitId);
  } else {
    ids = ids.filter((id) => id !== habitId);
  }
  await AsyncStorage.setItem(localLogsKey, JSON.stringify(ids));

  // Sync with Supabase if configured
  if (isSupabaseConfigured) {
    try {
      if (completed) {
        await supabase
          .from('habit_logs')
          .insert({
            user_id: userId,
            habit_id: habitId,
            completed_date: dateStr,
          });
      } else {
        await supabase
          .from('habit_logs')
          .delete()
          .eq('user_id', userId)
          .eq('habit_id', habitId)
          .eq('completed_date', dateStr);
      }
    } catch (err) {
      console.warn('Could not sync habit log to Supabase', err);
    }
  }

  return completed;
}

/**
 * Seed starter habits when onboarding completes
 */
export async function seedInitialHabits(
  userId: string,
  habitTitles: string[],
  focusPillar: Pillar = 'discipline',
): Promise<HabitRow[]> {
  const newHabits: HabitRow[] = habitTitles.map((title, index) => ({
    id: `local_habit_${Date.now()}_${index}`,
    user_id: userId,
    title,
    pillar: focusPillar,
    icon: '⚡',
    target_frequency: 'daily',
    is_archived: false,
    order_index: index,
    created_at: new Date().toISOString(),
  }));

  // Store locally
  await AsyncStorage.setItem(`${HABITS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(newHabits));

  // If Supabase is available, attempt remote insert
  if (isSupabaseConfigured) {
    try {
      const inserts = habitTitles.map((title, idx) => ({
        user_id: userId,
        title,
        pillar: focusPillar,
        order_index: idx,
      }));

      const { data } = await supabase.from('habits').insert(inserts).select();
      if (data && data.length > 0) {
        await AsyncStorage.setItem(`${HABITS_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
        return data;
      }
    } catch {
      // Local copy is already saved
    }
  }

  return newHabits;
}
