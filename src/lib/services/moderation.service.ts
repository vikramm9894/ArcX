import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const LOCAL_BLOCKED_USERS_KEY = '@arcx_blocked_users_list_v1';

export type ReportReason =
  | 'Inappropriate Username'
  | 'Suspicious Activity / Cheating'
  | 'Harassment / Offensive Behavior'
  | 'Other';

/**
 * Report a player for violating community standards.
 * Required for Apple App Store Review Guideline 1.2 (User Generated Content Safety).
 */
export async function reportPlayer(targetId: string, reason: ReportReason | string): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.rpc('report_player', {
        p_target: targetId,
        p_reason: reason,
      });
      return !error;
    } catch (err) {
      console.warn('[ModerationService] report_player error:', err);
    }
  }

  // Local fallback: log report locally
  try {
    const raw = await AsyncStorage.getItem('@arcx_local_reports');
    const existing = raw ? JSON.parse(raw) : [];
    existing.push({ targetId, reason, date: new Date().toISOString() });
    await AsyncStorage.setItem('@arcx_local_reports', JSON.stringify(existing));
  } catch {
    // Ignore
  }

  return true;
}

/**
 * Block a player. Blocked players will never appear in matchmaking or leaderboard feeds.
 */
export async function blockPlayer(targetId: string): Promise<boolean> {
  // Always record locally immediately for instant UI filtration
  try {
    const blocked = await getLocalBlockedUsers();
    if (!blocked.includes(targetId)) {
      blocked.push(targetId);
      await AsyncStorage.setItem(LOCAL_BLOCKED_USERS_KEY, JSON.stringify(blocked));
    }
  } catch {
    // Ignore
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.rpc('block_player', {
        p_target: targetId,
      });
      return !error;
    } catch (err) {
      console.warn('[ModerationService] block_player error:', err);
    }
  }

  return true;
}

/**
 * Unblock a previously blocked player.
 */
export async function unblockPlayer(targetId: string): Promise<boolean> {
  try {
    const blocked = await getLocalBlockedUsers();
    const filtered = blocked.filter((id) => id !== targetId);
    await AsyncStorage.setItem(LOCAL_BLOCKED_USERS_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.rpc('unblock_player', {
        p_target: targetId,
      });
      return !error;
    } catch (err) {
      console.warn('[ModerationService] unblock_player error:', err);
    }
  }

  return true;
}

/**
 * Get the list of locally blocked user IDs
 */
export async function getLocalBlockedUsers(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_BLOCKED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Toggle whether the current user is visible on the public global leaderboard.
 */
export async function setLeaderboardVisibility(hide: boolean): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.rpc('set_leaderboard_visibility', {
        p_hide: hide,
      });
      return !error;
    } catch (err) {
      console.warn('[ModerationService] set_leaderboard_visibility error:', err);
    }
  }

  try {
    await AsyncStorage.setItem('@arcx_hide_from_leaderboard', JSON.stringify(hide));
  } catch {
    // Ignore
  }

  return true;
}
