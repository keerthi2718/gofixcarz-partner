import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, Platform, StatusBar,
  StyleSheet, Text, View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import LoadingState from '@/src/components/ui/LoadingState';

const SPLASH_MS = 2400;

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);

  const ring1   = useRef(new Animated.Value(0)).current;
  const ring2   = useRef(new Animated.Value(0)).current;
  const logoOp  = useRef(new Animated.Value(0)).current;
  const logoSc  = useRef(new Animated.Value(0.7)).current;
  const textOp  = useRef(new Animated.Value(0)).current;
  const textY   = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    // Ring pulse → logo pop → text slide
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ring1, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(logoOp,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoSc,  { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOp,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(textY,   { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    const t = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0F1117" />

        {/* Decorative rings behind the logo */}
        <Animated.View style={[styles.ring, styles.ringOuter, { opacity: ring2, transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]} />
        <Animated.View style={[styles.ring, styles.ringInner, { opacity: ring1, transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]} />

        {/* Round logo */}
        <Animated.View style={[styles.logoCircle, { opacity: logoOp, transform: [{ scale: logoSc }] }]}>
          <Image
            source={require('../assets/images/logo_clean.png')}
            style={styles.logoImg}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Text */}
        <Animated.View style={[styles.textBlock, { opacity: textOp, transform: [{ translateY: textY }] }]}>
          <Text style={styles.appName}>GoFixCarz</Text>
          <Text style={styles.subtitle}>Partner Portal</Text>
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
    flex: 1, backgroundColor: '#0F1117',
    alignItems: 'center', justifyContent: 'center', gap: 28,
  },

  /* Decorative rings */
  ring: {
    position: 'absolute', borderRadius: 9999, borderWidth: 1,
  },
  ringOuter: {
    width: 220, height: 220,
    borderColor: 'rgba(37,99,235,0.18)',
  },
  ringInner: {
    width: 170, height: 170,
    borderColor: 'rgba(37,99,235,0.28)',
  },

  /* Round logo */
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20 },
      android: { elevation: 16 },
      default: {},
    }),
  },
  logoImg: { width: '100%', height: '100%' },

  /* Text */
  textBlock: { alignItems: 'center', gap: 6 },
  appName: {
    fontSize: 28, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13, fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
});
