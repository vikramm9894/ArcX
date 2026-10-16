import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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

type LeaderboardTab = 'global' | 'around';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<LeaderboardTab>('global');
  const [globalList, setGlobalList] = useState<LeaderboardEntry[]>([]);
  const [aroundList, setAroundList] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<MyRankResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    try {
      const [topData, myRankData, nearData] = await Promise.all([
        fetchGlobalLeaderboard(50),
        fetchMyRank(),
        fetchAroundMe(3),
      ]);
      setGlobalList(topData);
      setMyRank(myRankData);
      setAroundList(nearData.length > 0 ? nearData : topData.slice(0, 7));
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
          <Pressable onPress={() => router.push('/character-select')} hitSlop={12}>
            <Badge label="CHAMPION SELECT ⚔️" tone="primary" />
          </Pressable>
        </View>

        <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
          WINTER ARC ARENA
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
            📍 Around My Rank
          </Text>
        </Pressable>
      </View>

      {/* List Content */}
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl, flex: 1 }} />
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
                Rank #{myRank.rank}{' '}
                <Text variant="caption" color="textSecondary">
                  of {myRank.totalPlayers} (Top {myRank.percentile}%)
                </Text>
              </Text>
            </View>
            <View style={styles.stickyRight}>
              <Text variant="title" weight="heavy">
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
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trophiesCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.backgroundElevated,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  stickyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyRight: {
    alignItems: 'flex-end',
  },
});
