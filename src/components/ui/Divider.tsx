import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { colors, spacing } from '@/theme';
import { Text } from './Text';

export interface DividerProps {
  label?: string;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ label, spacing: gap = spacing.lg, style }: DividerProps) {
  if (label) {
    return (
      <View style={[styles.labeled, { marginVertical: gap }, style]}>
        <View style={styles.line} />
        <Text variant="caption" color="textMuted" style={styles.label}>
          {label}
        </Text>
        <View style={styles.line} />
      </View>
    );
  }
  return <View style={[styles.plain, { marginVertical: gap }, style]} />;
}

const styles = StyleSheet.create({
  plain: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  labeled: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  label: { textTransform: 'uppercase', letterSpacing: 1 },
});
