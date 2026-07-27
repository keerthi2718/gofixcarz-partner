import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
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

/** Load the Feather icon font in a way that reaches Android's Fabric text renderer.
 *
 * Android new-arch (Fabric) cannot see fonts loaded via the standard
 * Font.loadAsync / ReactFontManager.setTypeface() path that works on iOS.
 * The only path Fabric reads is fonts loaded from the APK assets folder via
 * Typeface.createFromAsset().  Expo Go ships all @expo/vector-icons fonts
 * inside its own APK at  assets/fonts/Feather.ttf, so we load from there
 * on Android using the asset:// scheme.  On iOS the standard path works fine.
 */
async function loadFeatherFont() {
  if (Platform.OS === 'android') {
    try {
      // Load directly from Expo Go's bundled APK assets — reaches Fabric.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ExpoFontLoader = require('expo-font/build/ExpoFontLoader').default;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { markLoaded } = require('expo-font/build/memory');
      await ExpoFontLoader.loadAsync('feather', 'asset://fonts/Feather.ttf');
      markLoaded('feather');
      console.log('[fonts] Feather loaded from APK assets (Android Fabric path)');
    } catch (e) {
      console.warn('[fonts] Feather APK-asset load failed, trying JS fallback:', String(e));
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        await Font.loadAsync({ feather: require('../assets/fonts/Feather.ttf') });
        console.log('[fonts] Feather JS fallback loaded OK');
      } catch (e2) {
        console.warn('[fonts] Feather JS fallback also failed:', String(e2));
      }
    }
  } else {
    // iOS — standard path works fine
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      await Font.loadAsync({ feather: require('../assets/fonts/Feather.ttf') });
      console.log('[fonts] Feather loaded OK (iOS)');
    } catch (e) {
      console.warn('[fonts] Feather load error (iOS):', String(e));
    }
  }
}

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
          Inter_400Regular, Inter_500Medium,
          Inter_600SemiBold, Inter_700Bold,
        });
      } catch (e) {
        console.warn('[fonts] Inter load error:', String(e));
      }

      // ── Feather ───────────────────────────────────────────────────────────
      await loadFeatherFont();

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
