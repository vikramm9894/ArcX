import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Screen, Button, Card, Badge, Divider } from '@/components/ui';
import { colors, spacing, radius, fontWeight } from '@/theme';
import { isSupabaseConfigured } from '@/lib/env';
import { useAuth } from '@/providers';

const PILLARS = [
  {
    key: 'fitness',
    label: 'Fitness & Workouts',
    color: colors.fitness,
    blurb: 'Log every session, track volume, build the body that shows up.',
  },
  {
    key: 'discipline',
    label: 'Habits & Discipline',
    color: colors.discipline,
    blurb: 'Daily check-offs, live streaks, and a completion ring that keeps you honest.',
  },
  {
    key: 'mindfulness',
    label: 'Mindfulness & Journal',
    color: colors.mindfulness,
    blurb: 'Mood, gratitude, and reflection — the internal side of the arc.',
  },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const { session, isOnboarded } = useAuth();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <Badge label="90 DAYS · ZERO EXCUSES" tone="primary" />
        <Text variant="display" weight="heavy" style={styles.wordmark}>
          Winter<Text variant="display" weight="heavy" color="primary">ARC</Text>
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={styles.tagline}>
          One season. One promise. A version of you the spring won&apos;t recognise.
        </Text>
      </View>

      <View style={styles.pillars}>
        {PILLARS.map((p) => (
          <Card key={p.key} style={styles.pillar}>
            <View style={styles.pillarRow}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text variant="subheading" weight="semibold">
                {p.label}
              </Text>
            </View>
            <Text variant="bodySm" color="textSecondary" style={styles.pillarBlurb}>
              {p.blurb}
            </Text>
          </Card>
        ))}
      </View>

      {!isSupabaseConfigured && (
        <Card style={styles.notice} elevated>
          <Badge label="SETUP NEEDED" tone="warning" />
          <Text variant="subheading" weight="semibold" style={styles.noticeTitle}>
            Backend not connected yet
          </Text>
          <Text variant="bodySm" color="textSecondary">
            Add your Supabase project URL and anon key to a{' '}
            <Text variant="bodySm" color="textPrimary" weight="semibold">
              .env
            </Text>{' '}
            file in the project root, then restart the dev server.
          </Text>
        </Card>
      )}

      <Divider />

      <View style={styles.actions}>
        {session ? (
          <>
            <Badge
              label={`LOGGED IN AS ${session.user.email ?? 'USER'}`}
              tone="success"
              style={{ alignSelf: 'center' }}
            />
            <Button
              title={isOnboarded ? 'Resume My Arc →' : 'Complete Arc Setup →'}
              onPress={() => router.push(isOnboarded ? '/dashboard' : '/onboarding')}
            />
          </>
        ) : (
          <>
            <Button
              title="Start My Arc"
              disabled={!isSupabaseConfigured}
              onPress={() => router.push('/sign-up')}
            />
            <Button
              title="I already have an account"
              variant="ghost"
              disabled={!isSupabaseConfigured}
              onPress={() => router.push('/sign-in')}
            />
          </>
        )}
      </View>

      <Text variant="caption" color="textMuted" align="center" style={styles.footer}>
        Phase 1 · Auth &amp; Onboarding
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
  },
  wordmark: { letterSpacing: -1 },
  tagline: { maxWidth: 300 },
  pillars: { gap: spacing.md, paddingBottom: spacing.xl },
  pillar: { gap: spacing.sm },
  pillarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  pillarBlurb: { lineHeight: 20 },
  notice: { gap: spacing.md, marginBottom: spacing.lg },
  noticeTitle: { marginTop: spacing.xs },
  actions: { gap: spacing.md, paddingTop: spacing.lg },
  footer: { paddingTop: spacing['2xl'], paddingBottom: spacing.lg, fontWeight: fontWeight.medium },
});
