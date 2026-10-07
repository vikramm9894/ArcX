import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ArcOnboardingData } from '@/lib/types';

interface AuthContextValue {
  /** Current Supabase session, or null when signed out. */
  session: Session | null;
  user: User | null;
  /** True until the persisted session has been restored from storage. */
  initializing: boolean;
  configured: boolean;
  /** True if the user has completed the Arc onboarding flow. */
  isOnboarded: boolean;
  arcData: ArcOnboardingData | null;
  completeOnboarding: (data: ArcOnboardingData) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ONBOARDING_STORAGE_KEY_PREFIX = '@arc_onboarding_';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(isSupabaseConfigured);
  const [arcData, setArcData] = useState<ArcOnboardingData | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const loadOnboardingState = async (currentUserId: string, currentUserMeta?: Record<string, unknown>) => {
    try {
      // 1. Check user_metadata from Supabase
      if (currentUserMeta?.onboarding) {
        const data = currentUserMeta.onboarding as ArcOnboardingData;
        setArcData(data);
        setIsOnboarded(true);
        return;
      }

      // 2. Fallback to AsyncStorage
      const stored = await AsyncStorage.getItem(`${ONBOARDING_STORAGE_KEY_PREFIX}${currentUserId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as ArcOnboardingData;
        setArcData(parsed);
        setIsOnboarded(true);
        return;
      }

      setArcData(null);
      setIsOnboarded(false);
    } catch {
      setArcData(null);
      setIsOnboarded(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let mounted = true;

    // Restore any persisted session before the first render decision.
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) {
          await loadOnboardingState(data.session.user.id, data.session.user.user_metadata);
        }
      })
      .finally(() => {
        if (mounted) setInitializing(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next?.user) {
        await loadOnboardingState(next.user.id, next.user.user_metadata);
      } else {
        setArcData(null);
        setIsOnboarded(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const completeOnboarding = useCallback(
    async (data: ArcOnboardingData) => {
      setArcData(data);
      setIsOnboarded(true);

      if (session?.user?.id) {
        // Persist in local storage
        await AsyncStorage.setItem(
          `${ONBOARDING_STORAGE_KEY_PREFIX}${session.user.id}`,
          JSON.stringify(data),
        );

        // Also persist to Supabase user metadata
        try {
          await supabase.auth.updateUser({
            data: { onboarding: data },
          });
        } catch (err) {
          console.warn('Could not sync onboarding to Supabase user_metadata', err);
        }
      }
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setArcData(null);
    setIsOnboarded(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      initializing,
      configured: isSupabaseConfigured,
      isOnboarded,
      arcData,
      completeOnboarding,
      signOut,
    }),
    [session, initializing, isOnboarded, arcData, completeOnboarding, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
