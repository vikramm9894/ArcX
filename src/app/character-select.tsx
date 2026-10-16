import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, Screen, Card, Badge, Button, Icon } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { useAuth } from '@/providers';
import {
  chooseCharacter,
  fetchMyPlayerProfile,
  type CharacterKey,
  type PlayerProfile,
} from '@/lib/services/player.service';

interface ChampionData {
  key: CharacterKey;
  name: string;
  pillar: string;
  archetype: string;
  icon: string;
  pillarColor: string;
  buffLabel: string;
  buffDesc: string;
  quote: string;
  forms: { tier: number; name: string; day: number }[];
}

const CHAMPIONS: ChampionData[] = [
  {
    key: 'titan',
    name: 'Titan',
    pillar: 'FITNESS PILLAR',
    archetype: 'Iron Juggernaut',
    icon: '🏋️',
    pillarColor: colors.fitness,
    buffLabel: '+15% ATTACK POWER',
    buffDesc: 'Converts daily lifting volume and push-up sets into devastating offensive damage.',
    quote: '"Iron sharpens iron. The cold gives way to brute force."',
    forms: [
      { tier: 1, name: 'Titan Initiate', day: 1 },
      { tier: 2, name: 'Iron Forged', day: 7 },
      { tier: 3, name: 'Frost Berserker', day: 30 },
      { tier: 4, name: 'Ascended Titan', day: 90 },
    ],
  },
  {
    key: 'sentinel',
    name: 'Sentinel',
    pillar: 'DISCIPLINE PILLAR',
    archetype: 'Aegis Defender',
    icon: '🛡️',
    pillarColor: colors.discipline,
    buffLabel: '+15% DEFENSE SHIELD',
    buffDesc: 'Fortified by unbroken habits and daily non-negotiables to mitigate incoming attacks.',
    quote: '"Routine is our armor. We do not yield to excuses."',
    forms: [
      { tier: 1, name: 'Sentinel Scout', day: 1 },
      { tier: 2, name: 'Shieldbearer', day: 7 },
      { tier: 3, name: 'Cold Bastion', day: 30 },
      { tier: 4, name: 'Immortal Sentinel', day: 90 },
    ],
  },
  {
    key: 'monk',
    name: 'Monk',
    pillar: 'MINDFULNESS PILLAR',
    archetype: 'Stoic Mystic',
    icon: '🧘',
    pillarColor: colors.mindfulness,
    buffLabel: '+10% CRITICAL CHANCE',
    buffDesc: 'Sharp stoic mindset and evening reflections grant unpredictable lethal strikes.',
    quote: '"Control your mind, and you conquer every battlefield."',
    forms: [
      { tier: 1, name: 'Stoic Novice', day: 1 },
      { tier: 2, name: 'Clarity Seeker', day: 7 },
      { tier: 3, name: 'Mind Centurion', day: 30 },
      { tier: 4, name: 'Ascended Monk', day: 90 },
    ],
  },
];

