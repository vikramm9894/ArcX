import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { colors } from '@/theme';
import { AppProviders } from '@/providers';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Providers restore the session synchronously enough that we can hide the
    // splash on mount; a future auth-gate can delay this until `initializing`.
    SplashScreen.hideAsync();
  }, []);

  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </AppProviders>
  );
}
