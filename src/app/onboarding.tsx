import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text, Screen, Button, Card, Badge, Input, Divider } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import type { PillarKey } from '@/lib/types';

const PRESET_GOALS = [
  'Peak Athletic Condition & Strength',
  'Total Mind & Body Reset',
  'Unbreakable Habit Discipline',
  'Extreme Fat Loss & Shred',
];

const PILLARS: { key: PillarKey; label: string; desc: string; color: string }[] = [
  {
    key: 'fitness',
    label: 'Fitness & Workouts',
    desc: 'Heavy lifting, conditioning, and bodily transformation.',
    color: colors.fitness,
  },
  {
    key: 'discipline',
    label: 'Habits & Discipline',
    desc: 'Uncompromising daily check-offs, routines, and streaks.',
    color: colors.discipline,
  },
  {
    key: 'mindfulness',
    label: 'Mindfulness & Journal',
    desc: 'Daily reflection, mental clarity, and gratitude.',
    color: colors.mindfulness,
  },
];

const STARTER_HABITS = [
  '🧊 Cold shower every morning',
  '💧 Drink 3.5L of water',
  '🏋️ 45-min workout session',
  '📖 Read 10 pages of a book',
  '📵 No social media before 12 PM',
  '🥗 Clean eating (Zero junk food)',
  '🌙 Asleep by 11:00 PM',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedGoal, setSelectedGoal] = useState(PRESET_GOALS[0]);
  const [selectedPillar, setSelectedPillar] = useState<PillarKey>('discipline');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([
    STARTER_HABITS[0],
    STARTER_HABITS[1],
    STARTER_HABITS[2],
  ]);
  const [customHabit, setCustomHabit] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleHabit = (habit: string) => {
    if (selectedHabits.includes(habit)) {
      if (selectedHabits.length > 1) {
        setSelectedHabits(selectedHabits.filter((h) => h !== habit));
      }
    } else {
      setSelectedHabits([...selectedHabits, habit]);
    }
  };

  const addCustomHabit = () => {
    const trimmed = customHabit.trim();
    if (trimmed && !selectedHabits.includes(trimmed)) {
      setSelectedHabits([...selectedHabits, `⚡ ${trimmed}`]);
      setCustomHabit('');
    }
  };

  const handleFinish = async () => {
    try {
      setSaving(true);
      await completeOnboarding({
        goal: selectedGoal,
        focusPillar: selectedPillar,
        durationDays: 90,
        startDate: new Date().toISOString().split('T')[0],
        habits: selectedHabits,
      });
      router.replace('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      {/* Step Indicator */}
      <View style={styles.topBar}>
        <Badge label={`STEP ${step} OF 4`} tone="primary" />
        <View style={styles.stepDots}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.dot,
                { backgroundColor: s <= step ? colors.primary : colors.surfaceElevated },
              ]}
            />
          ))}
        </View>
      </View>

      {/* STEP 1: The Goal */}
      {step === 1 && (
        <View style={styles.stepContainer}>
          <Text variant="title" weight="heavy">
            Define Your Mission
          </Text>
          <Text variant="body" color="textSecondary">
            For the next 90 days, what is the single major standard you are holding yourself to?
          </Text>

          <View style={styles.listGap}>
            {PRESET_GOALS.map((goal) => {
              const active = selectedGoal === goal;
              return (
                <Card
                  key={goal}
                  onPress={() => setSelectedGoal(goal)}
                  style={[
                    styles.selectableCard,
                    active && { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View style={styles.radioRow}>
                    <View style={[styles.radioCircle, active && styles.radioActive]} />
                    <Text variant="subheading" weight={active ? 'semibold' : 'regular'}>
                      {goal}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>

          <Button title="Continue →" onPress={() => setStep(2)} style={styles.nextBtn} />
        </View>
      )}

      {/* STEP 2: The Focus Pillar */}
      {step === 2 && (
        <View style={styles.stepContainer}>
          <Text variant="title" weight="heavy">
            Choose Core Pillar
          </Text>
          <Text variant="body" color="textSecondary">
            All 3 pillars matter, but which one will be your non-negotiable anchor?
          </Text>

          <View style={styles.listGap}>
            {PILLARS.map((p) => {
              const active = selectedPillar === p.key;
              return (
                <Card
                  key={p.key}
                  onPress={() => setSelectedPillar(p.key)}
                  style={[
                    styles.selectableCard,
                    active && { borderColor: p.color, backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View style={styles.pillarHeader}>
                    <View style={[styles.pillarDot, { backgroundColor: p.color }]} />
                    <Text variant="subheading" weight="semibold">
                      {p.label}
                    </Text>
                  </View>
                  <Text variant="bodySm" color="textSecondary" style={styles.pillarDesc}>
                    {p.desc}
                  </Text>
                </Card>
              );
            })}
          </View>

          <View style={styles.btnRow}>
            <Button title="Back" variant="ghost" onPress={() => setStep(1)} style={styles.flexBtn} />
            <Button title="Continue →" onPress={() => setStep(3)} style={styles.flexBtn} />
          </View>
        </View>
      )}

      {/* STEP 3: Non-Negotiables */}
      {step === 3 && (
        <View style={styles.stepContainer}>
          <Text variant="title" weight="heavy">
            Daily Non-Negotiables
          </Text>
          <Text variant="body" color="textSecondary">
            Select the daily habits you vow to execute every single day without fail.
          </Text>

          <View style={styles.listGap}>
            {STARTER_HABITS.map((habit) => {
              const checked = selectedHabits.includes(habit);
              return (
                <Card
                  key={habit}
                  onPress={() => toggleHabit(habit)}
                  style={[
                    styles.selectableCard,
                    checked && { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View style={styles.habitRow}>
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked && (
                        <Text style={styles.checkMark}>✓</Text>
                      )}
                    </View>
                    <Text variant="body" weight={checked ? 'semibold' : 'regular'}>
                      {habit}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>

          {/* Add custom habit */}
          <View style={styles.customHabitRow}>
            <Input
              placeholder="Add custom habit..."
              value={customHabit}
              onChangeText={setCustomHabit}
              containerStyle={{ flex: 1 }}
            />
            <Button
              title="Add"
              variant="secondary"
              onPress={addCustomHabit}
              disabled={!customHabit.trim()}
              style={{ width: 80 }}
            />
          </View>

          <View style={styles.btnRow}>
            <Button title="Back" variant="ghost" onPress={() => setStep(2)} style={styles.flexBtn} />
            <Button title="Review Oath →" onPress={() => setStep(4)} style={styles.flexBtn} />
          </View>
        </View>
      )}

      {/* STEP 4: Lock In Oath */}
      {step === 4 && (
        <View style={styles.stepContainer}>
          <Badge label="THE PLEDGE" tone="primary" />
          <Text variant="title" weight="heavy">
            Lock In Your Winter Arc
          </Text>
          <Text variant="body" color="textSecondary">
            Review your blueprint. Once locked in, there are zero excuses.
          </Text>

          <Card elevated style={styles.summaryCard}>
            <Text variant="caption" color="textMuted">
              DURATION & MISSION
            </Text>
            <Text variant="subheading" weight="bold">
              90 Days · {selectedGoal}
            </Text>

            <Divider spacing={spacing.md} />

            <Text variant="caption" color="textMuted">
              CORE PILLAR
            </Text>
            <Text variant="subheading" weight="bold">
              {PILLARS.find((p) => p.key === selectedPillar)?.label}
            </Text>

            <Divider spacing={spacing.md} />

            <Text variant="caption" color="textMuted">
              DAILY NON-NEGOTIABLES ({selectedHabits.length})
            </Text>
            {selectedHabits.map((h) => (
              <Text key={h} variant="bodySm" color="textSecondary">
                • {h}
              </Text>
            ))}
          </Card>

          <Text variant="caption" color="textMuted" align="center" style={styles.pledgeText}>
            &ldquo;I commit to showing up every day for the next 90 days. The version of me that emerges in spring will be forged in cold discipline.&rdquo;
          </Text>

          <View style={styles.btnRow}>
            <Button title="Edit" variant="ghost" onPress={() => setStep(3)} style={styles.flexBtn} />
            <Button
              title="Lock In My Arc 🔒"
              loading={saving}
              onPress={handleFinish}
              style={styles.flexBtn}
            />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  stepDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 24,
    height: 4,
    borderRadius: radius.full,
  },
  stepContainer: {
    gap: spacing.lg,
  },
  listGap: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  selectableCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  pillarDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  pillarDesc: {
    marginLeft: spacing.lg + spacing.xs,
    lineHeight: 18,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  customHabitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  summaryCard: {
    gap: spacing.xs,
    padding: spacing.xl,
  },
  pledgeText: {
    fontStyle: 'italic',
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  nextBtn: {
    marginTop: spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  flexBtn: {
    flex: 1,
  },
});
