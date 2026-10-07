import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { colors, radius, spacing } from '@/theme';

export interface ActivityHeatmapProps {
  /** Array of ISO date strings (YYYY-MM-DD) that had activity */
  activityDates: Record<string, number>; // date -> activity intensity (1, 2, 3, etc.)
  startDate?: string;
  totalDays?: number;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getIntensityColor(count: number): string {
  if (count <= 0) return colors.surfaceElevated;
  if (count === 1) return '#1E3A8A'; // Deep frost
  if (count === 2) return '#2563EB'; // Ice blue
  if (count === 3) return '#38BDF8'; // Bright cyan
  return '#7DD3FC'; // Radiant glacial white-blue
}

export function ActivityHeatmap({
  activityDates,
  startDate,
  totalDays = 90,
}: ActivityHeatmapProps) {
  const [selectedDay, setSelectedDay] = useState<{ date: string; count: number } | null>(null);

  // Generate 90-day matrix organized into 13 weeks (columns) of 7 days (rows)
  const weeks = useMemo(() => {
    const base = startDate ? new Date(startDate) : new Date();
    // Normalize to today minus some days or start date
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);

    const cols: { date: string; count: number; isFuture: boolean }[][] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    let currentWeek: { date: string; count: number; isFuture: boolean }[] = [];

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const d = new Date(start);
      d.setDate(start.getDate() + dayOffset);
      const iso = d.toISOString().split('T')[0];
      const count = activityDates[iso] ?? 0;
      const isFuture = iso > todayStr;

      currentWeek.push({
        date: iso,
        count: isFuture ? 0 : count,
        isFuture,
      });

      if (currentWeek.length === 7 || dayOffset === totalDays - 1) {
        cols.push(currentWeek);
        currentWeek = [];
      }
    }

    return cols;
  }, [startDate, totalDays, activityDates]);

  const activeDaysCount = Object.keys(activityDates).filter((d) => (activityDates[d] ?? 0) > 0).length;

  return (
    <Card style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text variant="subheading" weight="bold">
            90-Day Arc Matrix
          </Text>
          <Text variant="caption" color="textMuted">
            {activeDaysCount} of {totalDays} days forged in discipline
          </Text>
        </View>

        {selectedDay && (
          <View style={styles.selectionPill}>
            <Text variant="caption" weight="bold" color="primary">
              {selectedDay.date}: {selectedDay.count} logged
            </Text>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridScroll}>
        <View style={styles.matrixContainer}>
          {/* Day label indicators */}
          <View style={styles.dayLabelsCol}>
            {DAYS_OF_WEEK.map((lbl, i) => (
              <Text key={i} variant="caption" color="textMuted" style={styles.dayLabel}>
                {lbl}
              </Text>
            ))}
          </View>

          {/* Week columns */}
          <View style={styles.weeksRow}>
            {weeks.map((week, wIdx) => (
              <View key={wIdx} style={styles.weekCol}>
                {week.map((day) => {
                  const bg = day.isFuture
                    ? colors.surface
                    : getIntensityColor(day.count);
                  const isSelected = selectedDay?.date === day.date;

                  return (
                    <Pressable
                      key={day.date}
                      onPress={() => setSelectedDay(day)}
                      style={[
                        styles.cell,
                        { backgroundColor: bg },
                        isSelected && styles.cellSelected,
                        day.isFuture && styles.cellFuture,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text variant="caption" color="textMuted">
          LESS
        </Text>
        <View style={[styles.legendCell, { backgroundColor: colors.surfaceElevated }]} />
        <View style={[styles.legendCell, { backgroundColor: '#1E3A8A' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#2563EB' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#38BDF8' }]} />
        <View style={[styles.legendCell, { backgroundColor: '#7DD3FC' }]} />
        <Text variant="caption" color="textMuted">
          MAX
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  gridScroll: {
    paddingVertical: spacing.xs,
  },
  matrixContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayLabelsCol: {
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  dayLabel: {
    height: 12,
    fontSize: 9,
    lineHeight: 12,
  },
  weeksRow: {
    flexDirection: 'row',
    gap: 4,
  },
  weekCol: {
    gap: 4,
  },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  cellSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cellFuture: {
    opacity: 0.3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
