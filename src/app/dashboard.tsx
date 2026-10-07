import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Screen, Button, Card, Badge, Divider } from '@/components/ui';
import { colors, spacing, radius, fontWeight } from '@/theme';
import { useAuth } from '@/providers';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, arcData, signOut } = useAuth();

  // Local state for checking off habits today
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>({});

  const habits = arcData?.habits ?? [
    '🧊 Cold shower every morning',
    '💧 Drink 3.5L of water',
    '🏋️ 45-min workout session',
  ];

  const toggleHabit = (habit: string) => {
    setCompletedHabits((prev) => ({
      ...prev,
      [habit]: !prev[habit],
    }));
  };

  const completedCount = habits.filter((h) => completedHabits[h]).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

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
            <Badge label="DAY 1 OF 90" tone="primary" />
            <Text variant="display" weight="heavy" style={styles.streakCount}>
              Day 01
            </Text>
            <Text variant="caption" color="textSecondary">
              Streak: 1 Day 🔥 · 89 Days Remaining
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
            {arcData?.goal ?? 'Total Transformation & Peak Discipline'}
          </Text>
        </View>
      </Card>

      {/* Today's Non-Negotiables Checklist */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Today&apos;s Protocol
        </Text>
        <Badge
          label={`${completedCount}/${habits.length} COMPLETED`}
          tone={progressPercent === 100 ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.habitsList}>
        {habits.map((habit) => {
          const isDone = !!completedHabits[habit];
          return (
            <Card
              key={habit}
              onPress={() => toggleHabit(habit)}
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
                  {habit}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>

      {/* Pillars Quick View */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Arc Pillars
        </Text>
        <Text variant="caption" color="textMuted">
          Phase 2 Integration
        </Text>
      </View>

      <View style={styles.pillarsGrid}>
        <Card style={styles.pillarMiniCard}>
          <View style={[styles.miniDot, { backgroundColor: colors.fitness }]} />
          <Text variant="bodySm" weight="semibold">
            Fitness
          </Text>
          <Text variant="caption" color="textMuted">
            Workout ready
          </Text>
        </Card>

        <Card style={styles.pillarMiniCard}>
          <View style={[styles.miniDot, { backgroundColor: colors.discipline }]} />
          <Text variant="bodySm" weight="semibold">
            Habits
          </Text>
          <Text variant="caption" color="textMuted">
            {progressPercent}% locked
          </Text>
        </Card>

        <Card style={styles.pillarMiniCard}>
          <View style={[styles.miniDot, { backgroundColor: colors.mindfulness }]} />
          <Text variant="bodySm" weight="semibold">
            Journal
          </Text>
          <Text variant="caption" color="textMuted">
            Evening prompt
          </Text>
        </Card>
      </View>

      {/* Arc Reconfigure / Settings Link */}
      <View style={styles.footer}>
        <Pressable onPress={() => router.push('/onboarding')}>
          <Text variant="caption" color="textMuted" align="center">
            ⚙️ Reconfigure Arc Targets & Habits
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
