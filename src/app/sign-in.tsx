import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Screen, Button, Input, Badge, Card } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/providers';

export default function SignInScreen() {
  const router = useRouter();
  const { isOnboarded } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase is not configured. Please check your .env file.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.session) {
        // Successful login: navigate to dashboard or onboarding
        if (isOnboarded) {
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text variant="bodySm" color="primary">
            ← Back
          </Text>
        </Pressable>
        <Badge label="DISCIPLINE PROTOCOL" tone="primary" />
        <Text variant="title" weight="heavy" style={styles.title}>
          Welcome Back
        </Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          Sign in to track your 90-day transformation and keep your streak alive.
        </Text>
      </View>

      <Card style={styles.formCard}>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Text variant="bodySm" color="danger">
              {errorMsg}
            </Text>
          </View>
        ) : null}

        <Input
          label="Email address"
          placeholder="champion@winterarc.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (errorMsg) setErrorMsg(null);
          }}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMsg) setErrorMsg(null);
          }}
        />

        <Button
          title="Sign In"
          loading={loading}
          onPress={handleSignIn}
          style={styles.submitBtn}
        />

        <View style={styles.footerRow}>
          <Text variant="bodySm" color="textSecondary">
            Don&apos;t have an account?{' '}
          </Text>
          <Link href="/sign-up" asChild>
            <Pressable>
              <Text variant="bodySm" color="primary" weight="semibold">
                Start your Arc
              </Text>
            </Pressable>
          </Link>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: {
    letterSpacing: -0.5,
  },
  subtitle: {
    lineHeight: 22,
  },
  formCard: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
});
