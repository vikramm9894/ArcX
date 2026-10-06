import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, fontSize, fontWeight, type ColorToken } from '@/theme';

type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontSize: fontSize['4xl'], fontWeight: fontWeight.heavy, letterSpacing: -0.6 },
  title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, letterSpacing: -0.4 },
  heading: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, letterSpacing: -0.2 },
  subheading: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular },
  bodySm: { fontSize: fontSize.sm, fontWeight: fontWeight.regular },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: ColorToken;
  weight?: keyof typeof fontWeight;
  align?: TextStyle['textAlign'];
  muted?: boolean;
}

export function Text({
  variant = 'body',
  color,
  weight,
  align,
  muted,
  style,
  ...rest
}: TextProps) {
  const resolvedColor = color
    ? colors[color]
    : muted
      ? colors.textMuted
      : colors.textPrimary;

  return (
    <RNText
      style={[
        VARIANTS[variant],
        { color: resolvedColor },
        weight ? { fontWeight: fontWeight[weight] } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
