import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CharacterKey } from './player.service';

export interface BattleEvent {
  round: number;
  hitter: 'attacker' | 'defender';
  damage: number;
  damage_pct: number;
  is_crit: boolean;
  attacker_hp: number;
  defender_hp: number;
}

export interface AttackResult {
  battleId: string;
  seed: number;
  winnerId: string;
  attackerId: string;
  defenderId: string;
  isVictory: boolean;
  attackerDelta: number;
  defenderDelta: number;
  roundsPlayed: number;
  attackerFinalPct: number;
  defenderFinalPct: number;
  events: BattleEvent[];
}

export interface OpponentCandidate {
  userId: string;
  displayName: string;
  characterKey: CharacterKey;
  trophies: number;
  level: number;
  wins: number;
  losses: number;
  isBot: boolean;
  isShielded: boolean;
}

export interface BattleHistoryItem {
  battleId: string;
  attackerId: string;
  defenderId: string;
  winnerId: string;
  isAttacker: boolean;
  isVictory: boolean;
  opponentName: string;
  opponentChar: CharacterKey;
  trophiesDelta: number;
  createdAt: string;
  defenderSeen: boolean;
}

export interface FullBattleRecord {
  id: string;
  attackerId: string;
  defenderId: string;
  seed: number;
  attackerStats: {
    name: string;
    character_key: CharacterKey;
    atk: number;
    def: number;
    crit: number;
    hp: number;
    level: number;
  };
  defenderStats: {
    name: string;
    character_key: CharacterKey;
    atk: number;
    def: number;
    crit: number;
    hp: number;
    level: number;
    is_bot?: boolean;
  };
  events: BattleEvent[];
  winnerId: string;
  attackerDelta: number;
  defenderDelta: number;
  createdAt: string;
}

const LOCAL_BATTLE_CACHE_KEY = '@arcx_recent_battle_';

/**
 * Find 5 matched opponents within rating band.
 * Solves Problem 1: Client never queries arbitrary players, only server-verified eligible candidates.
 */
export async function fetchOpponents(): Promise<OpponentCandidate[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('find_opponents');
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          userId: d.user_id,
          displayName: d.display_name,
          characterKey: d.character_key,
          trophies: d.trophies,
          level: d.level,
          wins: d.wins,
          losses: d.losses,
          isBot: d.is_bot,
          isShielded: d.is_shielded,
        }));
      }
    } catch (err) {
      console.warn('[BattleService] find_opponents error:', err);
    }
  }

  // Fallback NPC bots
  return [
    { userId: '00000000-0000-0000-0000-000000000001', displayName: 'Frost Golem #1', characterKey: 'sentinel', trophies: 40, level: 1, wins: 5, losses: 2, isBot: true, isShielded: false },
    { userId: '00000000-0000-0000-0000-000000000002', displayName: 'Frost Golem #2', characterKey: 'monk', trophies: 80, level: 2, wins: 10, losses: 4, isBot: true, isShielded: false },
    { userId: '00000000-0000-0000-0000-000000000003', displayName: 'Frost Golem #3', characterKey: 'titan', trophies: 120, level: 3, wins: 15, losses: 6, isBot: true, isShielded: false },
    { userId: '00000000-0000-0000-0000-000000000004', displayName: 'Frost Golem #4', characterKey: 'sentinel', trophies: 160, level: 4, wins: 20, losses: 8, isBot: true, isShielded: false },
    { userId: '00000000-0000-0000-0000-000000000005', displayName: 'Frost Golem #5', characterKey: 'titan', trophies: 200, level: 5, wins: 25, losses: 10, isBot: true, isShielded: false },
  ];
}

/**
 * Initiates an atomic attack against an opponent.
 * Solves Problem 1 & 3: Run inside a single SQL transaction with row locks, deducting energy and calculating rating delta.
 */
