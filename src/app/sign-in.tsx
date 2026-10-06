import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Text, Screen, Button, Badge } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * Placeholder route — full email/password auth lands in Phase 1.
 * Exists now so the welcome screen's typed navigation resolves.
 */
export default function SignInScreen() {
  const router = useRouter();
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Badge label="PHASE 1" tone="primary" />
        <Text variant="heading" weight="semibold">
          Welcome back
        </Text>
        <Text variant="bodySm" color="textSecondary" align="center">
          Email/password sign-in, session restore, and auth-gated routing arrive in the next phase.
        </Text>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
});