export default function CharacterSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedKey, setSelectedKey] = useState<CharacterKey>('titan');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingPlayer, setExistingPlayer] = useState<PlayerProfile | null>(null);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (user?.id) {
        const p = await fetchMyPlayerProfile(user.id);
        if (isMounted && p) {
          setExistingPlayer(p);
          setSelectedKey(p.characterKey);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const result = await chooseCharacter(selectedKey);
      if (result) {
        Alert.alert(
          '⚔️ Champion Locked',
          `You have chosen ${result.characterName} (${result.archetype}). Your discipline will forge your battle power.`,
          [{ text: 'Enter Arena', onPress: () => router.replace('/leaderboard') }]
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const activeChampion = CHAMPIONS.find((c) => c.key === selectedKey) || CHAMPIONS[0];

  return (
    <Screen scroll edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Text variant="body" color="primary">
            ← Back
          </Text>
        </Pressable>
        <Text variant="caption" color="textMuted">
          ARENA INITIATION
        </Text>
        <Text variant="title" weight="heavy">
          Choose Your <Text variant="title" weight="heavy" color="primary">CHAMPION</Text>
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.subtitle}>
          Your character&apos;s strength is directly powered by your real-life daily consistency.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 3 Champion Selection Cards */}
          <View style={styles.championsGrid}>
            {CHAMPIONS.map((champ) => {
              const isSelected = champ.key === selectedKey;
              return (
                <Pressable
                  key={champ.key}
                  onPress={() => setSelectedKey(champ.key)}
                  style={[
                    styles.champCard,
                    isSelected && { borderColor: champ.pillarColor, backgroundColor: colors.surfaceElevated },
                  ]}
                >
                  <View style={styles.iconCircle}>
                    <Text style={styles.champIconText}>{champ.icon}</Text>
                  </View>
                  <Text variant="bodySm" weight="heavy" style={{ marginTop: spacing.xs }}>
                    {champ.name}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ fontSize: 10 }}>
                    {champ.archetype}
                  </Text>
                  {isSelected && (
                    <View style={[styles.activeDot, { backgroundColor: champ.pillarColor }]} />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Active Champion Detail Card */}
          <Card elevated style={[styles.detailCard, { borderColor: activeChampion.pillarColor }]}>
            <View style={styles.detailHeader}>
              <View>
                <Badge
                  label={activeChampion.pillar}
                  tone="neutral"
                  style={{ backgroundColor: `${activeChampion.pillarColor}20`, alignSelf: 'flex-start' }}
                />
                <Text variant="title" weight="heavy" style={{ marginTop: spacing.xs }}>
                  {activeChampion.name}
                </Text>
                <Text variant="bodySm" color="textSecondary">
                  {activeChampion.archetype}
                </Text>
              </View>
              <Text style={styles.largeDetailIcon}>{activeChampion.icon}</Text>
            </View>

            <View style={[styles.buffBox, { borderColor: `${activeChampion.pillarColor}40` }]}>
              <View style={styles.buffRow}>
                <Icon name="zap" size={16} color={activeChampion.pillarColor} />
                <Text variant="caption" weight="heavy" style={{ color: activeChampion.pillarColor }}>
                  {activeChampion.buffLabel}
                </Text>
              </View>
              <Text variant="caption" color="textSecondary" style={styles.buffDesc}>
                {activeChampion.buffDesc}
              </Text>
            </View>

            <Text variant="caption" color="textMuted" style={styles.quoteText}>
              {activeChampion.quote}
            </Text>

            {/* 4-Tier Evolution Roadmap */}
            <Text variant="caption" weight="bold" color="textMuted" style={styles.evolutionHeader}>
              90-DAY EVOLUTION FORMS
            </Text>
            <View style={styles.evolutionRow}>
              {activeChampion.forms.map((form) => (
                <View key={form.tier} style={styles.evolutionStep}>
                  <Badge label={`Day ${form.day}`} tone={form.day === 1 ? 'primary' : 'neutral'} />
                  <Text variant="caption" weight="semibold" align="center" style={{ fontSize: 10, marginTop: 4 }}>
                    {form.name}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Action CTA */}
          <View style={styles.actionContainer}>
            <Button
              title={
                submitting
                  ? 'Locking Champion...'
                  : existingPlayer?.characterKey === selectedKey
                  ? 'Keep Current Champion'
                  : '⚔️ Lock In Champion & Enter Arena'
              }
              variant="primary"
              onPress={handleConfirm}
              disabled={submitting}
            />
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  championsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  champCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  champIconText: {
    fontSize: 24,
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  detailCard: {
    padding: spacing.lg,
    borderWidth: 2,
    marginBottom: spacing.lg,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  largeDetailIcon: {
    fontSize: 48,
  },
  buffBox: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  buffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  buffDesc: {
    lineHeight: 16,
  },
  quoteText: {
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  evolutionHeader: {
    letterSpacing: 1,
    fontSize: 10,
    marginBottom: spacing.sm,
  },
  evolutionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  evolutionStep: {
    flex: 1,
    alignItems: 'center',
  },
  actionContainer: {
    marginBottom: spacing.xl,
  },
});
