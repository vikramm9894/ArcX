import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Text, Screen, Card, Button, Input, Badge, Icon } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import {
  fetchJournalEntries,
  saveJournalEntry,
  type JournalEntryRow,
} from '@/lib/services/journal.service';

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function JournalScreen() {
  const { user } = useAuth();

  const [entries, setEntries] = useState<JournalEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Form states
  const [disciplineRating, setDisciplineRating] = useState<number>(8);
  const [moodScore, setMoodScore] = useState<number>(8);
  const [gratitudeText, setGratitudeText] = useState('');
  const [reflectionText, setReflectionText] = useState('');
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadJournalData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await fetchJournalEntries(user.id);
      setEntries(data);

      // Pre-fill today's entry if already created
      const todayEntry = data.find((e) => e.entry_date === todayStr);
      if (todayEntry) {
        setDisciplineRating(todayEntry.discipline_rating ?? 8);
        setMoodScore(todayEntry.mood_score ?? 8);
        setGratitudeText(todayEntry.gratitude_text ?? '');
        setReflectionText(todayEntry.reflection_text ?? '');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, todayStr]);

  useEffect(() => {
    loadJournalData();
  }, [loadJournalData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadJournalData();
  }, [loadJournalData]);

  const handleSaveEntry = async () => {
    if (!reflectionText.trim() && !gratitudeText.trim()) {
      Alert.alert('Required', 'Please write at least one sentence of reflection or gratitude.');
      return;
    }
    if (!user?.id) return;

    try {
      setSaving(true);
      const saved = await saveJournalEntry(user.id, {
        entry_date: todayStr,
        discipline_rating: disciplineRating,
        mood_score: moodScore,
        reflection_text: reflectionText.trim() || undefined,
        gratitude_text: gratitudeText.trim() || undefined,
      });

      setEntries((prev) => [saved, ...prev.filter((e) => e.entry_date !== todayStr)]);
      setIsEditorOpen(false);
      Alert.alert('Mindset Logged', 'Your daily reflection is locked into your Arc record.');
    } catch {
      Alert.alert('Error', 'Could not save reflection.');
    } finally {
      setSaving(false);
    }
  };

  const todayEntry = entries.find((e) => e.entry_date === todayStr);

  const avgDiscipline =
    entries.length > 0
      ? (
          entries.reduce((acc, curr) => acc + (curr.discipline_rating ?? 0), 0) /
          entries.length
        ).toFixed(1)
      : 'N/A';

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
            PILLAR 03 · MENTAL FORTITUDE
          </Text>
          <Text variant="title" weight="heavy">
            Winter<Text variant="title" weight="heavy" color="mindfulness">MINDSET</Text>
          </Text>
        </View>
        <Button
          title={isEditorOpen ? 'Close' : todayEntry ? 'Edit Today' : '+ Reflect'}
          variant={isEditorOpen ? 'ghost' : 'primary'}
          size="sm"
          onPress={() => setIsEditorOpen((prev) => !prev)}
        />
      </View>

      {/* Aggregate Stats Card */}
      <Card elevated style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="mindfulness">
              {entries.length}
            </Text>
            <Text variant="caption" color="textMuted">
              REFLECTIONS
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color="primary">
              {avgDiscipline}/10
            </Text>
            <Text variant="caption" color="textMuted">
              AVG DISCIPLINE
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text variant="title" weight="heavy" color={todayEntry ? 'success' : 'textMuted'}>
              {todayEntry ? 'DONE' : 'PENDING'}
            </Text>
            <Text variant="caption" color="textMuted">
              TODAY&apos;S STATUS
            </Text>
          </View>
        </View>
      </Card>

      {/* Reflection Editor Form */}
      {isEditorOpen && (
        <Card style={styles.formCard}>
          <Text variant="heading" weight="bold">
            Evening Debrief · {todayStr}
          </Text>
          <Text variant="caption" color="textMuted">
            Be ruthlessly honest with yourself.
          </Text>

          {/* Discipline Rating Selector */}
          <View style={styles.fieldGroup}>
            <View style={styles.ratingLabelRow}>
              <Text variant="bodySm" weight="semibold">
                Self-Discipline Rating
              </Text>
              <Text variant="bodySm" weight="bold" color="mindfulness">
                {disciplineRating} / 10
              </Text>
            </View>
            <View style={styles.ratingRow}>
              {RATINGS.map((r) => (
                <Pressable
                  key={r}
                  style={[
                    styles.ratingPill,
                    disciplineRating === r && styles.ratingPillActive,
                  ]}
                  onPress={() => setDisciplineRating(r)}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    style={{
                      color: disciplineRating === r ? colors.textInverse : colors.textSecondary,
                    }}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Mood Rating Selector */}
          <View style={styles.fieldGroup}>
            <View style={styles.ratingLabelRow}>
              <Text variant="bodySm" weight="semibold">
                Mental Clarity &amp; Mood
              </Text>
              <Text variant="bodySm" weight="bold" color="primary">
                {moodScore} / 10
              </Text>
            </View>
            <View style={styles.ratingRow}>
              {RATINGS.map((r) => (
                <Pressable
                  key={r}
                  style={[
                    styles.ratingPill,
                    moodScore === r && styles.ratingPillMoodActive,
                  ]}
                  onPress={() => setMoodScore(r)}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    style={{
                      color: moodScore === r ? colors.textInverse : colors.textSecondary,
                    }}
                  >
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Gratitude Prompt */}
          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Gratitude in the Storm
            </Text>
            <Text variant="caption" color="textMuted">
              What went right today? What gave you strength?
            </Text>
            <Input
              placeholder="e.g. Grateful for waking up early, hot black coffee, completed 5k..."
              value={gratitudeText}
              onChangeText={setGratitudeText}
              multiline
            />
          </View>

          {/* Reflection Prompt */}
          <View style={styles.fieldGroup}>
            <Text variant="bodySm" weight="semibold">
              Evening Reflection
            </Text>
            <Text variant="caption" color="textMuted">
              Did you conquer yourself? What is tomorrow&apos;s victory?
            </Text>
            <Input
              placeholder="e.g. Resisted distraction in the afternoon. Tomorrow I attack squats..."
              value={reflectionText}
              onChangeText={setReflectionText}
              multiline
            />
          </View>

          <Button
            title={saving ? 'Locking in...' : 'Lock In Reflection'}
            variant="primary"
            loading={saving}
            onPress={handleSaveEntry}
            style={{ marginTop: spacing.xs }}
          />
        </Card>
      )}

      {/* Reflections Timeline */}
      <View style={styles.sectionHeader}>
        <Text variant="heading" weight="bold">
          Reflections Archive
        </Text>
        <Badge label={`${entries.length} LOGS`} tone="neutral" />
      </View>

      {loading && entries.length === 0 ? (
        <ActivityIndicator color={colors.mindfulness} style={{ marginVertical: spacing.xl }} />
      ) : entries.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="book-open" size={32} color={colors.textMuted} />
          <Text variant="body" weight="semibold" align="center" style={{ marginTop: spacing.md }}>
            No journal entries recorded
          </Text>
          <Text variant="caption" color="textMuted" align="center">
            Tap &quot;+ Reflect&quot; above to capture your evening mindset debrief.
          </Text>
        </Card>
      ) : (
        <View style={styles.entriesList}>
          {entries.map((item) => (
            <Card key={item.id} style={styles.entryCard}>
              <View style={styles.entryTopRow}>
                <View style={styles.entryDateWrapper}>
                  <Text variant="bodySm" weight="bold">
                    {item.entry_date}
                  </Text>
                  {item.entry_date === todayStr && (
                    <Badge label="TODAY" tone="primary" />
                  )}
                </View>
                <View style={styles.entryScoresRow}>
                  <View style={styles.scorePill}>
                    <Text variant="caption" weight="bold" color="mindfulness">
                      DISCIPLINE: {item.discipline_rating}/10
                    </Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Text variant="caption" weight="bold" color="primary">
                      MOOD: {item.mood_score}/10
                    </Text>
                  </View>
                </View>
              </View>

              {item.gratitude_text && (
                <View style={styles.sectionBlock}>
                  <Text variant="caption" weight="bold" color="primary">
                    GRATITUDE:
                  </Text>
                  <Text variant="bodySm" color="textSecondary" style={styles.entryBody}>
                    &quot;{item.gratitude_text}&quot;
                  </Text>
                </View>
              )}

              {item.reflection_text && (
                <View style={styles.sectionBlock}>
                  <Text variant="caption" weight="bold" color="mindfulness">
                    REFLECTION:
                  </Text>
                  <Text variant="bodySm" color="textSecondary" style={styles.entryBody}>
                    &quot;{item.reflection_text}&quot;
                  </Text>
                </View>
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
    borderColor: colors.mindfulness,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  ratingLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  ratingPill: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ratingPillActive: {
    backgroundColor: colors.mindfulness,
    borderColor: colors.mindfulness,
  },
  ratingPillMoodActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  entriesList: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  entryCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  entryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  entryScoresRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  scorePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
  },
  sectionBlock: {
    gap: 2,
  },
  entryBody: {
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
