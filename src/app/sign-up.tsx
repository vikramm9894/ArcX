import { useState } from 'react';
import { useRouter, Link } from 'expo-router';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Screen, Button, Input, Badge, Card } from '@/components/ui';
import { colors, spacing, radius } from '@/theme';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSignUp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter an email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please choose a password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase is not configured. Please check your .env file.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.session) {
        // Logged in immediately -> go to Onboarding
        router.replace('/onboarding');
      } else if (data.user) {
        // Confirmation email sent
        setInfoMsg(
          'Confirmation link sent! Please check your email inbox to verify your account, then sign in.',
        );
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
        <Badge label="ARC INITIATION" tone="primary" />
        <Text variant="title" weight="heavy" style={styles.title}>
          Create Your Account
        </Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          Commit to 90 days of relentless growth. One season to change everything.
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

        {infoMsg ? (
          <View style={styles.infoBanner}>
            <Text variant="bodySm" color="success">
              {infoMsg}
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
          label="Password (min 6 characters)"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMsg) setErrorMsg(null);
          }}
        />

        <Input
          label="Confirm Password"
          placeholder="••••••••"
          secureTextEntry
          value={confirmPassword}
          onChangeText={(val) => {
            setConfirmPassword(val);
            if (errorMsg) setErrorMsg(null);
          }}
        />

        <Button
          title="Initiate Arc"
          loading={loading}
          onPress={handleSignUp}
          style={styles.submitBtn}
        />

        <View style={styles.footerRow}>
          <Text variant="bodySm" color="textSecondary">
            Already have an account?{' '}
          </Text>
          <Link href="/sign-in" asChild>
            <Pressable>
              <Text variant="bodySm" color="primary" weight="semibold">
                Sign In
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
  infoBanner: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
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
