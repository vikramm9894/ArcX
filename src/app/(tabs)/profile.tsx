import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Screen, Card, Button, Badge, Divider, Icon } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fetchUserProfile, type ProfileRow } from '@/lib/services/profile.service';
import { fetchWorkouts } from '@/lib/services/workouts.service';
import { fetchUserHabits } from '@/lib/services/habits.service';
import { fetchJournalEntries } from '@/lib/services/journal.service';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, arcData, signOut } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [habitCount, setHabitCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [prof, workouts, habits, journals] = await Promise.all([
        fetchUserProfile(user.id),
        fetchWorkouts(user.id),
        fetchUserHabits(user.id),
        fetchJournalEntries(user.id),
      ]);
      setProfile(prof);
      setWorkoutCount(workouts.length);
      setHabitCount(habits.length);
      setJournalCount(journals.length);
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

  const streak = profile?.current_streak ?? 1;
  const longestStreak = profile?.longest_streak ?? streak;
  const duration = profile?.duration_days ?? arcData?.durationDays ?? 90;
  const goal = profile?.goal ?? arcData?.goal ?? 'Peak Discipline & Athletic Body Transformation';
  const pillar = profile?.focus_pillar ?? arcData?.focusPillar ?? 'discipline';

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

      {/* Lifetime Telemetry */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Lifetime Telemetry
        </Text>
      </View>

      <View style={styles.telemetryGrid}>
        <Card style={styles.telemetryCard}>
          <Icon name="dumbbell" size={20} color={colors.fitness} />
          <Text variant="heading" weight="heavy" color="fitness">
            {workoutCount}
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
            {journalCount}
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
          title="⚙️ Reconfigure Arc Targets & Habits"
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