export async function initiateAttack(defenderId: string): Promise<AttackResult> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc('attack', {
      p_defender: defenderId,
    });

    if (error) {
      throw new Error(error.message || 'Battle attack failed.');
    }

    const res = data as any;
    const attackResult: AttackResult = {
      battleId: res.battle_id,
      seed: Number(res.seed),
      winnerId: res.winner_id,
      attackerId: res.attacker_id,
      defenderId: res.defender_id,
      isVictory: Boolean(res.is_victory),
      attackerDelta: Number(res.attacker_delta),
      defenderDelta: Number(res.defender_delta),
      roundsPlayed: Number(res.rounds_played),
      attackerFinalPct: Number(res.attacker_final_pct),
      defenderFinalPct: Number(res.defender_final_pct),
      events: res.events || [],
    };

    await AsyncStorage.setItem(
      `${LOCAL_BATTLE_CACHE_KEY}${attackResult.battleId}`,
      JSON.stringify(attackResult)
    );

    return attackResult;
  }

  // Offline mock attack simulation
  const mockEvents: BattleEvent[] = [
    { round: 1, hitter: 'attacker', damage: 24, damage_pct: 22.8, is_crit: false, attacker_hp: 105, defender_hp: 81 },
    { round: 1, hitter: 'defender', damage: 18, damage_pct: 17.1, is_crit: false, attacker_hp: 87, defender_hp: 81 },
    { round: 2, hitter: 'attacker', damage: 32, damage_pct: 30.4, is_crit: true, attacker_hp: 87, defender_hp: 49 },
    { round: 2, hitter: 'defender', damage: 20, damage_pct: 19.0, is_crit: false, attacker_hp: 67, defender_hp: 49 },
    { round: 3, hitter: 'attacker', damage: 26, damage_pct: 24.7, is_crit: false, attacker_hp: 67, defender_hp: 23 },
    { round: 3, hitter: 'defender', damage: 19, damage_pct: 18.1, is_crit: false, attacker_hp: 48, defender_hp: 23 },
    { round: 4, hitter: 'attacker', damage: 25, damage_pct: 23.8, is_crit: false, attacker_hp: 48, defender_hp: 0 },
  ];

  const mockResult: AttackResult = {
    battleId: `mock_${Date.now()}`,
    seed: 42,
    winnerId: 'me',
    attackerId: 'me',
    defenderId,
    isVictory: true,
    attackerDelta: 24,
    defenderDelta: -12,
    roundsPlayed: 4,
    attackerFinalPct: 46,
    defenderFinalPct: 0,
    events: mockEvents,
  };

  await AsyncStorage.setItem(
    `${LOCAL_BATTLE_CACHE_KEY}${mockResult.battleId}`,
    JSON.stringify(mockResult)
  );

  return mockResult;
}

/**
 * Fetch full battle replay and combatants stats by battle ID
 */
export async function fetchBattleById(battleId: string): Promise<FullBattleRecord | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          attackerId: data.attacker_id,
          defenderId: data.defender_id,
          seed: Number(data.seed),
          attackerStats: data.attacker_stats as any,
          defenderStats: data.defender_stats as any,
          events: (data.events as any) || [],
          winnerId: data.winner_id,
          attackerDelta: data.attacker_delta,
          defenderDelta: data.defender_delta,
          createdAt: data.created_at,
        };
      }
    } catch {
      // Fall through to local cache
    }
  }

  try {
    const raw = await AsyncStorage.getItem(`${LOCAL_BATTLE_CACHE_KEY}${battleId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: parsed.battleId,
        attackerId: parsed.attackerId,
        defenderId: parsed.defenderId,
        seed: parsed.seed,
        attackerStats: {
          name: 'You',
          character_key: 'titan',
          atk: 25,
          def: 20,
          crit: 5,
          hp: 105,
          level: 1,
        },
        defenderStats: {
          name: 'Frost Golem',
          character_key: 'sentinel',
          atk: 20,
          def: 25,
          crit: 5,
          hp: 105,
          level: 1,
          is_bot: true,
        },
        events: parsed.events,
        winnerId: parsed.winnerId,
        attackerDelta: parsed.attackerDelta,
        defenderDelta: parsed.defenderDelta,
        createdAt: new Date().toISOString(),
      };
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Fetch recent attack and defense battle history
 */
export async function fetchMyBattles(limit: number = 20): Promise<BattleHistoryItem[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc('my_battles', {
        p_limit: limit,
      });

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          battleId: d.battle_id,
          attackerId: d.attacker_id,
          defenderId: d.defender_id,
          winnerId: d.winner_id,
          isAttacker: d.is_attacker,
          isVictory: d.is_victory,
          opponentName: d.opponent_name || 'Opponent',
          opponentChar: d.opponent_char || 'titan',
          trophiesDelta: d.trophies_delta,
          createdAt: d.created_at,
          defenderSeen: d.defender_seen,
        }));
      }
    } catch {
      // Ignore
    }
  }

  return [];
}

/**
 * Mark an incoming defense battle as reviewed by the defender
 */
export async function markBattleSeen(battleId: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.rpc('mark_battle_seen', {
        p_battle_id: battleId,
      });
    } catch {
      // Ignore
    }
  }
}
