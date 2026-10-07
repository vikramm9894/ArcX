import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { colors } from '@/theme';
import { AppProviders } from '@/providers';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Hide splash once the app boots
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
        <Stack.Screen name="sign-in" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="sign-up" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="dashboard" options={{ animation: 'fade' }} />
      </Stack>
    </AppProviders>
  );
}
