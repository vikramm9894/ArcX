import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Text, Screen, Card, Badge, Divider, Icon } from '@/components/ui';
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
          <Badge label={`STREAK ${currentStreak}🔥`} tone="primary" />
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

      {/* Quick Insights Banner */}
      <Card style={styles.insightBanner}>
        <View style={styles.insightHeader}>
          <Icon name="shield" size={16} color={colors.primary} />
          <Text variant="bodySm" weight="bold" color="primary">
            WINTER ARC DISCIPLINE
          </Text>
        </View>
        <Text variant="caption" color="textSecondary" style={styles.insightText}>
          &quot;The secret of change is to focus all of your energy not on fighting the old, but on building the new.&quot;
        </Text>
      </Card>
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
});
