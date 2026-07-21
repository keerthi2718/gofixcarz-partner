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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import { radius, shadow, spacing, typography } from '@/constants/theme';

const PRIMARY = '#C62839';
const BG = '#FFFFFF';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();

  const [mobile, setMobile] = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function handleChange(raw: string) {
    clearError();
    const digits = raw.replace(/\D/g, '').slice(0, 10);
    setMobile(digits);
  }

  const isValid = mobile.length === 10;
  const showLengthError = touched && mobile.length > 0 && mobile.length < 10;

  async function handleSendOtp() {
    if (!isValid) return;
    await signIn(mobile);
  }

  const borderColor = error || showLengthError ? '#EF4444' : focused ? PRIMARY : '#D1D5DB';

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* ── Headings ── */}
        <Text style={styles.heading}>Welcome Back</Text>
        <Text style={styles.subheading}>Sign in to your garage account</Text>

        {/* ── API error banner ── */}
        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color={PRIMARY} />
            <Text style={[styles.errorText, { flex: 1 }]}>{error}</Text>
            <TouchableOpacity
              onPress={clearError}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Mobile number field ── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Mobile Number</Text>

          <Pressable
            style={[styles.inputRow, { borderColor }]}
            onPress={() => inputRef.current?.focus()}
            accessible={false}
          >
            {/* Country selector — "IN ▼" */}
            <TouchableOpacity style={styles.countryBtn} activeOpacity={0.7}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
              <Text style={styles.countryCode}>IN</Text>
              <Feather name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>

            {/* Vertical divider */}
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
              placeholderTextColor="#9CA3AF"
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
              returnKeyType="done"
              maxLength={10}
              textContentType="telephoneNumber"
              autoComplete="tel"
              caretHidden={false}
              autoFocus
            />
          </Pressable>

          {/* Inline validation */}
          {showLengthError || error ? (
            <Text style={styles.errorHint}>
              Enter a valid 10-digit mobile number
            </Text>
          ) : null}
        </View>

        {/* ── Send OTP button ── */}
        <PrimaryButton
          label="Send OTP"
          onPress={handleSendOtp}
          loading={isLoading}
          disabled={!isValid}
          style={styles.button}
        />

        {/* ── Sign-up link ── */}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
  },

  /* Logo */
  logoWrap: {
    width: 180,
    height: 120,
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  logo: { width: '100%', height: '100%' },

  /* Headings */
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },

  /* API error */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: { fontSize: 13, color: PRIMARY },

  /* Field */
  fieldWrapper: { width: '100%', marginBottom: 8 },
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
    borderWidth: 1,
    borderRadius: 8,
    height: 52,
    overflow: 'visible',
  },

  /* Country selector */
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  flagEmoji: { fontSize: 18, lineHeight: 22 },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 0.2,
  },

  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },

  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    paddingVertical: 0,
    paddingRight: 12,
    includeFontPadding: false,
  },

  errorHint: {
    fontSize: 12,
    color: PRIMARY,
    marginTop: 5,
  },

  /* Button */
  button: { marginTop: 16, width: '100%' },

  /* Sign-up link */
  linkRow: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#6B7280' },
  linkHighlight: { color: PRIMARY, fontWeight: '700' },
});
