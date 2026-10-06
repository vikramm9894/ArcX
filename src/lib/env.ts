/**
 * Centralized environment access. Expo inlines `EXPO_PUBLIC_*` vars at build
 * time, so these must be prefixed accordingly in `.env`.
 *
 * The app is designed to boot even when Supabase isn't configured yet — the
 * UI shows a setup notice instead of crashing — so we expose a flag rather
 * than throwing at import time.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

function isValid(value: string): boolean {
  return value.length > 0 && !value.startsWith('your-') && value !== 'changeme';
}

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
} as const;

export const isSupabaseConfigured = isValid(url) && isValid(anonKey);
