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
import { shadow } from '@/constants/theme';

const PRIMARY   = '#2563EB';
const PRIMARY_D = '#1D4ED8';
const DANGER    = '#EF4444';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();

  const [mobile, setMobile]   = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function handleChange(raw: string) {
    clearError();
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setMobile(digits);
  }

  const isValid        = mobile.length === 10;
  const showLengthError = touched && mobile.length > 0 && mobile.length < 10;

  async function handleSendOtp() {
    if (!isValid) return;
    await signIn(mobile);
  }

  const borderColor = error || showLengthError ? DANGER : focused ? PRIMARY : '#E2E8F0';

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient header ── */}
        <LinearGradient
          colors={[PRIMARY, PRIMARY_D]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 32 }]}
        >
          {/* Logo card */}
          <View style={[styles.logoCard, shadow.md]}>
            <Image
              source={require('../../assets/images/logo.jpg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </LinearGradient>

        {/* ── Form area ── */}
        <View style={styles.formArea}>
          {/* Headings */}
          <Text style={styles.heading}>Welcome to GoFixAuto</Text>
          <Text style={styles.subheading}>
            Manage your garage efficiently and grow your business.
          </Text>

          {/* API error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={DANGER} />
              <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
              <TouchableOpacity
                onPress={clearError}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={14} color={DANGER} />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Mobile field */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>

            <Pressable
              style={[styles.inputRow, { borderColor }, focused && styles.inputRowFocused]}
              onPress={() => inputRef.current?.focus()}
              accessible={false}
            >
              {/* Country selector */}
              <TouchableOpacity style={styles.countryBtn} activeOpacity={0.7}>
                <Text style={styles.flagEmoji}>🇮🇳</Text>
                <Text style={styles.countryCode}>IN</Text>
                <Feather name="chevron-down" size={13} color="#94A3B8" />
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Digit input */}
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
                caretHidden={false}
                autoFocus
              />
            </Pressable>

            {showLengthError || error ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color={DANGER} />
                <Text style={styles.errorHint}>Enter a valid 10-digit mobile number</Text>
              </View>
            ) : null}
          </View>

          {/* Send OTP button */}
          <View style={[styles.btnShadowWrap, shadow.md]}>
            <PrimaryButton
              label="Send OTP"
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
              Don't have an account?{' '}
              <Text style={styles.linkHighlight}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: '#F8FAFC' },

  scroll: { flexGrow: 1 },

  /* Header gradient */
  headerGradient: {
    alignItems: 'center',
    paddingBottom: 40,
  },

  /* Logo card — white rounded, floats on gradient */
  logoCard: {
    width: 140,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  logo: { width: '100%', height: '100%' },

  /* Form area */
  formArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },

  /* Headings */
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '400',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  /* Error banner */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: DANGER },

  /* Field */
  fieldWrapper: { width: '100%', marginBottom: 12 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 56,
    overflow: 'hidden',
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  inputRowFocused: {
    borderColor: PRIMARY,
    borderWidth: 1.5,
  },

  /* Country selector */
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  flagEmoji: { fontSize: 18, lineHeight: 22 },
  countryCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.2,
  },

  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },

  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
    paddingVertical: 0,
    paddingRight: 16,
    includeFontPadding: false,
  },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorHint: { fontSize: 12, color: DANGER },

  /* Button */
  btnShadowWrap: { marginTop: 8, borderRadius: 16 },

  /* Sign-up link */
  linkRow: { marginTop: 24, alignItems: 'center', paddingBottom: 8 },
  linkText: { fontSize: 14, color: '#64748B' },
  linkHighlight: { color: PRIMARY, fontWeight: '700' },
});
