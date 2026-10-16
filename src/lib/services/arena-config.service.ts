import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const ARENA_CONFIG_CACHE_KEY = '@arcx_arena_config_cache_v1';
const CACHE_TTL_MS = 60 * 1000; // 1 minute local cache

export interface ArenaAppConfig {
  enabled: boolean;
  maintenance: boolean;
  maintenance_message: string;
  season_number: number;
  max_daily_ep: number;
  energy_rate_ep: number;
  max_energy_stock: number;
  shield_duration_hours: number;
  rematch_cooldown_hours: number;
}

export const defaultArenaConfig: ArenaAppConfig = {
  enabled: true,
  maintenance: false,
  maintenance_message: 'ArcX Arena is undergoing seasonal maintenance.',
  season_number: 1,
  max_daily_ep: 100,
  energy_rate_ep: 20,
  max_energy_stock: 5,
  shield_duration_hours: 8,
  rematch_cooldown_hours: 24,
};

let cachedConfig: ArenaAppConfig = defaultArenaConfig;
let lastFetchTime = 0;

/**
 * Fetch the real-time server kill-switch configuration.
 * Solves Problem 4: Allows instant emergency shutdown of the Arena without rebuilding the mobile app.
 */
export async function fetchArenaConfig(): Promise<ArenaAppConfig> {
  const now = Date.now();
  if (now - lastFetchTime < CACHE_TTL_MS && cachedConfig) {
    return cachedConfig;
  }

  if (!isSupabaseConfigured) {
    return defaultArenaConfig;
  }

  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'arena')
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = {
        ...defaultArenaConfig,
        ...(data.value as Partial<ArenaAppConfig>),
      };
      cachedConfig = parsed;
      lastFetchTime = now;
      await AsyncStorage.setItem(ARENA_CONFIG_CACHE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch (err) {
    console.warn('[ArenaConfig] Could not reach app_config table, attempting local cache fallback:', err);
  }

  // Fallback to local storage
  try {
    const raw = await AsyncStorage.getItem(ARENA_CONFIG_CACHE_KEY);
    if (raw) {
      cachedConfig = JSON.parse(raw);
      return cachedConfig;
    }
  } catch {
    // Ignore cache error
  }

  return defaultArenaConfig;
}

/**
 * Quick synchronous helper returning the latest known state of whether the Arena is live
 */
export function isArenaLive(): boolean {
  return cachedConfig.enabled && !cachedConfig.maintenance;
}
