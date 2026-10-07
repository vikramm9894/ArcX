import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { Badge } from './Badge';
import { Divider } from './Divider';
import { colors, radius, spacing } from '@/theme';
import type { PillarAnalytics } from '@/lib/services/analytics.service';

export interface PillarBalanceCardProps {
  analytics: PillarAnalytics;
}

export function PillarBalanceCard({ analytics }: PillarBalanceCardProps) {
  const {
    disciplineIndex,
    tierLabel,
    fitnessScore,
    disciplineScore,
    mindsetScore,
    tacticalAdvice,
  } = analytics;

  return (
    <Card elevated style={styles.card}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View>
          <Text variant="caption" color="textMuted">
            TELEMETRY &amp; HARMONY
          </Text>
          <Text variant="subheading" weight="bold">
            Discipline Index
          </Text>
        </View>
        <View style={styles.scoreBadgeWrapper}>
          <Text variant="title" weight="heavy" color="primary">
            {disciplineIndex}
          </Text>
          <Badge
            label={tierLabel}
            tone={disciplineIndex >= 85 ? 'success' : disciplineIndex >= 70 ? 'primary' : 'warning'}
          />
        </View>
      </View>

      <Divider spacing={spacing.xs} />

      {/* 3 Pillars Breakdown Progress Bars */}
      <View style={styles.pillarsBreakdown}>
        {/* Fitness */}
        <View style={styles.pillarItem}>
          <View style={styles.pillarLabelRow}>
            <View style={styles.pillarNameDot}>
              <View style={[styles.dot, { backgroundColor: colors.fitness }]} />
              <Text variant="bodySm" weight="semibold">
                Fitness
              </Text>
            </View>
            <Text variant="caption" weight="bold" color="fitness">
              {fitnessScore}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${fitnessScore}%`, backgroundColor: colors.fitness },
              ]}
            />
          </View>
        </View>

        {/* Discipline */}
        <View style={styles.pillarItem}>
          <View style={styles.pillarLabelRow}>
            <View style={styles.pillarNameDot}>
              <View style={[styles.dot, { backgroundColor: colors.discipline }]} />
              <Text variant="bodySm" weight="semibold">
                Discipline
              </Text>
            </View>
            <Text variant="caption" weight="bold" color="discipline">
              {disciplineScore}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${disciplineScore}%`, backgroundColor: colors.discipline },
              ]}
            />
          </View>
        </View>

        {/* Mindset */}
        <View style={styles.pillarItem}>
          <View style={styles.pillarLabelRow}>
            <View style={styles.pillarNameDot}>
              <View style={[styles.dot, { backgroundColor: colors.mindfulness }]} />
              <Text variant="bodySm" weight="semibold">
                Mindset
              </Text>
            </View>
            <Text variant="caption" weight="bold" color="mindfulness">
              {mindsetScore}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${mindsetScore}%`, backgroundColor: colors.mindfulness },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Tactical Coaching Advice */}
      <View style={styles.adviceBanner}>
        <Text variant="caption" weight="bold" color="primary">
          TACTICAL ADVICE:
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.adviceText}>
          {tacticalAdvice}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pillarsBreakdown: {
    gap: spacing.sm,
  },
  pillarItem: {
    gap: 4,
  },
  pillarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillarNameDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  track: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
  adviceBanner: {
    padding: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 2,
  },
  adviceText: {
    lineHeight: 16,
  },
});
