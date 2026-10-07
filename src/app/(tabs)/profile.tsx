import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Alert } from 'react-native';
import {
  Text,
  Screen,
  Card,
  Button,
  Badge,
  Divider,
  Icon,
  ActivityHeatmap,
  ShareContractModal,
  PillarBalanceCard,
  BackupModal,
} from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchUserProfile, type ProfileRow } from '@/lib/services/profile.service';
import { fetchWorkouts, type WorkoutWithExercises } from '@/lib/services/workouts.service';
import { fetchUserHabits, fetchTodayCompletedHabitIds } from '@/lib/services/habits.service';
import { fetchJournalEntries, type JournalEntryRow } from '@/lib/services/journal.service';
import { computeMilestones, type MilestoneBadge } from '@/lib/services/milestones.service';
import { computePillarAnalytics } from '@/lib/services/analytics.service';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, arcData, signOut } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [habitCount, setHabitCount] = useState(0);
  const [completedHabitCount, setCompletedHabitCount] = useState(0);
  const [journals, setJournals] = useState<JournalEntryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [prof, fetchedWorkouts, habits, fetchedJournals, todayHabitIds] = await Promise.all([
        fetchUserProfile(user.id),
        fetchWorkouts(user.id),
        fetchUserHabits(user.id),
        fetchJournalEntries(user.id),
        fetchTodayCompletedHabitIds(user.id),
      ]);
      setProfile(prof);
      setWorkouts(fetchedWorkouts);
      setHabitCount(habits.length);
      setCompletedHabitCount(todayHabitIds.length);
      setJournals(fetchedJournals);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const streak = profile?.current_streak ?? 1;
  const longestStreak = profile?.longest_streak ?? streak;
  const duration = profile?.duration_days ?? arcData?.durationDays ?? 90;
  const goal = profile?.goal ?? arcData?.goal ?? 'Peak Discipline & Athletic Body Transformation';
  const pillar = profile?.focus_pillar ?? arcData?.focusPillar ?? 'discipline';

  // Aggregate daily activity dates for the 90-day heatmap
  const activityDates = useMemo(() => {
    const dates: Record<string, number> = {};
    for (const w of workouts) {
      const d = w.workout_date;
      dates[d] = (dates[d] ?? 0) + 2; // Workouts have weight 2
    }
    for (const j of journals) {
      const d = j.entry_date;
      dates[d] = (dates[d] ?? 0) + 1; // Reflections have weight 1
    }
    return dates;
  }, [workouts, journals]);

  // Compute Phase 4 milestone achievements
  const milestones: MilestoneBadge[] = useMemo(() => {
    return computeMilestones({
      streak,
      longestStreak,
      totalWorkouts: workouts.length,
      totalHabits: habitCount,
      totalReflections: journals.length,
    });
  }, [streak, longestStreak, workouts.length, habitCount, journals.length]);

  const unlockedCount = milestones.filter((m) => m.isUnlocked).length;

  // Phase 6: Winter Arc Pillar Analytics & Discipline Index
  const habitAdherence = habitCount > 0 ? Math.round((completedHabitCount / habitCount) * 100) : 0;
  const pillarAnalytics = useMemo(() => {
    return computePillarAnalytics({
      habitAdherencePercent: habitAdherence,
      totalWorkouts: workouts.length,
      totalReflections: journals.length,
      currentStreak: streak,
    });
  }, [habitAdherence, workouts.length, journals.length, streak]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to exit your Winter Arc terminal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <Screen
      scroll
      edges={['top', 'bottom']}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="caption" color="textMuted">
            IDENTITY &amp; PROTOCOL
          </Text>
          <Text variant="title" weight="heavy">
            Arc<Text variant="title" weight="heavy" color="primary">PROFILE</Text>
          </Text>
        </View>
        <Badge
          label={isSupabaseConfigured ? 'CLOUD SYNC' : 'LOCAL MODE'}
          tone={isSupabaseConfigured ? 'primary' : 'neutral'}
        />
      </View>

      {/* User Hero Card */}
      <Card elevated style={styles.userCard}>
        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            <Text variant="title" weight="heavy" color="primary">
              {(profile?.full_name ?? user?.email ?? 'W').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text variant="heading" weight="bold">
              {profile?.full_name || 'Winter Arc Warrior'}
            </Text>
            <Text variant="caption" color="textMuted">
              {user?.email ?? 'Offline Session'}
            </Text>
            <View style={styles.pillarTagRow}>
              <Badge
                label={`FOCUS: ${pillar.toUpperCase()}`}
                tone={pillar === 'fitness' ? 'warning' : pillar === 'mindfulness' ? 'neutral' : 'primary'}
              />
            </View>
          </View>
        </View>
      </Card>

      {/* The Winter Arc Contract */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          The Winter Arc Contract
        </Text>
      </View>

      <Card style={styles.contractCard}>
        <View style={styles.contractRow}>
          <View style={styles.contractStat}>
            <Text variant="title" weight="heavy" color="primary">
              {streak}
            </Text>
            <Text variant="caption" color="textMuted">
              CURRENT STREAK
            </Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.contractStat}>
            <Text variant="title" weight="heavy" color="textPrimary">
              {longestStreak}
            </Text>
            <Text variant="caption" color="textMuted">
              LONGEST STREAK
            </Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.contractStat}>
            <Text variant="title" weight="heavy" color="textSecondary">
              {duration}d
            </Text>
            <Text variant="caption" color="textMuted">
              TARGET DURATION
            </Text>
          </View>
        </View>

        <Divider spacing={spacing.md} />

        <View style={styles.contractGoal}>
          <Text variant="caption" color="textMuted">
            PRIMARY MISSION:
          </Text>
          <Text variant="body" weight="semibold">
            {goal}
          </Text>
        </View>
      </Card>

      {/* Phase 6: Winter Arc Discipline Index & Three Pillars Balance */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Discipline Index &amp; Pillars
        </Text>
      </View>

      <PillarBalanceCard analytics={pillarAnalytics} />

      {/* Phase 4: 90-Day Activity Heatmap Matrix */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text variant="heading" weight="bold">
          Telemetry &amp; Consistency
        </Text>
      </View>

      <ActivityHeatmap
        activityDates={activityDates}
        startDate={profile?.start_date ?? undefined}
        totalDays={duration}
      />

      {/* Phase 4: Milestones & Badges Showcase */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <View style={styles.sectionTitleRow}>
          <Text variant="heading" weight="bold">
            Arc Milestones
          </Text>
          <Badge label={`${unlockedCount}/${milestones.length} UNLOCKED`} tone="primary" />
        </View>
      </View>

      <View style={styles.milestonesGrid}>
        {milestones.map((badge) => {
          return (
            <Card
              key={badge.id}
              style={[
                styles.badgeCard,
                badge.isUnlocked && styles.badgeCardUnlocked,
              ]}
            >
              <View style={styles.badgeTopRow}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <View
                  style={[
                    styles.statusTag,
                    badge.isUnlocked ? styles.statusUnlocked : styles.statusLocked,
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    style={{
                      fontSize: 9,
                      color: badge.isUnlocked ? colors.primary : colors.textMuted,
                    }}
                  >
                    {badge.isUnlocked ? 'EARNED' : `${badge.progressPercent}%`}
                  </Text>
                </View>
              </View>

              <Text variant="bodySm" weight="bold" style={styles.badgeTitle}>
                {badge.title}
              </Text>
              <Text variant="caption" color="textMuted" style={styles.badgeDesc}>
                {badge.description}
              </Text>

              {/* Progress Bar for Locked */}
              {!badge.isUnlocked && (
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${badge.progressPercent}%` },
                    ]}
                  />
                </View>
              )}
            </Card>
          );
        })}
      </View>

      {/* Lifetime Telemetry */}
      <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
        <Text variant="heading" weight="bold">
          Lifetime Totals
        </Text>
      </View>

      <View style={styles.telemetryGrid}>
        <Card style={styles.telemetryCard}>
          <Icon name="dumbbell" size={20} color={colors.fitness} />
          <Text variant="heading" weight="heavy" color="fitness">
            {workouts.length}
          </Text>
          <Text variant="caption" color="textMuted">
            Workouts Logged
          </Text>
        </Card>

        <Card style={styles.telemetryCard}>
          <Icon name="check-square" size={20} color={colors.discipline} />
          <Text variant="heading" weight="heavy" color="discipline">
            {habitCount}
          </Text>
          <Text variant="caption" color="textMuted">
            Active Standards
          </Text>
        </Card>

        <Card style={styles.telemetryCard}>
          <Icon name="book-open" size={20} color={colors.mindfulness} />
          <Text variant="heading" weight="heavy" color="mindfulness">
            {journals.length}
          </Text>
          <Text variant="caption" color="textMuted">
            Reflections Filed
          </Text>
        </Card>
      </View>

      {/* Protocol Management & Actions */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Protocol Controls
        </Text>
      </View>

      <Card style={styles.actionsCard}>
        <Button
          title="📄 View &amp; Export Arc Passport"
          variant="primary"
          onPress={() => setShareModalVisible(true)}
        />
        <Button
          title="💾 Arc Data Backup &amp; Restore"
          variant="secondary"
          onPress={() => setBackupModalVisible(true)}
        />
        <Button
          title="⚙️ Reconfigure Arc Targets &amp; Habits"
          variant="secondary"
          onPress={() => router.push('/onboarding')}
        />
        <Button
          title="Sign Out of ArcX"
          variant="danger"
          onPress={handleSignOut}
          style={{ marginTop: spacing.xs }}
        />
      </Card>

      {/* Winter Arc Creed */}
      <Card style={styles.creedCard}>
        <Text variant="caption" weight="heavy" color="primary" align="center">
          WINTER ARC CREED
        </Text>
        <Text variant="caption" color="textSecondary" align="center" style={styles.creedText}>
          &quot;When the cold arrives and the weak hibernate, we build in the dark.
          No excuses, no pauses, no compromise.&quot;
        </Text>
      </Card>

      {/* Phase 5: Share Contract Modal */}
      <ShareContractModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        userName={profile?.full_name ?? user?.email ?? 'Champion'}
        currentStreak={streak}
        totalDays={duration}
        goal={goal}
        workoutsCount={workouts.length}
        reflectionsCount={journals.length}
        unlockedBadgesCount={unlockedCount}
      />

      {/* Phase 6: Arc Database Backup & Restore Modal */}
      <BackupModal
        visible={backupModalVisible}
        onClose={() => setBackupModalVisible(false)}
        userId={user?.id ?? 'guest'}
        onDataRestored={loadData}
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
  userCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  pillarTagRow: {
    marginTop: 2,
    flexDirection: 'row',
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  contractStat: {
    alignItems: 'center',
    gap: 2,
  },
  dividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderSubtle,
  },
  contractGoal: {
    gap: spacing.xs,
  },
  milestonesGrid: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  badgeCard: {
    padding: spacing.md,
    gap: spacing.xs,
    opacity: 0.75,
  },
  badgeCardUnlocked: {
    opacity: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  badgeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeIcon: {
    fontSize: 22,
  },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusUnlocked: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: colors.primary,
  },
  statusLocked: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  badgeTitle: {
    letterSpacing: -0.2,
  },
  badgeDesc: {
    lineHeight: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  telemetryCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionsCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  creedCard: {
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing['2xl'],
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderSubtle,
  },
  creedText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
