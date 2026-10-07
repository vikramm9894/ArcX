import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';
import type { Database } from './database.types';

const authStorage: SupportedStorage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

/**
 * Supabase client configured for React Native & Web:
 *  - AsyncStorage persists the session across app launches
 *  - autoRefreshToken keeps the JWT fresh
 *  - detectSessionInUrl is off (no browser redirect flow on native)
 *
 * When env vars are missing we still construct a client against a harmless
 * placeholder so imports never throw; callers must check `isSupabaseConfigured`
 * before relying on network calls.
 */
export const supabase = createClient<Database>(
  isSupabaseConfigured ? env.supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? env.supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      storage: authStorage,
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
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  AppState.addEventListener('change', (state) => {
    if (!isSupabaseConfigured) return;
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export { isSupabaseConfigured };
