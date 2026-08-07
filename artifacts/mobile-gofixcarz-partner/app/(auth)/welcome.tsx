import React, { useEffect, useRef } from 'react';
import {
  Animated, Image, Platform, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY  = '#2563EB';
const PRIMARY2 = '#1E40AF';
const PRIMARY3 = '#1E3A8A';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  /* ── animation refs ── */
  const ring1Scale = useRef(new Animated.Value(0.5)).current;
  const ring1Op    = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Op    = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0.5)).current;
  const ring3Op    = useRef(new Animated.Value(0)).current;

  const logoBg     = useRef(new Animated.Value(0)).current;
  const logoScale  = useRef(new Animated.Value(0.6)).current;
  const logoOp     = useRef(new Animated.Value(0)).current;

  const textOp     = useRef(new Animated.Value(0)).current;
  const textY      = useRef(new Animated.Value(20)).current;
  const subtitleOp = useRef(new Animated.Value(0)).current;

  const dotOp      = useRef(new Animated.Value(0)).current;
  const dotScale   = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.sequence([
      /* 1. Rings expand in stagger */
      Animated.stagger(120, [
        Animated.parallel([
          Animated.spring(ring1Scale, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
          Animated.timing(ring1Op,    { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(ring2Scale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
          Animated.timing(ring2Op,    { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(ring3Scale, { toValue: 1, friction: 5, tension: 30, useNativeDriver: true }),
          Animated.timing(ring3Op,    { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
      /* 2. Logo pops in */
      Animated.parallel([
        Animated.timing(logoBg,    { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
        Animated.timing(logoOp,    { toValue: 1, duration: 280, useNativeDriver: true }),
      ]),
      /* 3. Brand name slides up */
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(textY,  { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
      /* 4. Subtitle fades in */
      Animated.timing(subtitleOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      /* 5. Bottom indicator */
      Animated.parallel([
        Animated.timing(dotOp,    { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(dotScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    const t = setTimeout(() => router.replace('/(auth)/login'), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <TouchableOpacity
      style={{ flex: 1 }}
      activeOpacity={1}
      onPress={() => router.replace('/(auth)/login')}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        locations={[0, 0.5, 1]}
        style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      >
        {/* ── Top brand chip ── */}
        <View style={styles.topChip}>
          <View style={styles.topChipDot} />
          <Text style={styles.topChipText}>SMART WORKSHOP MANAGER</Text>
        </View>

        {/* ── Centre — rings + logo ── */}
        <View style={styles.centreBlock}>
          {/* Decorative rings */}
          <Animated.View style={[styles.ring, styles.ring3, { opacity: ring3Op, transform: [{ scale: ring3Scale }] }]} />
          <Animated.View style={[styles.ring, styles.ring2, { opacity: ring2Op, transform: [{ scale: ring2Scale }] }]} />
          <Animated.View style={[styles.ring, styles.ring1, { opacity: ring1Op, transform: [{ scale: ring1Scale }] }]} />

          {/* White glow disc behind logo */}
          <Animated.View style={[styles.glowDisc, { opacity: logoBg }]} />

          {/* Logo */}
          <Animated.View style={[
            styles.logoWrap,
            { opacity: logoOp, transform: [{ scale: logoScale }] },
          ]}>
            <Image
              source={require('../../assets/images/logo_clean.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* ── Brand name ── */}
        <Animated.View style={[styles.brandBlock, { opacity: textOp, transform: [{ translateY: textY }] }]}>
          <Text style={styles.brandName}>GoFixCarz</Text>
          <Animated.View style={[styles.dividerRow, { opacity: subtitleOp }]}>
            <View style={styles.dividerLine} />
            <Text style={styles.tagline}>Partner Portal</Text>
            <View style={styles.dividerLine} />
          </Animated.View>
        </Animated.View>

        {/* ── Bottom indicator ── */}
        <Animated.View style={[styles.bottomArea, { opacity: dotOp, transform: [{ scale: dotScale }] }]}>
          <View style={styles.dotRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.tapHint}>Tap to continue</Text>
        </Animated.View>
      </LinearGradient>
    </TouchableOpacity>
  );
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
    marginTop: 16,
    backgroundColor: 'rgba(37,99,235,0.15)',
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.30)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  topChipDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  topChipText: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.8,
  },

  /* ── Centre block ── */
  centreBlock: {
    alignItems: 'center', justifyContent: 'center',
    width: 280, height: 280,
  },

  ring: {
    position: 'absolute', borderRadius: 9999,
    borderWidth: 1,
  },
  ring1: {
    width: 160, height: 160,
    borderColor: `rgba(37,99,235,0.45)`,
  },
  ring2: {
    width: 210, height: 210,
    borderColor: `rgba(37,99,235,0.25)`,
  },
  ring3: {
    width: 265, height: 265,
    borderColor: `rgba(37,99,235,0.12)`,
  },

  glowDisc: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.06)',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30 },
      android: { elevation: 0 },
      default: {},
    }),
  },

  logoWrap: {
    width: 118, height: 118, borderRadius: 59,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.90)',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.55, shadowRadius: 20 },
      android: { elevation: 20 },
      default: {},
    }),
  },
  logoImg: {
    width: 110, height: 110,
  },

  /* ── Brand text ── */
  brandBlock: {
    alignItems: 'center', gap: 14,
  },
  brandName: {
    fontSize: 36, fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.6, shadowRadius: 10 },
      default: {},
    }),
  },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  dividerLine: {
    width: 30, height: 1,
    backgroundColor: 'rgba(37,99,235,0.50)',
  },
  tagline: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 3, textTransform: 'uppercase',
  },

  /* ── Bottom indicator ── */
  bottomArea: {
    alignItems: 'center', gap: 12, marginBottom: 8,
  },
  dotRow: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dotActive: {
    width: 20, borderRadius: 3,
    backgroundColor: PRIMARY,
  },
  tapHint: {
    fontSize: 11, color: 'rgba(255,255,255,0.28)',
    letterSpacing: 0.8,
  },
});
