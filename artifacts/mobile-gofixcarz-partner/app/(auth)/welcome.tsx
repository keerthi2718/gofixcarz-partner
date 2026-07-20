import React from 'react';
import {
  Dimensions, Platform, StatusBar, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const NAVY = '#1B3A6B';
const ORANGE = '#FF6B2B';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <Feather name="tool" size={44} color={ORANGE} />
        </View>
        <Text style={styles.brand}>GoFixCarz</Text>
        <Text style={styles.partnerTag}>Partner</Text>
        <Text style={styles.tagline}>Manage your garage, bookings and jobs — all in one place.</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          { icon: 'calendar' as const, text: 'Track bookings in real-time' },
          { icon: 'clipboard' as const, text: 'Manage job cards end-to-end' },
          { icon: 'trending-up' as const, text: 'Monitor revenue & analytics' },
        ].map(({ icon, text }) => (
          <View key={text} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Feather name={icon} size={16} color={ORANGE} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Sign In</Text>
        </TouchableOpacity>
        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={{ color: ORANGE }}>Terms of Service</Text> and{' '}
          <Text style={{ color: ORANGE }}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, paddingHorizontal: 28 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoWrap: {
    width: 88, height: 88, borderRadius: 24,
    backgroundColor: 'rgba(255,107,43,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    ...(Platform.OS === 'ios' ? {
      shadowColor: ORANGE, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3, shadowRadius: 20,
    } : {}),
  },
  brand: {
    fontSize: 36, fontWeight: '800' as const,
    color: '#fff', letterSpacing: -1,
  },
  partnerTag: {
    fontSize: 18, fontWeight: '600' as const,
    color: ORANGE, letterSpacing: 2, textTransform: 'uppercase' as const,
  },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.65)',
    textAlign: 'center' as const, lineHeight: 22,
    marginTop: 12, paddingHorizontal: 16,
  },
  features: { gap: 14, marginBottom: 32 },
  featureRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
  featureIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,107,43,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, flex: 1 },
  ctas: { gap: 12 },
  btnPrimary: {
    backgroundColor: ORANGE, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center' as const,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  btnSecondary: {
    borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1.5,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center' as const,
  },
  btnSecondaryText: { color: '#fff', fontSize: 16, fontWeight: '600' as const },
  terms: {
    fontSize: 12, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center' as const, lineHeight: 18, marginTop: 4,
  },
});
