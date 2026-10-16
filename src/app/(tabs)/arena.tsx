import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Badge, Button, Icon } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import {
  fetchMyPlayer,
  refreshMyStats,
  type PlayerProfile,
  type CharacterKey,
} from '@/lib/services/player.service';
import {
  fetchOpponents,
  fetchMyBattles,
  initiateAttack,
  markBattleSeen,
  type OpponentCandidate,
  type BattleHistoryItem,
} from '@/lib/services/battle.service';
import { syncMyEp } from '@/lib/services/ep.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type ArenaSubTab = 'matchmaking' | 'history';

export default function ArenaScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [opponents, setOpponents] = useState<OpponentCandidate[]>([]);
  const [history, setHistory] = useState<BattleHistoryItem[]>([]);
  const [subTab, setSubTab] = useState<ArenaSubTab>('matchmaking');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attackingTargetId, setAttackingTargetId] = useState<string | null>(null);
  const [syncingDiscipline, setSyncingDiscipline] = useState(false);

  // Load arena data
  const loadArenaData = useCallback(async () => {
    try {
      const [playerData, oppList, battleLog] = await Promise.all([
        fetchMyPlayer(),
        fetchOpponents(),
        fetchMyBattles(15),
      ]);
      setPlayer(playerData);
      setOpponents(oppList);
      setHistory(battleLog);
    } catch (err) {
      console.warn('[ArenaScreen] Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [playerData, oppList, battleLog] = await Promise.all([
          fetchMyPlayer(),
          fetchOpponents(),
          fetchMyBattles(15),
        ]);
        if (active) {
          setPlayer(playerData);
          setOpponents(oppList);
          setHistory(battleLog);
        }
      } catch (err) {
        console.warn('[ArenaScreen] Init error:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  // Realtime Supabase Subscription for live incoming attacks
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;

    const channel = supabase
      .channel('arena-incoming-battles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battles',
          filter: `defender_id=eq.${user.id}`,
        },
        async () => {
          const [updatedPlayer, updatedLog] = await Promise.all([
            fetchMyPlayer(),
            fetchMyBattles(15),
          ]);
          setPlayer(updatedPlayer);
          setHistory(updatedLog);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadArenaData();
  };

  const handleSyncDiscipline = async () => {
    setSyncingDiscipline(true);
    try {
      await syncMyEp();
      await refreshMyStats();
      const updated = await fetchMyPlayer();
      setPlayer(updated);
      Alert.alert(
        '⚔️ Discipline Synced',
        'Your daily workout volume, habits, and journal reflections have been converted to combat stats and energy.'
      );
    } catch {
      Alert.alert('Sync Notice', 'Discipline updated with current local data.');
    } finally {
      setSyncingDiscipline(false);
    }
  };

  const handleAttack = async (opponent: OpponentCandidate) => {
    if (!player) return;
    if (player.energy <= 0) {
      Alert.alert(
        '⚡ Insufficient Energy',
        'You need at least 1 Energy to attack. Complete real-world habits or workouts to earn 20 EP = 1 Energy!'
      );
      return;
    }

    if (opponent.isShielded) {
      Alert.alert('🛡️ Opponent Shielded', 'This player has an active defense shield and cannot be attacked right now.');
      return;
    }

    setAttackingTargetId(opponent.userId);
    try {
      const res = await initiateAttack(opponent.userId);
      router.push({
        pathname: '/battle/[id]',
        params: { id: res.battleId },
      });
    } catch (err: any) {
      Alert.alert('Combat Error', err?.message || 'Failed to initiate attack. Please try again.');
    } finally {
      setAttackingTargetId(null);
    }
  };

  const handleDismissDefenseAlert = async (battleId: string) => {
    await markBattleSeen(battleId);
    setHistory((prev) =>
      prev.map((b) => (b.battleId === battleId ? { ...b, defenderSeen: true } : b))
    );
  };

  const unseenDefense = useMemo(() => {
    return history.find((b) => !b.isAttacker && !b.defenderSeen);
  }, [history]);

  const getLeagueInfo = (trophies: number) => {
    if (trophies >= 900) return { name: 'ASCENDED', color: '#FBBF24', badge: '👑' };
    if (trophies >= 500) return { name: 'TITAN', color: '#38BDF8', badge: '⚡' };
    if (trophies >= 250) return { name: 'FROST', color: '#3B82F6', badge: '❄️' };
    if (trophies >= 100) return { name: 'STEEL', color: '#9AA7B8', badge: '⚔️' };
    return { name: 'IRON', color: '#6B7889', badge: '🛡️' };
  };

  const getCharEmoji = (char: CharacterKey | string) => {
    if (char === 'titan') return '🏋️';
    if (char === 'sentinel') return '🛡️';
    if (char === 'monk') return '🧘';
    return '⚔️';
  };

  const getCharColor = (char: CharacterKey | string) => {
    if (char === 'titan') return colors.fitness;
    if (char === 'sentinel') return colors.primary;
    if (char === 'monk') return colors.mindfulness;
    return colors.accent;
  };

  if (loading) {
    return (
      <Screen scroll={false} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="caption" muted style={{ marginTop: spacing.md }}>
          Entering ArcX Arena...
        </Text>
      </Screen>
    );
  }

  if (!player) {
    return (
      <Screen scroll padded edges={['top', 'bottom']}>
        <View style={styles.unregisteredContainer}>
          <Text style={styles.unregisteredHeroEmoji}>⚔️</Text>
          <Text variant="title" style={styles.unregisteredTitle}>
            CHOOSE YOUR CHAMPION
          </Text>
          <Text variant="body" color="textSecondary" style={styles.unregisteredDesc}>
            ArcX Arena turns your daily workouts, habit streaks, and stoic journal reflections into
            server-verified battle attributes. Select your archetype to enter Season 1.
          </Text>
          <Button
            title="Enlist in the Arena"
            variant="primary"
            size="lg"
            onPress={() => router.push('/character-select')}
            style={{ width: '100%', marginTop: spacing.xl }}
          />
        </View>
      </Screen>
    );
  }

  const league = getLeagueInfo(player.trophies);
  const totalBattles = player.wins + player.losses;
  const winRate = totalBattles > 0 ? Math.round((player.wins / totalBattles) * 100) : 0;

  return (
    <Screen scroll={false} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>ARCX ARENA</Text>
            <Badge label="SEASON 1" tone="primary" />
          </View>
          <Text variant="caption" muted>
            REAL EFFORT = BATTLE POWER
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => router.push('/leaderboard')}
            hitSlop={8}
          >
            <Icon name="award" size={18} color={colors.accent} />
          </Pressable>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => router.push('/character-select')}
            hitSlop={8}
          >
            <Icon name="user" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Unseen Defense Attack Alert Banner */}
        {unseenDefense && (
          <Card style={styles.defenseAlertCard}>
            <View style={styles.defenseAlertHeader}>
              <View style={styles.defenseAlertTag}>
                <Text style={{ fontSize: 13 }}>⚠️</Text>
                <Text variant="caption" style={styles.defenseAlertTitle}>
                  DEFENSE ALERT
                </Text>
              </View>
              <Pressable
                onPress={() => handleDismissDefenseAlert(unseenDefense.battleId)}
                hitSlop={8}
              >
                <Text variant="caption" muted>✕</Text>
              </Pressable>
            </View>
            <Text variant="bodySm" style={{ marginTop: spacing.xs, color: colors.textPrimary }}>
              You were attacked by <Text style={{ fontWeight: '700' }}>{unseenDefense.opponentName}</Text>!
            </Text>
            <View style={styles.defenseAlertFooter}>
              <Text
                variant="caption"
                style={{
                  fontWeight: '700',
                  color: unseenDefense.isVictory ? colors.success : colors.danger,
                }}
              >
                {unseenDefense.isVictory ? '🛡️ DEFENDED (+5 🏆)' : `⚔️ DEFEATED (${unseenDefense.trophiesDelta} 🏆)`}
              </Text>
              <Pressable
                style={styles.replaySmallButton}
                onPress={() => {
                  handleDismissDefenseAlert(unseenDefense.battleId);
                  router.push({
                    pathname: '/battle/[id]',
                    params: { id: unseenDefense.battleId },
                  });
                }}
              >
                <Text variant="caption" style={styles.replayButtonText}>
                  Watch Replay 🎬
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* Player Profile & Stats Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            {/* Avatar & Class */}
            <View style={styles.avatarWrapper}>
              <View
                style={[
                  styles.avatarCircle,
                  { borderColor: getCharColor(player.characterKey) },
                ]}
              >
                <Text style={styles.avatarEmoji}>{getCharEmoji(player.characterKey)}</Text>
              </View>
              <View style={{ marginLeft: spacing.md, flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text variant="subheading" style={styles.characterName}>
                    {player.characterName.toUpperCase()}
                  </Text>
                  <Badge label={`LVL ${player.level}`} tone="primary" />
                </View>
                <Text variant="caption" muted>
                  {player.archetype}
                </Text>
              </View>
            </View>

            {/* League Rank */}
            <View style={styles.leagueBox}>
              <Text style={{ fontSize: 16 }}>{league.badge}</Text>
              <Text variant="caption" style={[styles.leagueName, { color: league.color }]}>
                {league.name}
              </Text>
              <Text variant="bodySm" style={styles.trophiesNumber}>
                {player.trophies} 🏆
              </Text>
            </View>
          </View>

          {/* Energy Battery Bar */}
          <View style={styles.energySection}>
            <View style={styles.energyHeader}>
              <View style={styles.energyTitleRow}>
                <Icon name="zap" size={15} color={colors.accent} />
                <Text variant="caption" style={styles.energyTitle}>
                  ENERGY BATTERY
                </Text>
              </View>
              <Text variant="caption" style={styles.energyCount}>
                {player.energy} / 5 ⚡
              </Text>
            </View>

            {/* 5 Battery Slots */}
            <View style={styles.batterySlotsRow}>
              {[1, 2, 3, 4, 5].map((slot) => {
                const isCharged = slot <= player.energy;
                return (
                  <View
                    key={slot}
                    style={[
                      styles.batterySlot,
                      isCharged ? styles.batterySlotCharged : styles.batterySlotEmpty,
                    ]}
                  />
                );
              })}
            </View>
            <Text variant="caption" muted style={styles.energyHint}>
              +1 Energy for every 20 daily EP earned (Max 5 banked)
            </Text>
          </View>

          {/* Combat Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text variant="caption" muted>ATK</Text>
              <Text variant="body" style={styles.statValue}>
                {Math.round(player.atk)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="caption" muted>DEF</Text>
              <Text variant="body" style={styles.statValue}>
                {Math.round(player.def)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="caption" muted>CRIT</Text>
              <Text variant="body" style={styles.statValue}>
                {Math.round(player.crit)}%
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text variant="caption" muted>HP</Text>
              <Text variant="body" style={styles.statValue}>
                {Math.round(player.hp)}
              </Text>
            </View>
          </View>

          {/* Record & Sync Footer */}
          <View style={styles.heroFooter}>
            <Text variant="caption" muted>
              Record: {player.wins}W - {player.losses}L ({winRate}%)
            </Text>
            <Pressable
              style={styles.syncButton}
              onPress={handleSyncDiscipline}
              disabled={syncingDiscipline}
            >
              {syncingDiscipline ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <>
                  <Icon name="refresh-cw" size={13} color={colors.accent} />
                  <Text variant="caption" style={styles.syncText}>
                    Sync Stats
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </Card>

        {/* Sub Tabs: Matchmaking vs Battle History */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, subTab === 'matchmaking' && styles.tabButtonActive]}
            onPress={() => setSubTab('matchmaking')}
          >
            <Icon
              name="swords"
              size={15}
              color={subTab === 'matchmaking' ? colors.primary : colors.textMuted}
            />
            <Text
              variant="caption"
              style={[styles.tabButtonText, subTab === 'matchmaking' && styles.tabButtonTextActive]}
            >
              FIND OPPONENTS ({opponents.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, subTab === 'history' && styles.tabButtonActive]}
            onPress={() => setSubTab('history')}
          >
            <Icon
              name="clock"
              size={15}
              color={subTab === 'history' ? colors.primary : colors.textMuted}
            />
            <Text
              variant="caption"
              style={[styles.tabButtonText, subTab === 'history' && styles.tabButtonTextActive]}
            >
              BATTLE LOG ({history.length})
            </Text>
          </Pressable>
        </View>

        {/* Tab 1: Matchmaking Candidates */}
        {subTab === 'matchmaking' && (
          <View style={styles.matchmakingList}>
            {opponents.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={{ fontSize: 28 }}>🛡️</Text>
                <Text variant="body" style={{ marginTop: spacing.sm, fontWeight: '600' }}>
                  No Opponents Found
                </Text>
                <Text variant="caption" muted style={{ textAlign: 'center', marginTop: 4 }}>
                  All candidates in your tier are shielded or on cooldown. Pull to refresh!
                </Text>
              </Card>
            ) : (
              opponents.map((opp) => {
                const isAttackingThis = attackingTargetId === opp.userId;
                const canAttack = player.energy > 0 && !opp.isShielded && !isAttackingThis;

                return (
                  <Card key={opp.userId} style={styles.opponentCard}>
                    <View style={styles.opponentLeft}>
                      <View
                        style={[
                          styles.oppAvatar,
                          { borderColor: getCharColor(opp.characterKey) },
                        ]}
                      >
                        <Text style={{ fontSize: 18 }}>{getCharEmoji(opp.characterKey)}</Text>
                      </View>
                      <View style={{ marginLeft: spacing.md, flex: 1 }}>
                        <View style={styles.oppNameRow}>
                          <Text variant="body" style={styles.oppName} numberOfLines={1}>
                            {opp.displayName}
                          </Text>
                          {opp.isBot && <Badge label="NPC" tone="neutral" />}
                          {opp.isShielded && <Badge label="SHIELDED" tone="warning" />}
                        </View>
                        <Text variant="caption" muted>
                          Lv. {opp.level} · {opp.trophies} 🏆 · {opp.wins}W / {opp.losses}L
                        </Text>
                      </View>
                    </View>

                    {/* Attack Action */}
                    <View style={styles.opponentRight}>
                      <Button
                        title={
                          isAttackingThis
                            ? 'Engaging...'
                            : opp.isShielded
                            ? 'Shielded'
                            : player.energy <= 0
                            ? 'No Energy'
                            : 'ATTACK (1⚡)'
                        }
                        variant={canAttack ? 'primary' : 'secondary'}
                        size="sm"
                        disabled={!canAttack}
                        onPress={() => handleAttack(opp)}
                      />
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* Tab 2: Battle History */}
        {subTab === 'history' && (
          <View style={styles.historyList}>
            {history.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={{ fontSize: 28 }}>📜</Text>
                <Text variant="body" style={{ marginTop: spacing.sm, fontWeight: '600' }}>
                  No Battles Recorded
                </Text>
                <Text variant="caption" muted style={{ textAlign: 'center', marginTop: 4 }}>
                  Spend 1 Energy to initiate your first duel in the Arena!
                </Text>
              </Card>
            ) : (
              history.map((item) => {
                const formattedTime = new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Card key={item.battleId} style={styles.historyCard}>
                    <View style={styles.historyTop}>
                      <View style={styles.historyRoleRow}>
                        <Badge
                          label={item.isVictory ? 'VICTORY' : 'DEFEAT'}
                          tone={item.isVictory ? 'success' : 'danger'}
                        />
                        <Text variant="caption" muted style={{ marginLeft: spacing.sm }}>
                          {item.isAttacker ? '⚔️ You Attacked' : '🛡️ Defended Against'}
                        </Text>
                      </View>
                      <Text variant="caption" muted>
                        {formattedTime}
                      </Text>
                    </View>

                    <View style={styles.historyBody}>
                      <View style={styles.historyOpponent}>
                        <Text style={{ fontSize: 16 }}>{getCharEmoji(item.opponentChar)}</Text>
                        <Text variant="bodySm" style={styles.historyOppName} numberOfLines={1}>
                          {item.opponentName}
                        </Text>
                      </View>

                      <View style={styles.historyResult}>
                        <Text
                          variant="bodySm"
                          style={{
                            fontWeight: '700',
                            color: item.trophiesDelta >= 0 ? colors.success : colors.danger,
                          }}
                        >
                          {item.trophiesDelta >= 0
                            ? `+${item.trophiesDelta} 🏆`
                            : `${item.trophiesDelta} 🏆`}
                        </Text>
                        <Pressable
                          style={styles.replayButton}
                          onPress={() =>
                            router.push({
                              pathname: '/battle/[id]',
                              params: { id: item.battleId },
                            })
                          }
                        >
                          <Text variant="caption" style={styles.replayText}>
                            Replay 🎬
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.backgroundElevated,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.textPrimary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'] * 2,
    gap: spacing.md,
  },
  defenseAlertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: colors.danger,
    borderWidth: 1,
    padding: spacing.md,
  },
  defenseAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defenseAlertTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  defenseAlertTitle: {
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.danger,
  },
  defenseAlertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  replaySmallButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  replayButtonText: {
    color: colors.accent,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.background,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 26,
  },
  characterName: {
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  leagueBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  leagueName: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1,
  },
  trophiesNumber: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  energySection: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  energyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  energyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  energyTitle: {
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.accent,
  },
  energyCount: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  batterySlotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: spacing.xs,
  },
  batterySlot: {
    flex: 1,
    height: 12,
    borderRadius: radius.sm,
  },
  batterySlotCharged: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  batterySlotEmpty: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  energyHint: {
    fontSize: 10,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statValue: {
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  syncText: {
    color: colors.accent,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: colors.backgroundElevated,
  },
  tabButtonText: {
    fontWeight: '700',
    color: colors.textMuted,
    fontSize: 11,
  },
  tabButtonTextActive: {
    color: colors.primary,
  },
  matchmakingList: {
    gap: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  opponentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  opponentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  oppAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oppNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  oppName: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  opponentRight: {
    minWidth: 110,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  historyOpponent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  historyOppName: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  replayButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
  },
  replayText: {
    color: colors.accent,
    fontWeight: '600',
  },
  unregisteredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['2xl'] * 2,
    paddingHorizontal: spacing.md,
  },
  unregisteredHeroEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  unregisteredTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  unregisteredDesc: {
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
});
