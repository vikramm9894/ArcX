import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text, Screen, Card, Button, Input, Badge, Icon } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import {
  fetchUserHabits,
  fetchTodayCompletedHabitIds,
  toggleHabitLog,
  createHabit,
  deleteHabit,
  type HabitRow,
} from '@/lib/services/habits.service';
import type { Pillar } from '@/lib/database.types';

type PillarFilter = 'all' | 'fitness' | 'discipline' | 'mindfulness';

const PILLAR_COLORS: Record<Pillar, string> = {
  fitness: colors.fitness,
  discipline: colors.discipline,
  mindfulness: colors.mindfulness,
};

export default function HabitsScreen() {
  const { user } = useAuth();

  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<PillarFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newPillar, setNewPillar] = useState<Pillar>('discipline');
  const [saving, setSaving] = useState(false);

  const loadHabitsData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [fetchedHabits, todayCompleted] = await Promise.all([
        fetchUserHabits(user.id),
        fetchTodayCompletedHabitIds(user.id),
      ]);
      setHabits(fetchedHabits);
      setCompletedIds(todayCompleted);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadHabitsData();
  }, [loadHabitsData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHabitsData();
  }, [loadHabitsData]);

  const handleToggle = async (habitId: string) => {
    if (!user?.id) return;
    const isDone = completedIds.includes(habitId);
    const nextState = !isDone;

    setCompletedIds((prev) =>
      nextState ? [...prev, habitId] : prev.filter((id) => id !== habitId),
    );

    await toggleHabitLog(user.id, habitId, nextState);
  };

  const handleAddHabit = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Required', 'Please enter a habit title (e.g. 5 AM Wake Up, 3L Water).');
      return;
    }
    if (!user?.id) return;

    try {
      setSaving(true);
      const created = await createHabit(user.id, newTitle.trim(), newPillar);
      setHabits((prev) => [...prev, created]);
      setNewTitle('');
      setIsAddOpen(false);
      Alert.alert('Added', 'New non-negotiable added to your protocol.');
    } catch {
      Alert.alert('Error', 'Could not create habit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (habit: HabitRow) => {
    Alert.alert(
      'Remove Habit',
      `Are you sure you want to remove "${habit.title}" from your protocol?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            await deleteHabit(user.id, habit.id);
            setHabits((prev) => prev.filter((h) => h.id !== habit.id));
            setCompletedIds((prev) => prev.filter((id) => id !== habit.id));
          },
        },
      ],
    );
  };

  const filteredHabits =
    filter === 'all' ? habits : habits.filter((h) => h.pillar === filter);

  const completedCount = habits.filter((h) => completedIds.includes(h.id)).length;
  const adherence = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

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
            PILLAR 02 · UNCOMPROMISING DISCIPLINE
          </Text>
          <Text variant="title" weight="heavy">
            Winter<Text variant="title" weight="heavy" color="discipline">HABITS</Text>
          </Text>
        </View>
        <Button
          title={isAddOpen ? 'Close' : '+ Add'}
          variant={isAddOpen ? 'ghost' : 'primary'}
          size="sm"
          onPress={() => setIsAddOpen((prev) => !prev)}
        />
      </View>

      {/* Aggregate Stats Card */}
      <Card elevated style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="discipline">
              {habits.length}
            </Text>
            <Text variant="caption" color="textMuted">
              STANDARDS
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="success">
              {completedCount}
            </Text>
            <Text variant="caption" color="textMuted">
              DONE TODAY
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="primary">
              {adherence}%
            </Text>
            <Text variant="caption" color="textMuted">
              ADHERENCE
            </Text>
          </View>
        </View>
      </Card>

      {/* Add Habit Form */}
      {isAddOpen && (
        <Card style={styles.formCard}>
          <Text variant="heading" weight="bold">
            Create New Standard
          </Text>
          <Text variant="caption" color="textMuted">
            Only commit to habits you will execute every single day.
          </Text>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Habit Name
            </Text>
            <Input
              placeholder="e.g. 5:00 AM Rise, Cold Shower, No Social Media"
              value={newTitle}
              onChangeText={setNewTitle}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Category Pillar
            </Text>
            <View style={styles.pillarSelectorRow}>
              {(['discipline', 'fitness', 'mindfulness'] as Pillar[]).map((p) => {
                const isActive = newPillar === p;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.pillarSelectChip,
                      isActive && {
                        backgroundColor: PILLAR_COLORS[p],
                        borderColor: PILLAR_COLORS[p],
                      },
                    ]}
                    onPress={() => setNewPillar(p)}
                  >
                    <Text
                      variant="caption"
                      weight="bold"
                      style={isActive ? { color: colors.textInverse } : { color: colors.textSecondary }}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button
            title={saving ? 'Adding...' : 'Add to Protocol'}
            variant="primary"
            loading={saving}
            onPress={handleAddHabit}
            style={{ marginTop: spacing.xs }}
          />
        </Card>
      )}

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'discipline', 'fitness', 'mindfulness'] as PillarFilter[]).map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              variant="caption"
              weight="bold"
              color={filter === f ? 'primary' : 'textMuted'}
            >
              {f.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Habits List */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Protocol Standards
        </Text>
        <Badge label={`${filteredHabits.length} ACTIVE`} tone="neutral" />
      </View>

      {loading && habits.length === 0 ? (
        <ActivityIndicator color={colors.discipline} style={{ marginVertical: spacing.xl }} />
      ) : filteredHabits.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="check-square" size={32} color={colors.textMuted} />
          <Text variant="body" weight="semibold" align="center" style={{ marginTop: spacing.md }}>
            No habits found in this category
          </Text>
          <Text variant="caption" color="textMuted" align="center">
            Tap &quot;+ Add&quot; above to add a custom daily discipline rule.
          </Text>
        </Card>
      ) : (
        <View style={styles.habitsList}>
          {filteredHabits.map((habit) => {
            const isDone = completedIds.includes(habit.id);
            const pillarColor = PILLAR_COLORS[(habit.pillar as Pillar) ?? 'discipline'];

            return (
              <Card
                key={habit.id}
                style={[styles.habitCard, isDone && styles.habitCardDone]}
              >
                <View style={styles.habitRow}>
                  <Pressable
                    style={styles.checkWrapper}
                    onPress={() => handleToggle(habit.id)}
                  >
                    <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                      {isDone && <Icon name="check" size={14} color={colors.textInverse} strokeWidth={3} />}
                    </View>
                    <View style={styles.habitInfo}>
                      <Text
                        variant="body"
                        weight={isDone ? 'regular' : 'bold'}
                        style={[styles.habitTitle, isDone && styles.habitTitleDone]}
                      >
                        {habit.title}
                      </Text>
                      <View style={styles.tagRow}>
                        <View style={[styles.pillarDot, { backgroundColor: pillarColor }]} />
                        <Text variant="caption" color="textMuted">
                          {habit.pillar?.toUpperCase() ?? 'DISCIPLINE'} · {habit.target_frequency?.toUpperCase() ?? 'DAILY'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(habit)}
                    style={styles.deleteBtn}
                  >
                    <Icon name="trash" size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </Card>
            );
          })}
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
    borderColor: colors.discipline,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  pillarSelectorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pillarSelectChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
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
  },
  habitCardDone: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.85,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
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
  habitInfo: {
    flex: 1,
    gap: 2,
  },
  habitTitle: {
    letterSpacing: -0.2,
  },
  habitTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pillarDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  deleteBtn: {
    padding: spacing.sm,
  },
  emptyCard: {
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
});
