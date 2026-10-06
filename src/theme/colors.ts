/**
 * WinterARC color system — a cold, disciplined, dark-first palette.
 * Raw palette values live in `palette`; the app should consume the
 * semantic `colors` map so we can retune without touching components.
 */

export const palette = {
  // Neutrals — deep slate/ink with a cold blue bias
  ink950: '#070A0F',
  ink900: '#0A0E14',
  ink850: '#0E131B',
  ink800: '#141A24',
  ink700: '#1A2230',
  ink600: '#232D3B',
  ink500: '#2E3A4B',
  slate400: '#6B7889',
  slate300: '#8A98A9',
  slate200: '#9AA7B8',
  slate100: '#C4CEDA',
  frost50: '#E8EEF5',
  white: '#FFFFFF',

  // Brand — ice / frost blue
  frostBlue600: '#2563EB',
  frostBlue500: '#3B82F6',
  frostBlue400: '#4EA8FF',
  frostBlue300: '#7FC0FF',
  cyan400: '#38BDF8',

  // Status
  green500: '#22C55E',
  green400: '#34D399',
  amber400: '#FBBF24',
  red500: '#EF4444',
  red400: '#F87171',

  // Category accents (focus areas)
  orange500: '#F97316', // fitness
  blue500: '#3B82F6', // discipline
  violet400: '#A78BFA', // mindfulness
} as const;

export const colors = {
  // Surfaces
  background: palette.ink900,
  backgroundElevated: palette.ink850,
  surface: palette.ink800,
  surfaceElevated: palette.ink700,
  overlay: 'rgba(5, 8, 13, 0.72)',

  // Borders / separators
  border: palette.ink600,
  borderSubtle: palette.ink700,
  borderStrong: palette.ink500,

  // Text
  textPrimary: palette.frost50,
  textSecondary: palette.slate200,
  textMuted: palette.slate400,
  textInverse: palette.ink900,

  // Brand
  primary: palette.frostBlue500,
  primaryHover: palette.frostBlue600,
  primarySoft: 'rgba(59, 130, 246, 0.14)',
  accent: palette.cyan400,

  // Status
  success: palette.green400,
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warning: palette.amber400,
  warningSoft: 'rgba(251, 191, 36, 0.14)',
  danger: palette.red400,
  dangerSoft: 'rgba(248, 113, 113, 0.14)',

  // Focus-area categories
  fitness: palette.orange500,
  discipline: palette.blue500,
  mindfulness: palette.violet400,

  // Misc
  ring: palette.frostBlue400,
  shadow: '#000000',
  transparent: 'transparent',
} as const;

/** Category -> color helper for habits/workouts/journal tagging. */
export const categoryColors: Record<string, string> = {
  fitness: colors.fitness,
  discipline: colors.discipline,
  mindfulness: colors.mindfulness,
};

export type ColorToken = keyof typeof colors;
