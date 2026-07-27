import React, { useEffect, useRef } from 'react';
import {
  Animated, Image, Platform, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const ring1  = useRef(new Animated.Value(0)).current;
  const ring2  = useRef(new Animated.Value(0)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoSc = useRef(new Animated.Value(0.7)).current;
  const textOp = useRef(new Animated.Value(0)).current;
  const textY  = useRef(new Animated.Value(16)).current;

  useEffect(() => {
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
        Animated.timing(textOp, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(textY,  { toValue: 0, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    const t = setTimeout(() => router.replace('/(auth)/login'), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <TouchableOpacity
      style={[styles.root, { paddingBottom: insets.bottom + 32 }]}
      activeOpacity={1}
      onPress={() => router.replace('/(auth)/login')}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F1117" />

      {/* Decorative rings */}
      <Animated.View style={[styles.ring, styles.ringOuter, {
        opacity: ring2,
        transform: [{ scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }]} />
      <Animated.View style={[styles.ring, styles.ringInner, {
        opacity: ring1,
        transform: [{ scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }]} />

      {/* Round logo */}
      <Animated.View style={[styles.logoCircle, {
        opacity: logoOp,
        transform: [{ scale: logoSc }],
      }]}>
        <Image
          source={require('../../assets/images/logo_clean.png')}
          style={styles.logoImg}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textBlock, {
        opacity: textOp,
        transform: [{ translateY: textY }],
      }]}>
        <Text style={styles.appName}>GoFixCarz</Text>
        <Text style={styles.subtitle}>Partner Portal</Text>
        <View style={styles.tapHint}>
          <Text style={styles.tapText}>Tap anywhere to continue</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#0F1117',
    alignItems: 'center', justifyContent: 'center', gap: 28,
  },

  ring: {
    position: 'absolute', borderRadius: 9999, borderWidth: 1,
  },
  ringOuter: {
    width: 230, height: 230,
    borderColor: 'rgba(37,99,235,0.18)',
  },
  ringInner: {
    width: 175, height: 175,
    borderColor: 'rgba(37,99,235,0.28)',
  },

  logoCircle: {
    width: 124, height: 124, borderRadius: 62,
    overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.12)',
    ...Platform.select({
      ios: { shadowColor: '#C41E3A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20 },
      android: { elevation: 16 },
      default: {},
    }),
  },
  logoImg: { width: '100%', height: '100%' },

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
  tapHint: { marginTop: 12 },
  tapText: {
    fontSize: 12, color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.5,
  },
});
