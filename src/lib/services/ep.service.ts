import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { enqueueOfflineMutation } from './sync.service';

export interface DailyEpResult {
  userId: string;
  day: string;
  habitEp: number;
  workoutEp: number;
  journalEp: number;
  totalEp: number;
  energyGrantedToday: number;
  energyDeltaAdded: number;
  currentEnergy: number;
  level: number;
  hp: number;
}

const LOCAL_EP_CACHE_PREFIX = '@arcx_ep_daily_';

/**
 * Triggers server-side calculation of Effort Points (EP) from verified logs.
 * Solves Problem 1 & 5: Server performs all calculations, client only receives the verified results.
 */
export async function syncMyEp(day?: string): Promise<DailyEpResult | null> {
  const targetDay = day || new Date().toISOString().split('T')[0];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('sync_my_ep', {
        p_day: targetDay,
      });

      if (!error && data) {
        const result: DailyEpResult = {
          userId: (data as any).user_id,
          day: (data as any).day,
          habitEp: (data as any).habit_ep ?? 0,
          workoutEp: (data as any).workout_ep ?? 0,
          journalEp: (data as any).journal_ep ?? 0,
          totalEp: (data as any).total_ep ?? 0,
          energyGrantedToday: (data as any).energy_granted_today ?? 0,
          energyDeltaAdded: (data as any).energy_delta_added ?? 0,
          currentEnergy: (data as any).current_energy ?? 2,
          level: (data as any).level ?? 1,
          hp: (data as any).hp ?? 105,
        };

        // Cache locally for offline preview
        await AsyncStorage.setItem(
          `${LOCAL_EP_CACHE_PREFIX}${targetDay}`,
          JSON.stringify(result)
        );

        return result;
      }
    } catch (err) {
      console.warn('[EP Service] Cloud sync_my_ep error, enqueuing offline sync:', err);
    }
  }

  // Offline fallback: Queue mutation to replay when online
  await enqueueOfflineMutation('UPDATE_PROFILE', {
    action: 'SYNC_MY_EP',
    day: targetDay,
  });

  // Attempt to read cached EP for today
  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_EP_CACHE_PREFIX}${targetDay}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore cache error
  }

  return null;
}

/**
 * Fetch historical or cached EP row for a given day
 */
export async function fetchDailyEp(userId: string, day?: string): Promise<DailyEpResult | null> {
  const targetDay = day || new Date().toISOString().split('T')[0];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('ep_daily')
        .select('*')
        .eq('user_id', userId)
        .eq('day', targetDay)
        .maybeSingle();

      if (!error && data) {
        return {
          userId: data.user_id,
          day: data.day,
          habitEp: data.habit_ep,
          workoutEp: data.workout_ep,
          journalEp: data.journal_ep,
          totalEp: data.total_ep,
          energyGrantedToday: data.energy_granted,
          energyDeltaAdded: 0,
          currentEnergy: 2,
          level: 1,
          hp: 105,
        };
      }
    } catch {
      // Fall through to local cache
    }
  }

  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_EP_CACHE_PREFIX}${targetDay}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }

  return null;
}
