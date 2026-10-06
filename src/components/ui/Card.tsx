import type { ReactNode } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, radius, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, padded = true, elevated = false, style }: CardProps) {
  const content: ViewStyle[] = [
    styles.base,
    {
      backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
      padding: padded ? spacing.lg : 0,
    },
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [...content, { opacity: pressed ? 0.88 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[...content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
