import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Wrench, Shield, Star, Users } from 'lucide-react-native';
import { useAuth } from '@/src/context/AuthContext';

/* ── Shadow helper ── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  android: { elevation: 4 },
  default: {},
});

const SHADOW_LOGO = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

/* ── India flag SVG ── */
function IndiaFlag() {
  return (
    <Svg width={20} height={16} viewBox="0 0 512 512">
      <Path fill="#f98000" d="M0 85.3h512v113.8H0z" />
      <Path fill="#fff" d="M0 199.1h512v113.8H0z" />
      <Path fill="#008000" d="M0 312.9h512v113.8H0z" />
      <Circle cx={256} cy={256} r={40} fill="#000080" />
      <Circle cx={256} cy={256} r={32} fill="#fff" />
      <Path
        fill="#000080"
        d="M256 216l2 40-2 40-2-40zm0 80l-2-40 2-40 2 40zm40-40l-40 2-40-2 40-2zm-80 0l40-2 40 2-40 2zm28.3-28.3l28.3 28.3-28.3 28.3-28.3-28.3zm-56.6 56.6l28.3-28.3 28.3 28.3-28.3 28.3zm56.6 0l-28.3-28.3-28.3 28.3 28.3 28.3zm-56.6-56.6l28.3 28.3 28.3-28.3-28.3-28.3z"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();

  const [mobile, setMobile] = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  function handleChange(raw: string) {
    clearError();
    setMobile(raw.replace(/\D/g, '').slice(0, 10));
  }

  const isValid = mobile.length === 10;
  const showLengthError = touched && mobile.length > 0 && mobile.length < 10;

  async function handleSendOtp() {
    if (!isValid) return;
    await signIn(mobile);
  }

  const inputBorderColor = focused ? '#C41E3A' : '#E2E8F0';

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top area ── */}
        <View style={[styles.topArea, { paddingTop: 64 + insets.top }]}>
          <View style={[styles.logoMark, SHADOW_LOGO]}>
            <Wrench size={28} color="#C41E3A" strokeWidth={2.5} />
          </View>
          <Text style={styles.appName}>GoFixCarz</Text>
          <Text style={styles.portalLabel}>Partner Portal</Text>
        </View>

        {/* ── Main card ── */}
        <View style={[styles.card, SHADOW_CARD]}>
          <Text style={styles.welcomeTitle}>Welcome back</Text>
          <Text style={styles.welcomeSub}>Enter your mobile number to continue</Text>

          {/* Phone input row */}
          <View
            style={[
              styles.inputRow,
              { borderColor: inputBorderColor },
            ]}
          >
            <IndiaFlag />
            <Text style={styles.countryCode}>+91</Text>
            <View style={styles.divider} />
            <TextInput
              style={styles.textInput}
              value={mobile}
              onChangeText={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => { setFocused(false); setTouched(true); }}
              onSubmitEditing={handleSendOtp}
              placeholder="98765 43210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              returnKeyType="done"
              maxLength={10}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
          </View>

          {/* Error / length error banner */}
          {(error || showLengthError) ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                {error
                  ? error
                  : 'Please enter a valid 10-digit mobile number'}
              </Text>
            </View>
          ) : null}

          {/* Send OTP button */}
          <TouchableOpacity
            style={[styles.otpButton, (!isValid || isLoading) && styles.otpButtonDisabled]}
            onPress={handleSendOtp}
            activeOpacity={0.7}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.otpButtonText}>Send OTP</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            {'By continuing, you agree to our '}
            <Text style={styles.termsLink}>Terms &amp; Privacy</Text>
          </Text>
        </View>

        {/* ── Sign-up link ── */}
        <TouchableOpacity
          style={styles.signupRow}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.7}
        >
          <Text style={styles.signupText}>
            {'New garage owner? '}
            <Text style={styles.signupLink}>Create account</Text>
          </Text>
        </TouchableOpacity>

        {/* ── Bottom trust strip ── */}
        <View style={styles.trustStrip}>
          <View style={styles.trustItem}>
            <Shield size={14} color="#94A3B8" />
            <Text style={styles.trustLabel}>Secure Login</Text>
          </View>
          <View style={styles.trustItem}>
            <Star size={14} color="#94A3B8" />
            <Text style={styles.trustLabel}>4.8 Rated</Text>
          </View>
          <View style={styles.trustItem}>
            <Users size={14} color="#94A3B8" />
            <Text style={styles.trustLabel}>2,000+ Garages</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flexGrow: 1,
  },

  /* Top area */
  topArea: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  logoMark: {
    width: 56,
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  portalLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  /* Main card */
  card: {
    marginHorizontal: 16,
    marginTop: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  welcomeSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  /* Input row */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0,
    includeFontPadding: false,
  },

  /* Error banner */
  errorBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },

  /* OTP button */
  otpButton: {
    marginTop: 16,
    width: '100%',
    height: 48,
    backgroundColor: '#C41E3A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpButtonDisabled: {
    opacity: 0.55,
  },
  otpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  /* Terms */
  termsText: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
  },
  termsLink: {
    color: '#C41E3A',
  },

  /* Sign-up link */
  signupRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  signupLink: {
    color: '#C41E3A',
    fontWeight: '700',
  },

  /* Trust strip */
  trustStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 32,
    paddingBottom: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
