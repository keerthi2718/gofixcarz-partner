import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Image,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import LoadingState from '@/src/components/ui/LoadingState';

const SPLASH_MS = 2600;
const BG        = '#0D0D0D';
const RED       = '#C62839';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />

        {/* ── Logo + text block ── */}
        <Animated.View style={[styles.middle, { opacity: fadeAnim }]}>

          {/* Red glow layers behind the logo */}
          <View style={styles.glowWrap} pointerEvents="none">
            <View style={styles.glowOuter} />
            <View style={styles.glowMid} />
            <View style={styles.glowCore} />
          </View>

          {/* Logo — contain so full circular logo is never cropped */}
          <Image
            source={require('../assets/images/logo_clean.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Text */}
          <Text style={styles.title}>Garage Owner Portal</Text>
          <Text style={styles.subtitle}>SMART GARAGE MANAGEMENT</Text>
        </Animated.View>

        {/* ── Spinner pinned near bottom ── */}
        <Animated.View style={[styles.spinnerWrap, { opacity: fadeAnim, bottom: Math.max(insets.bottom + 48, 64) }]}>
          <ActivityIndicator size="small" color={RED} />
        </Animated.View>
      </View>
    );
  }

  if (isLoading) return <LoadingState message="Loading..." />;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  middle: {
    alignItems: 'center',
  },

  /* ── Glow ── */
  glowWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    /* push it to sit behind the logo — centred on the logo */
    top: -30,
  },
  glowOuter: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(180,20,30,0.10)',
  },
  glowMid: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(198,40,57,0.18)',
  },
  glowCore: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(198,40,57,0.22)',
  },

  /* ── Logo ── */
  logo: {
    width: 180,
    height: 180,
    marginBottom: 36,
  },

  /* ── Text ── */
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A8F98',
    letterSpacing: 3,
    textAlign: 'center',
  },

  /* ── Spinner ── */
  spinnerWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
});
