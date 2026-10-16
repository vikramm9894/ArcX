import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, Screen, Card, Badge } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import {
  fetchGlobalLeaderboard,
  fetchAroundMe,
  fetchMyRank,
  type LeaderboardEntry,
  type MyRankResult,
} from '@/lib/services/player.service';
import {
  reportPlayer,
  blockPlayer,
  getLocalBlockedUsers,
  setLeaderboardVisibility,
} from '@/lib/services/moderation.service';

type LeaderboardTab = 'global' | 'around';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<LeaderboardTab>('global');
  const [globalList, setGlobalList] = useState<LeaderboardEntry[]>([]);
  const [aroundList, setAroundList] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRankResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isIncognito, setIsIncognito] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      const [topData, myRankData, nearData, blockedUsers] = await Promise.all([
        fetchGlobalLeaderboard(50),
        fetchMyRank(),
        fetchAroundMe(3),
        getLocalBlockedUsers(),
      ]);

      // Filter out locally blocked users
      const cleanTop = topData.filter((p) => !blockedUsers.includes(p.userId));
      const cleanNear = nearData.filter((p) => !blockedUsers.includes(p.userId));

      setGlobalList(cleanTop);
      setMyRank(myRankData);
      setAroundList(cleanNear.length > 0 ? cleanNear : cleanTop.slice(0, 7));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const activeList = tab === 'global' ? globalList : aroundList;

  const getRankBadgeTone = (rank: number) => {
    if (rank === 1) return 'warning'; // Gold
    if (rank === 2) return 'primary'; // Silver/Frost
    if (rank === 3) return 'neutral'; // Bronze
    return 'neutral';
  };

  const getLeague = (trophies: number) => {
    if (trophies >= 900) return { name: 'ASCENDED', color: '#FBBF24' };
    if (trophies >= 500) return { name: 'TITAN', color: '#38BDF8' };
    if (trophies >= 250) return { name: 'FROST', color: '#3B82F6' };
    if (trophies >= 100) return { name: 'STEEL', color: '#9AA7B8' };
    return { name: 'IRON', color: '#6B7889' };
  };

  const getCharIcon = (key: string) => {
    if (key === 'titan') return '🏋️';
    if (key === 'sentinel') return '🛡️';
    if (key === 'monk') return '🧘';
    return '⚔️';
  };

  const handleToggleIncognito = async () => {
    const nextState = !isIncognito;
    setIsIncognito(nextState);
    await setLeaderboardVisibility(nextState);
    Alert.alert(
      nextState ? '🛡️ Incognito Enabled' : '👁️ Leaderboard Visible',
      nextState
        ? 'Your profile is now hidden from public leaderboards. Your personal ranking is still tracked privately.'
        : 'Your profile is now visible on public leaderboards.'
    );
  };

  const handlePlayerOptions = (target: LeaderboardEntry) => {
    if (target.isCurrentUser || target.userId === user?.id) return;

    Alert.alert(
      `Player Safety: ${target.displayName}`,
      'Choose an action for this user:',
      [
        {
          text: 'Report Player',
          onPress: () => handleReportFlow(target),
        },
        {
          text: 'Block Player',
          style: 'destructive',
          onPress: () => handleBlockFlow(target),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleReportFlow = (target: LeaderboardEntry) => {
    Alert.alert(
      `Report ${target.displayName}`,
      'Select a reason for the report:',
      [
        {
          text: 'Inappropriate Username',
          onPress: async () => {
            await reportPlayer(target.userId, 'Inappropriate Username');
            Alert.alert('Report Received', 'Thank you. Our moderation team will review this user.');
          },
        },
        {
          text: 'Suspicious / Cheating',
          onPress: async () => {
            await reportPlayer(target.userId, 'Suspicious Activity / Cheating');
            Alert.alert('Report Received', 'Thank you. Our automated anti-cheat team will inspect this profile.');
          },
        },
        {
          text: 'Harassment',
          onPress: async () => {
            await reportPlayer(target.userId, 'Harassment / Offensive Behavior');
            Alert.alert('Report Received', 'Thank you. We maintain zero tolerance for harassment.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBlockFlow = (target: LeaderboardEntry) => {
    Alert.alert(
      `Block ${target.displayName}?`,
      'You will no longer see this player in Matchmaking, Battle logs, or Leaderboards. They will not be able to challenge you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            await blockPlayer(target.userId);
            setGlobalList((prev) => prev.filter((p) => p.userId !== target.userId));
            setAroundList((prev) => prev.filter((p) => p.userId !== target.userId));
            Alert.alert('Player Blocked', `${target.displayName} has been blocked.`);
          },
        },
      ]
    );
  };

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text variant="body" color="primary">
              ← Back
            </Text>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
            <Pressable onPress={handleToggleIncognito} hitSlop={8} style={styles.incognitoButton}>
              <Text variant="caption" style={{ color: isIncognito ? colors.accent : colors.textMuted }}>
                {isIncognito ? '🛡️ Incognito ON' : '👁️ Public'}
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push('/character-select')} hitSlop={12}>
              <Badge label="CHAMPION ⚔️" tone="primary" />
            </Pressable>
          </View>
        </View>

        <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
          WINTER ARC ARENA · SEASON 1
        </Text>
        <Text variant="title" weight="heavy">
          Global <Text variant="title" weight="heavy" color="primary">LEADERBOARD</Text>
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tabBtn, tab === 'global' && styles.tabBtnActive]}
          onPress={() => setTab('global')}
        >
          <Text
            variant="caption"
            weight="bold"
            color={tab === 'global' ? 'textPrimary' : 'textMuted'}
          >
            🏆 Top 50 Warriors
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'around' && styles.tabBtnActive]}
          onPress={() => setTab('around')}
        >
          <Text
            variant="caption"
            weight="bold"
            color={tab === 'around' ? 'textPrimary' : 'textMuted'}
          >
            ⚡ In My Orbit
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="caption" color="textMuted" style={{ marginTop: spacing.md }}>
            Calculating Global ELO Standings...
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {activeList.map((player) => {
            const league = getLeague(player.trophies);
            const isMe = player.isCurrentUser || (user?.id && player.userId === user.id);

            return (
              <Card
                key={`${player.rank}_${player.userId}`}
                style={[
                  styles.playerCard,
                  isMe && styles.myPlayerCard,
                ]}
                onPress={() => !isMe && handlePlayerOptions(player)}
              >
                <View style={styles.rankCol}>
                  <Badge
                    label={`#${player.rank}`}
                    tone={getRankBadgeTone(player.rank)}
                    style={{ minWidth: 44 }}
                  />
                </View>

                <View style={styles.avatarBox}>
                  <Text style={{ fontSize: 22 }}>{getCharIcon(player.characterKey)}</Text>
                </View>

                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text variant="bodySm" weight="bold" numberOfLines={1} style={{ maxWidth: 140 }}>
                      {player.displayName}
                    </Text>
                    {isMe && <Badge label="YOU" tone="primary" style={{ paddingVertical: 1, paddingHorizontal: 4 }} />}
                  </View>
                  <Text variant="caption" color="textMuted">
                    Lvl {player.level} · {player.streak}d streak 🔥 · {player.wins}W-{player.losses}L
                  </Text>
                </View>

                <View style={styles.trophiesCol}>
                  <Text variant="bodySm" weight="heavy" style={{ color: league.color }}>
                    🏆 {player.trophies}
                  </Text>
                  <Text variant="caption" style={{ color: league.color, fontSize: 9 }}>
                    {league.name}
                  </Text>
                </View>

                {!isMe && (
                  <View style={styles.moreIconWrapper}>
                    <Text variant="caption" color="textMuted">•••</Text>
                  </View>
                )}
              </Card>
            );
          })}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* Sticky Bottom My Rank Card */}
      {myRank && myRank.enrolled && (
        <View style={styles.stickyBottomBar}>
          <View style={styles.stickyRow}>
            <View>
              <Text variant="caption" color="textMuted">
                YOUR ARENA RANK
              </Text>
              <Text variant="heading" weight="heavy" color="primary">
                #{myRank.rank}{' '}
                <Text variant="caption" color="textMuted">
                  of {myRank.totalPlayers} (Top {myRank.percentile}%)
                </Text>
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="caption" color="textMuted">
                RATING
              </Text>
              <Text variant="heading" weight="heavy" style={{ color: '#FBBF24' }}>
                🏆 {myRank.trophies}
              </Text>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  incognitoButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  listContainer: {
    flex: 1,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  myPlayerCard: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  rankCol: {
    alignItems: 'center',
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trophiesCol: {
    alignItems: 'flex-end',
  },
  moreIconWrapper: {
    paddingLeft: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stickyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
