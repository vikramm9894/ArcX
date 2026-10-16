import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncMyEp } from './ep.service';
import { isSupabaseConfigured } from '@/lib/supabase';

const OFFLINE_QUEUE_KEY = '@arcx_offline_ep_sync_queue';

/**
 * Check whether network/Supabase is reachable.
 */
export async function isNetworkOnline(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    // Quick head fetch or timestamp ping
    const res = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

/**
 * Enqueue a date to be synced when internet connectivity returns.
 */
export async function enqueueOfflineEpSync(dateStr: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: string[] = raw ? JSON.parse(raw) : [];
    if (!queue.includes(dateStr)) {
      queue.push(dateStr);
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (err) {
    console.warn('[OfflineQueue] enqueue failed:', err);
  }
}

/**
 * Flush all enqueued dates to the server when device is back online.
 */
export async function flushOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return { synced: 0, remaining: 0 };

    const queue: string[] = JSON.parse(raw);
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    const online = await isNetworkOnline();
    if (!online) {
      return { synced: 0, remaining: queue.length };
    }

    let synced = 0;
    const remaining: string[] = [];

    for (const day of queue) {
      try {
        await syncMyEp(day);
        synced++;
      } catch {
        remaining.push(day);
      }
    }

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    return { synced, remaining: remaining.length };
  } catch (err) {
    console.warn('[OfflineQueue] flush error:', err);
    return { synced: 0, remaining: 0 };
  }
}
