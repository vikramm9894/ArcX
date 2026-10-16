import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type CharacterKey = 'titan' | 'sentinel' | 'monk';

export interface PlayerProfile {
  userId: string;
  characterKey: CharacterKey;
  characterName: string;
  archetype: string;
  trophies: number;
  wins: number;
  losses: number;
  energy: number;
  shieldUntil: string | null;
  atk: number;
  def: number;
  crit: number;
  hp: number;
  level: number;
  lifetimeEp: number;
  lastActiveDay: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  characterKey: CharacterKey;
  trophies: number;
  level: number;
  wins: number;
  losses: number;
  streak: number;
  isBot: boolean;
  isCurrentUser?: boolean;
}

export interface MyRankResult {
  enrolled: boolean;
  rank: number;
  totalPlayers: number;
  percentile: number;
  trophies: number;
}

const LOCAL_PLAYER_PROFILE_KEY = '@arcx_my_player_profile';

/**
 * Enrolls the user in the Arena by selecting their first champion,
 * or switching character once every 30 days.
 */
export async function chooseCharacter(characterKey: CharacterKey): Promise<PlayerProfile | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('choose_character', {
        p_character_key: characterKey,
      });

      if (!error && data) {
        const p: PlayerProfile = {
          userId: (data as any).user_id,
          characterKey: (data as any).character_key,
          characterName: (data as any).character_name,
          archetype: (data as any).archetype,
          trophies: (data as any).trophies ?? 0,
          wins: 0,
          losses: 0,
          energy: (data as any).energy ?? 2,
          shieldUntil: null,
          atk: (data as any).atk ?? 20,
          def: (data as any).def ?? 20,
          crit: (data as any).crit ?? 5,
          hp: (data as any).hp ?? 105,
          level: (data as any).level ?? 1,
          lifetimeEp: 0,
          lastActiveDay: new Date().toISOString().split('T')[0],
        };

        await AsyncStorage.setItem(LOCAL_PLAYER_PROFILE_KEY, JSON.stringify(p));
        return p;
      }
    } catch (err) {
      console.warn('[PlayerService] choose_character RPC failed:', err);
    }
  }

  // Local fallback
  const fallback: PlayerProfile = {
    userId: 'guest_warrior',
    characterKey,
    characterName: characterKey === 'titan' ? 'Titan' : characterKey === 'sentinel' ? 'Sentinel' : 'Monk',
    archetype: characterKey === 'titan' ? 'Iron Juggernaut' : characterKey === 'sentinel' ? 'Aegis Defender' : 'Stoic Mystic',
    trophies: 0,
    wins: 0,
    losses: 0,
    energy: 2,
    shieldUntil: null,
    atk: characterKey === 'titan' ? 23 : 20,
    def: characterKey === 'sentinel' ? 23 : 20,
    crit: characterKey === 'monk' ? 15 : 5,
    hp: 105,
    level: 1,
    lifetimeEp: 0,
    lastActiveDay: new Date().toISOString().split('T')[0],
  };

  await AsyncStorage.setItem(LOCAL_PLAYER_PROFILE_KEY, JSON.stringify(fallback));
  return fallback;
}

/**
 * Fetch current user's arena player state
 */
export async function fetchMyPlayerProfile(userId: string): Promise<PlayerProfile | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*, characters(name, archetype)')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        const charData = (data as any).characters;
        const p: PlayerProfile = {
          userId: data.user_id,
          characterKey: data.character_key as CharacterKey,
          characterName: charData?.name ?? (data.character_key === 'titan' ? 'Titan' : data.character_key === 'sentinel' ? 'Sentinel' : 'Monk'),
          archetype: charData?.archetype ?? 'Disciplined Warrior',
          trophies: data.trophies,
          wins: data.wins,
          losses: data.losses,
          energy: data.energy,
          shieldUntil: data.shield_until,
          atk: Number(data.atk),
          def: Number(data.def),
          crit: Number(data.crit),
          hp: data.hp,
          level: data.level,
          lifetimeEp: data.lifetime_ep,
          lastActiveDay: data.last_active_day,
        };

        await AsyncStorage.setItem(LOCAL_PLAYER_PROFILE_KEY, JSON.stringify(p));
        return p;
      }
    } catch {
      // Fall through to local cache
    }
  }

  try {
    const raw = await AsyncStorage.getItem(LOCAL_PLAYER_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Trigger server recalculation of 7-day average stats
 */
export async function refreshMyStats(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  try {
    const { error } = await supabase.rpc('refresh_my_stats');
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch global top N warriors from server
 */
export async function fetchGlobalLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('global_leaderboard', {
        p_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          rank: Number(d.rank),
          userId: d.user_id,
          displayName: d.display_name,
          characterKey: d.character_key,
          trophies: d.trophies,
          level: d.level,
          wins: d.wins,
          losses: d.losses,
          streak: d.streak,
          isBot: d.is_bot,
        }));
      }
    } catch (err) {
      console.warn('[PlayerService] fetchGlobalLeaderboard error:', err);
    }
  }

  // Realistic mock leaderboard when offline
  return [
    { rank: 1, userId: 'bot_1', displayName: 'Marcus Aurelius', characterKey: 'monk', trophies: 1240, level: 12, wins: 48, losses: 5, streak: 32, isBot: false },
    { rank: 2, userId: 'bot_2', displayName: 'David Goggins', characterKey: 'titan', trophies: 980, level: 9, wins: 38, losses: 7, streak: 28, isBot: false },
    { rank: 3, userId: 'bot_3', displayName: 'Aegis Iron', characterKey: 'sentinel', trophies: 790, level: 8, wins: 29, losses: 6, streak: 21, isBot: false },
    { rank: 4, userId: 'bot_4', displayName: 'Frost Titan', characterKey: 'titan', trophies: 550, level: 6, wins: 22, losses: 10, streak: 14, isBot: false },
    { rank: 5, userId: 'bot_5', displayName: 'Vikram', characterKey: 'sentinel', trophies: 320, level: 4, wins: 14, losses: 4, streak: 9, isBot: false },
  ];
}

/**
 * Fetch current user's global ranking and percentile
 */
export async function fetchMyRank(): Promise<MyRankResult> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('my_rank');
      if (!error && data) {
        return {
          enrolled: (data as any).enrolled ?? false,
          rank: Number((data as any).rank ?? 1),
          totalPlayers: Number((data as any).total_players ?? 1),
          percentile: Number((data as any).percentile ?? 100),
          trophies: (data as any).trophies ?? 0,
        };
      }
    } catch {
      // Ignore
    }
  }

  return {
    enrolled: true,
    rank: 5,
    totalPlayers: 142,
    percentile: 96.5,
    trophies: 320,
  };
}

/**
 * Fetch players immediately around the current user
 */
export async function fetchAroundMe(n: number = 3): Promise<LeaderboardEntry[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('around_me', {
        p_n: n,
      });

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          rank: Number(d.rank),
          userId: d.user_id,
          displayName: d.display_name,
          characterKey: d.character_key,
          trophies: d.trophies,
          level: d.level,
          wins: d.wins,
          losses: d.losses,
          streak: d.streak,
          isBot: false,
          isCurrentUser: Boolean(d.is_current_user),
        }));
      }
    } catch {
      // Ignore
    }
  }

  return [];
}
