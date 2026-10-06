import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text, Screen, Button, Badge } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * Placeholder route — full email/password auth lands in Phase 1.
 * Exists now so the welcome screen's typed navigation resolves.
 */
export default function SignUpScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Badge label="PHASE 1" tone="primary" />
        <Text variant="heading" weight="semibold">
          Create your account
        </Text>
        <Text variant="bodySm" color="textSecondary" align="center">
          Email/password sign-up, the Arc onboarding flow, and starter habit seeding arrive in the
          next phase.
        </Text>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
});
