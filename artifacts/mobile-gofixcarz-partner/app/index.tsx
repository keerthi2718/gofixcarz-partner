import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, Platform,
  StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import LoadingState from '@/src/components/ui/LoadingState';

// On web the 2.8 s splash is just dead time — skip it so the login screen
// appears immediately. Native keeps the full branded animation.
const SPLASH_MS = Platform.OS === 'web' ? 0 : 2800;
const CRIMSON   = '#C41E3A';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);
  const insets = useSafeAreaInsets();

  /* ── animation refs ── */
  const ring3Op    = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.4)).current;
  const ring2Op    = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.4)).current;
  const ring1Op    = useRef(new Animated.Value(0)).current;
  const ring1Scale = useRef(new Animated.Value(0.4)).current;

  const logoOp    = useRef(new Animated.Value(0.85)).current;
  const logoScale = useRef(new Animated.Value(0.80)).current;

  const titleOp = useRef(new Animated.Value(0)).current;
  const titleY  = useRef(new Animated.Value(18)).current;
  const tagOp   = useRef(new Animated.Value(0)).current;

  const barOp    = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      /* rings stagger in */
      Animated.stagger(100, [
        Animated.parallel([
          Animated.spring(ring3Scale, { toValue: 1, friction: 5, tension: 35, useNativeDriver: true }),
          Animated.timing(ring3Op,    { toValue: 1, duration: 380, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(ring2Scale, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
          Animated.timing(ring2Op,    { toValue: 1, duration: 380, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(ring1Scale, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
          Animated.timing(ring1Op,    { toValue: 1, duration: 380, useNativeDriver: true }),
        ]),
      ]),
      /* logo pops in */
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
        Animated.timing(logoOp,    { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      /* brand name slides up */
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(titleY,  { toValue: 0, duration: 320, useNativeDriver: true }),
      ]),
      /* tagline fades in */
      Animated.timing(tagOp, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();

    /* progress bar sweeps across (not native driver — width isn't supported) */
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(barOp,    { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(barWidth, { toValue: 1, duration: 1800, useNativeDriver: false }),
    ]).start();

    const t = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone) {
    return (
      <LinearGradient
        colors={['#120307', '#1C0509', '#28080D', '#120307']}
        locations={[0, 0.3, 0.7, 1]}
        style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <StatusBar barStyle="light-content" backgroundColor="#120307" />

        {/* ── Top pill chip ── */}
        <View style={styles.topChip}>
          <View style={styles.chipDot} />
          <Text style={styles.chipText}>SMART WORKSHOP MANAGER</Text>
        </View>

        {/* ── Centre: rings + logo ── */}
        <View style={styles.centre}>
          <Animated.View style={[styles.ring, styles.ringOuter,
            { opacity: ring3Op, transform: [{ scale: ring3Scale }] }]} />
          <Animated.View style={[styles.ring, styles.ringMid,
            { opacity: ring2Op, transform: [{ scale: ring2Scale }] }]} />
          <Animated.View style={[styles.ring, styles.ringInner,
            { opacity: ring1Op, transform: [{ scale: ring1Scale }] }]} />

          {/* Logo in a crisp white circle */}
          <Animated.View style={[styles.logoCircle,
            { opacity: logoOp, transform: [{ scale: logoScale }] }]}>
            <Image
              source={require('../assets/images/logo_clean.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* ── Brand text ── */}
        <Animated.View style={[styles.textBlock, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
          <Text style={styles.brandName}>GoFixCarz</Text>
          <Animated.View style={[styles.taglineRow, { opacity: tagOp }]}>
            <View style={styles.taglineLine} />
            <Text style={styles.taglineText}>Partner Portal</Text>
            <View style={styles.taglineLine} />
          </Animated.View>
        </Animated.View>

        {/* ── Bottom progress bar ── */}
        <View style={styles.barTrack}>
          <Animated.View style={[
            styles.barFill,
            {
              opacity: barOp,
              width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]} />
        </View>
      </LinearGradient>
    );
  }

  if (isLoading) return <LoadingState message="Loading..." />;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  /* ── Top chip ── */
  topChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 20,
    backgroundColor: 'rgba(196,30,58,0.14)',
    borderWidth: 1, borderColor: 'rgba(196,30,58,0.28)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  chipDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: CRIMSON,
  },
  chipText: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 1.8,
  },

  /* ── Centre block ── */
  centre: {
    width: 290, height: 290,
    alignItems: 'center', justifyContent: 'center',
  },

  ring: {
    position: 'absolute', borderRadius: 9999, borderWidth: 1,
  },
  ringInner: {
    width: 158, height: 158,
    borderColor: 'rgba(196,30,58,0.50)',
  },
  ringMid: {
    width: 212, height: 212,
    borderColor: 'rgba(196,30,58,0.28)',
  },
  ringOuter: {
    width: 272, height: 272,
    borderColor: 'rgba(196,30,58,0.13)',
  },

  logoCircle: {
    width: 124, height: 124, borderRadius: 62,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55,
        shadowRadius: 22,
      },
      android: { elevation: 20 },
      default: {},
    }),
  },
  logoImg: {
    width: 116, height: 116,
  },

  /* ── Brand text ── */
  textBlock: { alignItems: 'center', gap: 14 },
  brandName: {
    fontSize: 38, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -1.0,
    ...Platform.select({
      ios: {
        shadowColor: CRIMSON,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.55,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
  taglineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  taglineLine: {
    width: 28, height: 1,
    backgroundColor: 'rgba(196,30,58,0.55)',
  },
  taglineText: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 3.5, textTransform: 'uppercase',
  },

  /* ── Progress bar ── */
  barTrack: {
    width: 120, height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: CRIMSON,
    borderRadius: 1,
  },
});
