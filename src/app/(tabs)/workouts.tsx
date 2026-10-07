import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text, Screen, Card, Button, Input, Badge, Divider, Icon } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import { fetchWorkouts, logWorkout, type WorkoutRow } from '@/lib/services/workouts.service';

type IntensityLevel = 'low' | 'medium' | 'high' | 'extreme';

const INTENSITY_COLORS: Record<IntensityLevel, string> = {
  low: colors.success,
  medium: colors.primary,
  high: colors.warning,
  extreme: colors.danger,
};

const DURATION_PRESETS = [30, 45, 60, 90];

export default function WorkoutsScreen() {
  const { user } = useAuth();

  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOpen, setIsLoggingOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [intensity, setIntensity] = useState<IntensityLevel>('high');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadWorkouts = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await fetchWorkouts(user.id);
      setWorkouts(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWorkouts();
  }, [loadWorkouts]);

  const handleSaveWorkout = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a workout title (e.g. Heavy Legs, Cold Run).');
      return;
    }
    if (!user?.id) return;

    try {
      setSubmitting(true);
      const saved = await logWorkout(user.id, {
        title: title.trim(),
        duration_minutes: duration,
        intensity,
        notes: notes.trim() || undefined,
      });

      setWorkouts((prev) => [saved, ...prev.filter((w) => w.id !== saved.id)]);
      setTitle('');
      setNotes('');
      setIsLoggingOpen(false);
      Alert.alert('Protocol Logged', 'Workout recorded to your Winter Arc contract.');
    } catch {
      Alert.alert('Error', 'Could not save workout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalMinutes = workouts.reduce((acc, curr) => acc + (curr.duration_minutes ?? 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

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
            PILLAR 01 · PHYSICAL MASTERY
          </Text>
          <Text variant="title" weight="heavy">
            Winter<Text variant="title" weight="heavy" color="fitness">FITNESS</Text>
          </Text>
        </View>
        <Button
          title={isLoggingOpen ? 'Close' : '+ Log'}
          variant={isLoggingOpen ? 'ghost' : 'primary'}
          size="sm"
          onPress={() => setIsLoggingOpen((prev) => !prev)}
        />
      </View>

      {/* Aggregate Stats Card */}
      <Card elevated style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="fitness">
              {workouts.length}
            </Text>
            <Text variant="caption" color="textMuted">
              SESSIONS
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="primary">
              {totalHours}h
            </Text>
            <Text variant="caption" color="textMuted">
              HOURS LOGGED
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="textPrimary">
              {workouts.length > 0 ? workouts[0].intensity?.toUpperCase() : 'N/A'}
            </Text>
            <Text variant="caption" color="textMuted">
              LAST PACE
            </Text>
          </View>
        </View>
      </Card>

      {/* Log Workout Form */}
      {isLoggingOpen && (
        <Card style={styles.formCard}>
          <Text variant="heading" weight="bold">
            Record Training Session
          </Text>
          <Text variant="caption" color="textMuted">
            Consistency is built in silence.
          </Text>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Workout Name
            </Text>
            <Input
              placeholder="e.g. 5x5 Heavy Squats, 10k Run"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Duration: {duration} mins
            </Text>
            <View style={styles.presetRow}>
              {DURATION_PRESETS.map((p) => (
                <Pressable
                  key={p}
                  style={[styles.presetChip, duration === p && styles.presetChipActive]}
                  onPress={() => setDuration(p)}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    color={duration === p ? 'textInverse' : 'textSecondary'}
                  >
                    {p}m
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Intensity
            </Text>
            <View style={styles.intensityRow}>
              {(['low', 'medium', 'high', 'extreme'] as IntensityLevel[]).map((lvl) => {
                const isActive = intensity === lvl;
                return (
                  <Pressable
                    key={lvl}
                    style={[
                      styles.intensityChip,
                      isActive && {
                        backgroundColor: INTENSITY_COLORS[lvl],
                        borderColor: INTENSITY_COLORS[lvl],
                      },
                    ]}
                    onPress={() => setIntensity(lvl)}
                  >
                    <Text
                      variant="caption"
                      weight="bold"
                      style={isActive ? { color: colors.textInverse } : { color: colors.textSecondary }}
                    >
                      {lvl.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Notes &amp; Personal Records
            </Text>
            <Input
              placeholder="Sets, weights, how the session felt..."
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <Button
            title={submitting ? 'Recording...' : 'Commit Workout'}
            variant="primary"
            loading={submitting}
            onPress={handleSaveWorkout}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      )}

      {/* Workout History */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Training Log History
        </Text>
        <Badge label={`${workouts.length} TOTAL`} tone="neutral" />
      </View>

      {loading && workouts.length === 0 ? (
        <ActivityIndicator color={colors.fitness} style={{ marginVertical: spacing.xl }} />
      ) : workouts.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="dumbbell" size={32} color={colors.textMuted} />
          <Text variant="body" weight="semibold" align="center" style={{ marginTop: spacing.md }}>
            No sessions recorded yet
          </Text>
          <Text variant="caption" color="textMuted" align="center">
            Tap &quot;+ Log&quot; above to log your first Winter Arc workout.
          </Text>
        </Card>
      ) : (
        <View style={styles.historyList}>
          {workouts.map((w) => (
            <Card key={w.id} style={styles.workoutCard}>
              <View style={styles.workoutTopRow}>
                <View style={styles.workoutInfo}>
                  <Text variant="body" weight="bold">
                    {w.title}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {w.workout_date} · {w.duration_minutes ?? 45} mins
                  </Text>
                </View>
                <View
                  style={[
                    styles.intensityBadge,
                    {
                      backgroundColor:
                        INTENSITY_COLORS[(w.intensity as IntensityLevel) ?? 'high'] + '22',
                      borderColor:
                        INTENSITY_COLORS[(w.intensity as IntensityLevel) ?? 'high'],
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    style={{
                      color: INTENSITY_COLORS[(w.intensity as IntensityLevel) ?? 'high'],
                      fontSize: 10,
                    }}
                  >
                    {w.intensity?.toUpperCase() ?? 'HIGH'}
                  </Text>
                </View>
              </View>

              {w.notes && (
                <>
                  <Divider spacing={spacing.sm} />
                  <Text variant="caption" color="textSecondary" style={styles.workoutNotes}>
                    &quot;{w.notes}&quot;
                  </Text>
                </>
              )}
            </Card>
          ))}
        </View>
      )}
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
  statsCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderSubtle,
  },
  formCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
    borderColor: colors.fitness,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  intensityChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  workoutCard: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  workoutTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  intensityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  workoutNotes: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  emptyCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
});
