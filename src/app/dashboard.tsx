import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Text, Screen, Button, Card, Badge, Divider } from '@/components/ui';
import { colors, spacing, radius, fontWeight } from '@/theme';
import { useAuth } from '@/providers';
import {
  fetchUserHabits,
  fetchTodayCompletedHabitIds,
  toggleHabitLog,
  type HabitRow,
} from '@/lib/services/habits.service';
import { fetchUserProfile, type ProfileRow } from '@/lib/services/profile.service';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, arcData, signOut } = useAuth();

  const [habitsList, setHabitsList] = useState<HabitRow[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [fetchedProfile, fetchedHabits, todayCompleted] = await Promise.all([
        fetchUserProfile(user.id),
        fetchUserHabits(user.id),
        fetchTodayCompletedHabitIds(user.id),
      ]);

      setProfile(fetchedProfile);
      setCompletedIds(todayCompleted);

      if (fetchedHabits && fetchedHabits.length > 0) {
        setHabitsList(fetchedHabits);
      } else if (arcData?.habits) {
        // Fallback to onboarding arc habits
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
    }
  }, [user?.id, arcData]);

  useEffect(() => {
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

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const currentStreak = profile?.current_streak ?? 1;
  const totalDays = profile?.duration_days ?? arcData?.durationDays ?? 90;
  const goalTitle = profile?.goal ?? arcData?.goal ?? 'Peak Discipline & Body Transformation';

  return (
    <Screen scroll edges={['top', 'bottom']}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View>
          <Text variant="caption" color="textMuted">
            {user?.email ?? 'CHAMPION'}
          </Text>
          <Text variant="title" weight="heavy">
            Winter<Text variant="title" weight="heavy" color="primary">ARC</Text>
          </Text>
        </View>
        <Button
          title="Sign Out"
          variant="ghost"
          size="sm"
          onPress={handleSignOut}
          style={styles.signOutBtn}
        />
      </View>

      {/* Hero Streak & Progress Card */}
      <Card elevated style={styles.streakCard}>
        <View style={styles.streakRow}>
          <View>
            <Badge label={`DAY ${currentStreak} OF ${totalDays}`} tone="primary" />
            <Text variant="display" weight="heavy" style={styles.streakCount}>
              Day {currentStreak.toString().padStart(2, '0')}
            </Text>
            <Text variant="caption" color="textSecondary">
              Streak: {currentStreak} Day 🔥 · {totalDays - currentStreak} Days Remaining
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
            ACTIVE MISSION:
          </Text>
          <Text variant="bodySm" weight="semibold">
            {goalTitle}
          </Text>
        </View>
      </Card>

      {/* Today's Non-Negotiables Checklist */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Today&apos;s Protocol
        </Text>
        <Badge
          label={`${completedCount}/${habitsList.length} COMPLETED`}
          tone={progressPercent === 100 ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.habitsList}>
        {loading && habitsList.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
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
                  {isDone && <Text style={styles.checkMark}>✓</Text>}
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
        }))}
      </View>

      {/* Pillars Quick View */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Arc Pillars
        </Text>
        <Text variant="caption" color="textMuted">
          Connected Backend
        </Text>
      </View>

      <View style={styles.pillarsGrid}>
        <Card style={styles.pillarMiniCard}>
          <View style={[styles.miniDot, { backgroundColor: colors.fitness }]} />
          <Text variant="bodySm" weight="semibold">
            Fitness
          </Text>
          <Text variant="caption" color="textMuted">
            Workouts Table
          </Text>
        </Card>

        <Card style={styles.pillarMiniCard}>
          <View style={[styles.miniDot, { backgroundColor: colors.discipline }]} />
          <Text variant="bodySm" weight="semibold">
            Habits
          </Text>
          <Text variant="caption" color="textMuted">
            {progressPercent}% Logged
          </Text>
        </Card>

        <Card style={styles.pillarMiniCard}>
          <View style={[styles.miniDot, { backgroundColor: colors.mindfulness }]} />
          <Text variant="bodySm" weight="semibold">
            Journal
          </Text>
          <Text variant="caption" color="textMuted">
            Entries Table
          </Text>
        </Card>
      </View>

      {/* Arc Reconfigure / Settings Link */}
      <View style={styles.footer}>
        <Pressable onPress={() => router.push('/onboarding')}>
          <Text variant="caption" color="textMuted" align="center">
            ⚙️ Reconfigure Arc Targets &amp; Habits
          </Text>
        </Pressable>
      </View>
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
  signOutBtn: {
    minWidth: 80,
    height: 36,
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
  streakCount: {
    marginVertical: spacing.xs,
    letterSpacing: -1,
  },
  progressCircle: {
    width: 84,
    height: 84,
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
  habitsList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
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
  checkMark: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: fontWeight.bold,
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
  pillarMiniCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  footer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
