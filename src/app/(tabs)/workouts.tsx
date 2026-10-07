import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text, Screen, Card, Button, Input, Badge, Divider, Icon, ProtocolTimerModal } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import {
  fetchWorkouts,
  logWorkout,
  deleteWorkout,
  type WorkoutWithExercises,
  type ExerciseInput,
} from '@/lib/services/workouts.service';

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

  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOpen, setIsLoggingOpen] = useState(false);
  const [restTimerVisible, setRestTimerVisible] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [intensity, setIntensity] = useState<IntensityLevel>('high');
  const [notes, setNotes] = useState('');
  const [exercisesList, setExercisesList] = useState<ExerciseInput[]>([]);
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('3');
  const [exReps, setExReps] = useState('10');
  const [exWeight, setExWeight] = useState('60');
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

  const handleAddExerciseToForm = () => {
    if (!exName.trim()) {
      Alert.alert('Required', 'Please enter an exercise name (e.g. Squat, Bench Press).');
      return;
    }
    const newEx: ExerciseInput = {
      exercise_name: exName.trim(),
      sets: parseInt(exSets, 10) || 3,
      reps: parseInt(exReps, 10) || 10,
      weight_kg: parseFloat(exWeight) || 0,
    };
    setExercisesList((prev) => [...prev, newEx]);
    setExName('');
  };

  const handleRemoveExercise = (index: number) => {
    setExercisesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveWorkout = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a workout title (e.g. Heavy Legs, Cold Run).');
      return;
    }
    if (!user?.id) return;

    try {
      setSubmitting(true);
      const saved = await logWorkout(
        user.id,
        {
          title: title.trim(),
          duration_minutes: duration,
          intensity,
          notes: notes.trim() || undefined,
        },
        exercisesList.length > 0 ? exercisesList : undefined,
      );

      setWorkouts((prev) => [saved, ...prev.filter((w) => w.id !== saved.id)]);
      setTitle('');
      setNotes('');
      setExercisesList([]);
      setIsLoggingOpen(false);
      Alert.alert('Protocol Logged', 'Workout and exercises recorded to your Winter Arc contract.');
    } catch {
      Alert.alert('Error', 'Could not save workout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWorkout = (workout: WorkoutWithExercises) => {
    Alert.alert('Delete Workout', `Delete session "${workout.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          await deleteWorkout(user.id, workout.id);
          setWorkouts((prev) => prev.filter((w) => w.id !== workout.id));
        },
      },
    ]);
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
        <View style={styles.headerBtnGroup}>
          <Button
            title="⏱️ Rest"
            variant="secondary"
            size="sm"
            onPress={() => setRestTimerVisible(true)}
          />
          <Button
            title={isLoggingOpen ? 'Close' : '+ Log'}
            variant={isLoggingOpen ? 'ghost' : 'primary'}
            size="sm"
            onPress={() => setIsLoggingOpen((prev) => !prev)}
          />
        </View>
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
            Track weights, reps, and intense sets.
          </Text>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Workout Routine
            </Text>
            <Input
              placeholder="e.g. Heavy Squats & Calves, 10k Run"
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

          {/* Exercise Builder Section */}
          <Divider spacing={spacing.xs} />
          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="bold" color="fitness">
              Exercises &amp; Sets (Phase 4 Tracking)
            </Text>

            {/* List of currently added exercises */}
            {exercisesList.map((ex, idx) => (
              <View key={idx} style={styles.exerciseAddedRow}>
                <View style={styles.exInfo}>
                  <Text variant="bodySm" weight="semibold">
                    {ex.exercise_name}
                  </Text>
                  <Text variant="caption" color="textMuted">
                    {ex.sets} sets × {ex.reps} reps · {ex.weight_kg > 0 ? `${ex.weight_kg}kg` : 'Bodyweight'}
                  </Text>
                </View>
                <Pressable onPress={() => handleRemoveExercise(idx)} style={styles.removeExBtn}>
                  <Icon name="trash" size={14} color={colors.danger} />
                </Pressable>
              </View>
            ))}

            <View style={styles.addExerciseBox}>
              <Input
                placeholder="Exercise (e.g. Bench Press)"
                value={exName}
                onChangeText={setExName}
              />
              <View style={styles.exerciseNumbersRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color="textMuted">Sets</Text>
                  <Input
                    placeholder="3"
                    keyboardType="numeric"
                    value={exSets}
                    onChangeText={setExSets}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color="textMuted">Reps</Text>
                  <Input
                    placeholder="10"
                    keyboardType="numeric"
                    value={exReps}
                    onChangeText={setExReps}
                  />
                </View>
                <View style={{ flex: 1.2 }}>
                  <Text variant="caption" color="textMuted">Weight (kg)</Text>
                  <Input
                    placeholder="80"
                    keyboardType="numeric"
                    value={exWeight}
                    onChangeText={setExWeight}
                  />
                </View>
              </View>
              <Button
                title="+ Add Movement"
                variant="secondary"
                size="sm"
                onPress={handleAddExerciseToForm}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Notes &amp; Personal Records
            </Text>
            <Input
              placeholder="How the session felt, PR numbers..."
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
                <View style={styles.badgeActionsRow}>
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
                  <Pressable
                    onPress={() => handleDeleteWorkout(w)}
                    style={styles.deleteWorkoutBtn}
                  >
                    <Icon name="trash" size={14} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {/* Exercises Chips in History */}
              {w.exercises && w.exercises.length > 0 && (
                <View style={styles.exercisesGrid}>
                  {w.exercises.map((ex, exIdx) => (
                    <View key={exIdx} style={styles.exChip}>
                      <Text variant="caption" weight="bold" color="fitness">
                        {ex.exercise_name}
                      </Text>
                      <Text variant="caption" color="textSecondary" style={{ fontSize: 11 }}>
                        {ex.sets}x{ex.reps} {ex.weight_kg > 0 ? `@ ${ex.weight_kg}kg` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

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

      {/* Phase 5: Rest Timer Modal */}
      <ProtocolTimerModal
        visible={restTimerVisible}
        onClose={() => setRestTimerVisible(false)}
        initialMode="rest"
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
  headerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  exerciseAddedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  exInfo: {
    flex: 1,
  },
  removeExBtn: {
    padding: spacing.xs,
  },
  addExerciseBox: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.xs,
  },
  exerciseNumbersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  badgeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  intensityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  deleteWorkoutBtn: {
    padding: 2,
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  exChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 1,
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
