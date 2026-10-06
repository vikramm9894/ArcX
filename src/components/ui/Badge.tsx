import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '@/theme';
import { Text } from './Text';

type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceElevated, fg: colors.textSecondary },
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** Override colors directly (e.g. for category accents). */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, tone = 'neutral', color, style }: BadgeProps) {
  const t = TONES[tone];
  const bg = color ? `${color}22` : t.bg;
  const fg = color ?? t.fg;

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <Text style={{ color: fg, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
});
