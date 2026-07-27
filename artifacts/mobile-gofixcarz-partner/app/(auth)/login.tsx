import React, { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import PrimaryButton from '@/src/components/ui/PrimaryButton';

/* ── Design tokens ── */
const PRIMARY   = '#C41E3A';
const INDIGO    = '#921527';
const BG        = '#EEEEF6';
const CARD      = '#FFFFFF';
const TEXT      = '#1E293B';
const MUTED     = '#64748B';
const BORDER    = '#E2E8F0';
const DANGER    = '#EF4444';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();

  const [mobile,  setMobile]  = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function handleChange(raw: string) {
    clearError();
    setMobile(raw.replace(/\D/g, '').slice(0, 10));
  }

  const isValid         = mobile.length === 10;
  const showLengthError = touched && mobile.length > 0 && mobile.length < 10;

  async function handleSendOtp() {
    if (!isValid) return;
    await signIn(mobile);
  }

  const borderColor = error || showLengthError ? DANGER : focused ? PRIMARY : BORDER;

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient header ── */}
        <LinearGradient
          colors={[INDIGO, PRIMARY, '#E11D48']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 28 }]}
        >
          {/* Decorative circles */}
          <View style={styles.circle1} />
          <View style={styles.circle2} />

          <View style={styles.logoCircle}>
            <Image
              source={require('../../assets/images/logo_clean.png')}
              style={styles.logoImg}
              resizeMode="cover"
            />
          </View>

          <Text style={styles.heroTitle}>Welcome Back</Text>
          <Text style={styles.heroSub}>Sign in to your garage portal</Text>
        </LinearGradient>

        {/* ── Form card ── */}
        <View style={styles.formCard}>
          {/* API error */}
          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={DANGER} />
              <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
              <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={14} color={DANGER} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Mobile number field */}
          <Text style={styles.fieldLabel}>Mobile Number</Text>
          <Pressable
            style={[
              styles.inputRow,
              { borderColor },
              focused && styles.inputRowFocused,
            ]}
            onPress={() => inputRef.current?.focus()}
            accessible={false}
          >
            {/* Country selector */}
            <TouchableOpacity style={styles.countryBtn} activeOpacity={0.7}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
              <Text style={styles.countryCode}>+91</Text>
              <Feather name="chevron-down" size={12} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={mobile}
              onChangeText={handleChange}
              onFocus={() => { setFocused(true); setTouched(false); }}
              onBlur={() => { setFocused(false); setTouched(true); }}
              onSubmitEditing={handleSendOtp}
              placeholder="Enter mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
              returnKeyType="done"
              maxLength={10}
              textContentType="telephoneNumber"
              autoComplete="tel"
              autoFocus
            />

            {/* Character count */}
            {mobile.length > 0 && (
              <Text style={styles.charCount}>{mobile.length}/10</Text>
            )}
          </Pressable>

          {showLengthError || (error && !touched) ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={12} color={DANGER} />
              <Text style={styles.errorHint}>Enter a valid 10-digit mobile number</Text>
            </View>
          ) : null}

          <Text style={styles.fieldHint}>
            We'll send a one-time password to this number
          </Text>

          {/* CTA */}
          <View style={{ marginTop: 20 }}>
            <PrimaryButton
              label="Send OTP →"
              onPress={handleSendOtp}
              loading={isLoading}
              disabled={!isValid}
            />
          </View>

          {/* Sign-up link */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={styles.linkRow}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              New to GoFixAuto?{' '}
              <Text style={styles.linkHighlight}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Trust indicators ── */}
        <View style={styles.trustRow}>
          {[
            { icon: 'shield' as const,   label: 'Secure Login' },
            { icon: 'zap' as const,      label: 'Instant OTP' },
            { icon: 'star' as const,     label: 'Verified Partner' },
          ].map(t => (
            <View key={t.label} style={styles.trustItem}>
              <Feather name={t.icon} size={14} color={PRIMARY} />
              <Text style={styles.trustLabel}>{t.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav:    { flex: 1 },
  scroll: { flexGrow: 1 },

  /* Header gradient */
  headerGradient: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  circle2: {
    position: 'absolute', top: 30, right: 50,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 20,
  },
  logoImg: {
    width: '100%', height: '100%',
  },
  heroTitle: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginBottom: 6,
  },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },

  /* Form card — floats over gradient with negative margin top */
  formCard: {
    backgroundColor: CARD,
    marginHorizontal: 20,
    marginTop: -28,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.7)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 24 },
      android: { elevation: 6 },
      default: {},
    }),
  },

  /* Error banner */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
    padding: 12, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: DANGER },

  /* Field */
  fieldLabel: {
    fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderRadius: 16, height: 58,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  inputRowFocused: { backgroundColor: CARD, borderColor: PRIMARY },

  countryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  flagEmoji:   { fontSize: 18, lineHeight: 22 },
  countryCode: { fontSize: 15, fontWeight: '700', color: TEXT, letterSpacing: 0.2 },

  divider: { width: 1, height: 24, backgroundColor: BORDER, marginRight: 10 },

  textInput: {
    flex: 1, height: '100%',
    fontSize: 16, fontWeight: '500', color: TEXT,
    paddingVertical: 0, includeFontPadding: false,
  },
  charCount: { fontSize: 11, color: MUTED, paddingRight: 14 },

  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  errorHint: { fontSize: 12, color: DANGER },

  fieldHint: { fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 18 },

  /* Links */
  linkRow:       { marginTop: 20, alignItems: 'center' },
  linkText:      { fontSize: 14, color: MUTED },
  linkHighlight: { color: PRIMARY, fontWeight: '700' },

  /* Trust row */
  trustRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 24, marginTop: 28, paddingBottom: 8,
  },
  trustItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustLabel: { fontSize: 11, color: MUTED, fontWeight: '500' },
});
