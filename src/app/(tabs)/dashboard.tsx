import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  Text,
  Screen,
  Card,
  Badge,
  Divider,
  Icon,
  ProtocolTimerModal,
  ShareContractModal,
  type TimerMode,
} from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import {
  fetchUserHabits,
  fetchTodayCompletedHabitIds,
  toggleHabitLog,
  type HabitRow,
} from '@/lib/services/habits.service';
import { fetchUserProfile, type ProfileRow } from '@/lib/services/profile.service';
import { fetchWorkouts, type WorkoutRow } from '@/lib/services/workouts.service';
import { fetchJournalEntries, type JournalEntryRow } from '@/lib/services/journal.service';
import { computeMilestones } from '@/lib/services/milestones.service';
import { getDailyCreed, getRandomCreed, type StoicQuote } from '@/lib/services/quotes.service';
import { computePillarAnalytics } from '@/lib/services/analytics.service';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, arcData } = useAuth();

  const [habitsList, setHabitsList] = useState<HabitRow[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutRow[]>([]);
  const [recentJournals, setRecentJournals] = useState<JournalEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Phase 5: Timer & Share Modals
  const [timerModalVisible, setTimerModalVisible] = useState(false);
  const [activeTimerMode, setActiveTimerMode] = useState<TimerMode>('cold');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [dailyCreed, setDailyCreed] = useState<StoicQuote>(() => getDailyCreed());

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [fetchedProfile, fetchedHabits, todayCompleted, workouts, journals] = await Promise.all([
        fetchUserProfile(user.id),
        fetchUserHabits(user.id),
        fetchTodayCompletedHabitIds(user.id),
        fetchWorkouts(user.id),
        fetchJournalEntries(user.id),
      ]);

      setProfile(fetchedProfile);
      setCompletedIds(todayCompleted);
      setRecentWorkouts(workouts);
      setRecentJournals(journals);

      if (fetchedHabits && fetchedHabits.length > 0) {
        setHabitsList(fetchedHabits);
      } else if (arcData?.habits) {
        setHabitsList(
          arcData.habits.map((h, i) => ({
            id: `temp_${i}`,
            user_id: user.id,
            title: h,
            pillar: arcData.focusPillar,
            icon: '⚡',
            target_frequency: 'daily',
            is_archived: false,
            order_index: i,
            created_at: new Date().toISOString(),
          })),
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, arcData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleToggleHabit = async (habitId: string) => {
    if (!user?.id) return;
    const isCurrentlyDone = completedIds.includes(habitId);
    const nextState = !isCurrentlyDone;

    // Optimistic UI update
    setCompletedIds((prev) =>
      nextState ? [...prev, habitId] : prev.filter((id) => id !== habitId),
    );

    await toggleHabitLog(user.id, habitId, nextState);
  };

  const completedCount = habitsList.filter((h) => completedIds.includes(h.id)).length;
  const progressPercent =
    habitsList.length > 0 ? Math.round((completedCount / habitsList.length) * 100) : 0;

  const currentStreak = profile?.current_streak ?? 1;
  const totalDays = profile?.duration_days ?? arcData?.durationDays ?? 90;
  const goalTitle = profile?.goal ?? arcData?.goal ?? 'Peak Discipline & Body Transformation';

  const pillarAnalytics = useMemo(() => {
    return computePillarAnalytics({
      habitAdherencePercent: progressPercent,
      totalWorkouts: recentWorkouts.length,
      totalReflections: recentJournals.length,
      currentStreak: currentStreak,
    });
  }, [progressPercent, recentWorkouts.length, recentJournals.length, currentStreak]);

  const nextMilestone = computeMilestones({
    streak: currentStreak,
    longestStreak: currentStreak,
    totalWorkouts: recentWorkouts.length,
    totalHabits: habitsList.length,
    totalReflections: recentJournals.length,
  }).find((m) => !m.isUnlocked);

  return (
    <Screen
      scroll
      edges={['top', 'bottom']}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Top App Bar */}
      <View style={styles.header}>
        <View>
          <Text variant="caption" color="textMuted">
            {user?.email ?? 'WARRIOR'}
          </Text>
          <Text variant="title" weight="heavy">
            Winter<Text variant="title" weight="heavy" color="primary">ARC</Text>
          </Text>
        </View>
        <Pressable
          style={styles.profileBadgeBtn}
          onPress={() => router.push('/profile' as any)}
        >
          <View style={styles.headerBadgesRow}>
            <Badge label={`INDEX ${pillarAnalytics.disciplineIndex}`} tone="primary" />
            <Badge label={`STREAK ${currentStreak}🔥`} tone="warning" />
          </View>
        </Pressable>
      </View>

      {/* Hero Streak & Progress Card */}
      <Card elevated style={styles.streakCard}>
        <View style={styles.streakRow}>
          <View style={styles.streakInfo}>
            <Badge label={`DAY ${currentStreak} OF ${totalDays}`} tone="primary" />
            <Text variant="display" weight="heavy" style={styles.streakCount}>
              Day {currentStreak.toString().padStart(2, '0')}
            </Text>
            <Text variant="caption" color="textSecondary">
              Active Streak: {currentStreak} Day 🔥 · {Math.max(0, totalDays - currentStreak)} Days To Go
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text variant="heading" weight="heavy" color="primary">
              {progressPercent}%
            </Text>
            <Text variant="caption" color="textMuted">
              DONE
            </Text>
          </View>
        </View>

        <Divider spacing={spacing.md} />

        <View style={styles.missionRow}>
          <Text variant="caption" color="textMuted">
            ACTIVE CONTRACT GOAL:
          </Text>
          <Text variant="bodySm" weight="semibold">
            {goalTitle}
          </Text>
        </View>

        {nextMilestone && (
          <View style={styles.nextMilestoneRow}>
            <Text variant="caption" color="textMuted">
              NEXT UNLOCK:
            </Text>
            <Text variant="caption" weight="bold" color="primary">
              {nextMilestone.icon} {nextMilestone.title} ({nextMilestone.progressPercent}%)
            </Text>
          </View>
        )}
      </Card>

      {/* Today's Protocol Checklist */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text variant="heading" weight="bold">
            Today&apos;s Protocol
          </Text>
        </View>
        <Badge
          label={`${completedCount}/${habitsList.length} DONE`}
          tone={progressPercent === 100 ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.habitsList}>
        {loading && habitsList.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : habitsList.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text variant="body" color="textMuted" align="center">
              No habits set yet for this Arc.
            </Text>
            <Pressable onPress={() => router.push('/habits' as any)}>
              <Text variant="bodySm" color="primary" weight="bold" align="center" style={{ marginTop: spacing.sm }}>
                + Add your first non-negotiable
              </Text>
            </Pressable>
          </Card>
        ) : (
          habitsList.map((habit) => {
            const isDone = completedIds.includes(habit.id);
            return (
              <Card
                key={habit.id}
                onPress={() => handleToggleHabit(habit.id)}
                style={[
                  styles.habitCard,
                  isDone && styles.habitCardDone,
                ]}
              >
                <View style={styles.habitCardContent}>
                  <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                    {isDone && <Icon name="check" size={14} color={colors.textInverse} strokeWidth={3} />}
                  </View>
                  <Text
                    variant="body"
                    weight={isDone ? 'regular' : 'semibold'}
                    style={[
                      styles.habitLabel,
                      isDone && styles.habitLabelDone,
                    ]}
                  >
                    {habit.title}
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* Arc Pillars Direct Navigation */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          The Three Pillars
        </Text>
        <Text variant="caption" color="textMuted">
          Tap to track
        </Text>
      </View>

      <View style={styles.pillarsGrid}>
        <Card
          style={styles.pillarCard}
          onPress={() => router.push('/workouts' as any)}
        >
          <View style={[styles.miniDot, { backgroundColor: colors.fitness }]} />
          <Text variant="bodySm" weight="bold">
            Fitness
          </Text>
          <Text variant="caption" color="textMuted">
            {recentWorkouts.length} Logged
          </Text>
          <Text variant="caption" color="fitness" weight="semibold">
            Track Workout →
          </Text>
        </Card>

        <Card
          style={styles.pillarCard}
          onPress={() => router.push('/habits' as any)}
        >
          <View style={[styles.miniDot, { backgroundColor: colors.discipline }]} />
          <Text variant="bodySm" weight="bold">
            Habits
          </Text>
          <Text variant="caption" color="textMuted">
            {progressPercent}% Today
          </Text>
          <Text variant="caption" color="primary" weight="semibold">
            Manage List →
          </Text>
        </Card>

        <Card
          style={styles.pillarCard}
          onPress={() => router.push('/journal' as any)}
        >
          <View style={[styles.miniDot, { backgroundColor: colors.mindfulness }]} />
          <Text variant="bodySm" weight="bold">
            Mindset
          </Text>
          <Text variant="caption" color="textMuted">
            {recentJournals.length} Reflections
          </Text>
          <Text variant="caption" color="mindfulness" weight="semibold">
            Write Log →
          </Text>
        </Card>
      </View>

      {/* Protocol Execution Tools */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Protocol Tools
        </Text>
        <Text variant="caption" color="textMuted">
          Timers &amp; Telemetry
        </Text>
      </View>

      <View style={styles.toolsRow}>
        <Card
          style={styles.toolCard}
          onPress={() => {
            setActiveTimerMode('cold');
            setTimerModalVisible(true);
          }}
        >
          <Text style={{ fontSize: 22 }}>🥶</Text>
          <Text variant="bodySm" weight="bold">
            Cold Shower
          </Text>
          <Text variant="caption" color="primary">
            2:00 Timer →
          </Text>
        </Card>

        <Card
          style={styles.toolCard}
          onPress={() => {
            setActiveTimerMode('rest');
            setTimerModalVisible(true);
          }}
        >
          <Text style={{ fontSize: 22 }}>⏱️</Text>
          <Text variant="bodySm" weight="bold">
            Gym Rest
          </Text>
          <Text variant="caption" color="fitness">
            60s Rest →
          </Text>
        </Card>

        <Card
          style={styles.toolCard}
          onPress={() => setShareModalVisible(true)}
        >
          <Text style={{ fontSize: 22 }}>📄</Text>
          <Text variant="bodySm" weight="bold">
            Passport
          </Text>
          <Text variant="caption" color="textMuted">
            Export Card →
          </Text>
        </Card>
      </View>

      {/* Daily Stoic Creed Engine */}
      <Card style={styles.creedBanner}>
        <View style={styles.creedTopRow}>
          <View style={styles.creedBadgeRow}>
            <Icon name="shield" size={14} color={colors.primary} />
            <Text variant="caption" weight="heavy" color="primary">
              DAILY STOIC CREED
            </Text>
          </View>
          <Pressable
            style={styles.shuffleBtn}
            onPress={() => setDailyCreed(getRandomCreed())}
          >
            <Text variant="caption" color="primary" weight="bold">
              🔀 Shuffle
            </Text>
          </Pressable>
        </View>

        <Text variant="bodySm" color="textPrimary" style={styles.creedQuote}>
          &quot;{dailyCreed.quote}&quot;
        </Text>
        <Text variant="caption" color="textMuted" style={styles.creedAuthor}>
          — {dailyCreed.author}
        </Text>
      </Card>

      {/* Phase 5 Modals */}
      <ProtocolTimerModal
        visible={timerModalVisible}
        onClose={() => setTimerModalVisible(false)}
        initialMode={activeTimerMode}
      />

      <ShareContractModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        userName={profile?.full_name ?? user?.email ?? 'Champion'}
        currentStreak={currentStreak}
        totalDays={totalDays}
        goal={goalTitle}
        workoutsCount={recentWorkouts.length}
        reflectionsCount={recentJournals.length}
        unlockedBadgesCount={Math.min(9, Math.max(1, currentStreak))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  profileBadgeBtn: {
    padding: spacing.xs,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  streakCard: {
    padding: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    marginVertical: spacing.xs,
    letterSpacing: -1,
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionRow: {
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  habitsList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  habitCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitCardDone: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    opacity: 0.8,
  },
  habitCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  habitLabel: {
    flex: 1,
  },
  habitLabelDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  pillarsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  pillarCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  insightBanner: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  insightText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  nextMilestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  toolCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  creedBanner: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
    gap: spacing.xs,
  },
  creedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  creedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shuffleBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  creedQuote: {
    fontStyle: 'italic',
    lineHeight: 20,
  },
  creedAuthor: {
    marginTop: 2,
  },
});
