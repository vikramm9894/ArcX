import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

/**
 * Supabase client configured for React Native:
 *  - AsyncStorage persists the session across app launches
 *  - autoRefreshToken keeps the JWT fresh
 *  - detectSessionInUrl is off (no browser redirect flow on native)
 *
 * When env vars are missing we still construct a client against a harmless
 * placeholder so imports never throw; callers must check `isSupabaseConfigured`
 * before relying on network calls.
 */
export const supabase = createClient(
  isSupabaseConfigured ? env.supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? env.supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Supabase recommends pausing token auto-refresh while the app is backgrounded
 * and resuming on foreground. Registered once at module load.
 */
AppState.addEventListener('change', (state) => {
  if (!isSupabaseConfigured) return;
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export { isSupabaseConfigured };
