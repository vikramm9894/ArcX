import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface SeasonInfo {
  id: string;
  seasonNumber: number;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  daysRemaining: number;
}

export interface SeasonHistoryItem {
  seasonId: string;
  seasonNumber: number;
  seasonName: string;
  finalRating: number;
  finalRank: number;
  badge: string;
  createdAt: string;
}

const LOCAL_SEASON_CACHE_KEY = '@arcx_active_season_cache';

/**
 * Fetch the currently active Season information.
 */
export async function fetchActiveSeason(): Promise<SeasonInfo> {
  const fallback: SeasonInfo = {
    id: '00000000-0000-0000-0000-000000000001',
    seasonNumber: 1,
    name: 'Season 1: Frostbite',
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
    isActive: true,
    daysRemaining: 14,
  };

  if (!isSupabaseConfigured) {
    return fallback;
  }

  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .order('season_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const endsAt = new Date(data.ends_at);
      const diffMs = endsAt.getTime() - Date.now();
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const info: SeasonInfo = {
        id: data.id,
        seasonNumber: data.season_number,
        name: data.name,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        isActive: data.is_active,
        daysRemaining: days,
      };

      await AsyncStorage.setItem(LOCAL_SEASON_CACHE_KEY, JSON.stringify(info));
      return info;
    }
  } catch (err) {
    console.warn('[SeasonService] fetchActiveSeason error:', err);
  }

  try {
    const raw = await AsyncStorage.getItem(LOCAL_SEASON_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }

  return fallback;
}

/**
 * Fetch current user's past season badges and final standings
 */
export async function fetchMySeasonHistory(): Promise<SeasonHistoryItem[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('my_season_history');
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          seasonId: d.season_id,
          seasonNumber: d.season_number,
          seasonName: d.season_name,
          finalRating: d.final_rating,
          finalRank: d.final_rank,
          badge: d.badge,
          createdAt: d.created_at,
        }));
      }
    } catch (err) {
      console.warn('[SeasonService] my_season_history error:', err);
    }
  }

  return [];
}

/**
 * Executes season rollover:
 * - Records podium standings in season_results
 * - Performs 30% soft-reset on trophies (70% preserved)
 * - Advances to next season
 */
export async function triggerSeasonRollover(): Promise<any> {
  if (!isSupabaseConfigured) {
    return { success: true, message: 'Local season simulation' };
  }

  try {
    const { data, error } = await supabase.rpc('rollover_season');
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('[SeasonService] rollover_season failed:', err);
    throw err;
  }
}
