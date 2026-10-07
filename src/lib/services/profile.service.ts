import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import type { ArcOnboardingData } from '@/lib/types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const PROFILE_STORAGE_KEY_PREFIX = '@arc_profile_';

/**
 * Fetch profile with fallback to local cache
 */
export async function fetchUserProfile(userId: string): Promise<ProfileRow | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        await AsyncStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
        return data;
      }
    } catch {
      // Fallback
    }
  }

  const local = await AsyncStorage.getItem(`${PROFILE_STORAGE_KEY_PREFIX}${userId}`);
  if (local) {
    try {
      return JSON.parse(local) as ProfileRow;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Update or save Arc profile upon onboarding completion
 */
export async function syncOnboardingProfile(
  userId: string,
  email: string | null,
  onboarding: ArcOnboardingData,
): Promise<ProfileRow> {
  const profile: ProfileRow = {
    id: userId,
    email,
    full_name: email?.split('@')[0] ?? 'Arc Challenger',
    goal: onboarding.goal,
    focus_pillar: onboarding.focusPillar,
    start_date: onboarding.startDate,
    duration_days: onboarding.durationDays,
    current_streak: 1,
    longest_streak: 1,
    is_onboarded: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Local storage
  await AsyncStorage.setItem(`${PROFILE_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(profile));

  // Sync to Supabase
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email,
          full_name: profile.full_name,
          goal: profile.goal,
          focus_pillar: profile.focus_pillar,
          start_date: profile.start_date,
          duration_days: profile.duration_days,
          is_onboarded: true,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (data) return data;
    } catch (err) {
      console.warn('Could not upsert profile in Supabase', err);
    }
  }

  return profile;
}
