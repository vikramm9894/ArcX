import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const QUEUE_STORAGE_KEY = '@arcx_offline_mutations_queue_v1';
const LAST_SYNC_KEY = '@arcx_last_sync_timestamp';

export type MutationType =
  | 'TOGGLE_HABIT'
  | 'CREATE_WORKOUT'
  | 'CREATE_JOURNAL'
  | 'UPDATE_PROFILE';

export interface OfflineMutation {
  id: string;
  type: MutationType;
  payload: any;
  createdAt: string;
  retryCount: number;
}

export interface SyncStatus {
  isConfigured: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
}

let isCurrentlySyncing = false;

/**
 * Enqueue a mutation when the user performs an action offline
 */
export async function enqueueOfflineMutation(type: MutationType, payload: any): Promise<void> {
  try {
    const queue = await getPendingMutations();
    const newMutation: OfflineMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(newMutation);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[ArcX Sync] Failed to enqueue mutation:', err);
  }
}

/**
 * Retrieve all pending offline mutations
 */
export async function getPendingMutations(): Promise<OfflineMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineMutation[];
  } catch {
    return [];
  }
}

/**
 * Clear all pending items from offline queue
 */
export async function clearSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (err) {
    console.warn('[ArcX Sync] Failed to clear queue:', err);
  }
}

/**
 * Fetch high-level sync status for UI badges
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  const pending = await getPendingMutations();
  const lastSynced = await AsyncStorage.getItem(LAST_SYNC_KEY);

  return {
    isConfigured: isSupabaseConfigured,
    pendingCount: pending.length,
    lastSyncedAt: lastSynced,
    isSyncing: isCurrentlySyncing,
  };
}

/**
 * Process and replay pending offline mutations to Supabase
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (isCurrentlySyncing) {
    return { synced: 0, failed: 0 };
  }

  if (!isSupabaseConfigured) {
    return { synced: 0, failed: 0 };
  }

  const queue = await getPendingMutations();
  if (queue.length === 0) {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return { synced: 0, failed: 0 };
  }

  isCurrentlySyncing = true;
  let synced = 0;
  let failed = 0;
  const remainingQueue: OfflineMutation[] = [];

  try {
    for (const item of queue) {
      try {
        let success = false;

        switch (item.type) {
          case 'TOGGLE_HABIT': {
            const { habitId, userId, date, completed } = item.payload;
            if (completed) {
              const { error } = await supabase.from('habit_logs').insert({
                habit_id: habitId,
                user_id: userId,
                completed_date: date,
              });
              success = !error;
            } else {
              const { error } = await supabase
                .from('habit_logs')
                .delete()
                .eq('user_id', userId)
                .eq('habit_id', habitId)
                .eq('completed_date', date);
              success = !error;
            }
            break;
          }

          case 'CREATE_WORKOUT': {
            const { workout, exercises } = item.payload;
            const { data: wData, error: wError } = await supabase
              .from('workouts')
              .insert(workout)
              .select()
              .single();

            if (!wError && wData) {
              if (exercises && exercises.length > 0) {
                const exToInsert = exercises.map((ex: any) => ({
                  ...ex,
                  workout_id: wData.id,
                }));
                await supabase.from('workout_exercises').insert(exToInsert);
              }
              success = true;
            }
            break;
          }

          case 'CREATE_JOURNAL': {
            const { entry } = item.payload;
            const { error } = await supabase.from('journal_entries').upsert(entry);
            success = !error;
            break;
          }

          case 'UPDATE_PROFILE': {
            const { userId, updates } = item.payload;
            const { error } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', userId);
            success = !error;
            break;
          }

          default:
            success = true; // Drop unrecognized item
        }

        if (success) {
          synced++;
        } else {
          item.retryCount += 1;
          if (item.retryCount < 5) {
            remainingQueue.push(item);
          }
          failed++;
        }
      } catch {
        item.retryCount += 1;
        if (item.retryCount < 5) {
          remainingQueue.push(item);
        }
        failed++;
      }
    }

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } finally {
    isCurrentlySyncing = false;
  }

  return { synced, failed };
}
