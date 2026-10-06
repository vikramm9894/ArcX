import type { ReactNode } from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '@/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<ButtonSize, { height: number; px: number; font: number }> = {
  sm: { height: 40, px: spacing.lg, font: fontSize.sm },
  md: { height: 50, px: spacing.xl, font: fontSize.md },
  lg: { height: 58, px: spacing['2xl'], font: fontSize.lg },
};

function variantColors(variant: ButtonVariant, disabled: boolean) {
  if (disabled) {
    return { bg: colors.surfaceElevated, border: colors.border, text: colors.textMuted };
  }
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, border: colors.primary, text: colors.textInverse };
    case 'secondary':
      return { bg: colors.surface, border: colors.border, text: colors.textPrimary };
    case 'ghost':
      return { bg: colors.transparent, border: colors.transparent, text: colors.primary };
    case 'danger':
      return { bg: colors.dangerSoft, border: colors.danger, text: colors.danger };
  }
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  ...rest
}: ButtonProps) {
  const sz = SIZES[size];
  const isDisabled = disabled || loading;
  const vc = variantColors(variant, isDisabled);

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: sz.height,
          paddingHorizontal: sz.px,
          backgroundColor: vc.bg,
          borderColor: vc.border,
          opacity: pressed ? 0.82 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={vc.text} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text
            style={{ color: vc.text, fontSize: sz.font, fontWeight: fontWeight.semibold }}
          >
            {title}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
