import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/src/context/AuthContext';
import { NotificationProvider } from '@/src/context/NotificationContext';
import {
  Inter_400Regular, Inter_500Medium,
  Inter_600SemiBold, Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 1000 * 60 * 5 },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function loadFontsAndStart() {
      // ── Inter ──────────────────────────────────────────────────────────────
      try {
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        });
        console.log('[fonts] Inter loaded OK');
      } catch (e) {
        console.warn('[fonts] Inter load error:', String(e));
      }

      // ── Feather (local copy — avoids pnpm symlink issues) ─────────────────
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const src = require('../assets/fonts/Feather.ttf');
        console.log('[fonts] Feather asset src type:', typeof src, '| value:', src);
        await Font.loadAsync({ feather: src });
        console.log('[fonts] Feather loaded OK | isLoaded:', Font.isLoaded('feather'));
      } catch (e) {
        console.warn('[fonts] Feather load error:', String(e));
      }

      setAppReady(true);
      SplashScreen.hideAsync();
    }

    loadFontsAndStart();
  }, []);

  if (!appReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <PaperProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <RootLayoutNav />
                  </NotificationProvider>
                </AuthProvider>
              </PaperProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
