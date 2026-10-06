import {
  spacing,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  shadow,
  duration,
} from './tokens';
import { colors, palette, categoryColors } from './colors';

/**
 * The single theme object consumed across the app. WinterARC is dark-only
 * by design (the "cold" aesthetic), so this is a static theme — but routing
 * everything through `useTheme()` keeps the door open for future variants.
 */
export const theme = {
  colors,
  palette,
  categoryColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  shadow,
  duration,
} as const;

export type Theme = typeof theme;

/** Hook form for ergonomic consumption inside components. */
export function useTheme(): Theme {
  return theme;
}

export { colors, palette, categoryColors } from './colors';
export {
  spacing,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  shadow,
  duration,
} from './tokens';
export type { ColorToken } from './colors';
export type { Spacing, Radius, FontSize, FontWeight } from './tokens';
