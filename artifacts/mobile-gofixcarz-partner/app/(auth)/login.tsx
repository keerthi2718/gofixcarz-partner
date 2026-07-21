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
const BG = '#F7F8FA';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();

  const [mobile, setMobile] = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);   // show error only after first blur
  const inputRef = useRef<TextInput>(null);

  // Strip any non-digit and enforce 10-char cap
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

  const borderColor = error || showLengthError
    ? '#EF4444'
    : focused
    ? PRIMARY
    : '#D1D5DB';

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <View style={[styles.logoCard, shadow.md]}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* ── Headings ── */}
        <Text style={[typography.headline, styles.title]}>Welcome Back</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Sign in to your garage account
        </Text>

        {/* ── API error banner ── */}
        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={[typography.bodySm, { color: '#EF4444', flex: 1 }]}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={clearError}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Mobile number field ── */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Mobile Number</Text>

          {/*
            Outer Pressable lets the user tap anywhere on the row
            (prefix, divider, blank space) and still focus the hidden input.
          */}
          <Pressable
            style={[styles.inputRow, { borderColor }]}
            onPress={() => inputRef.current?.focus()}
            accessible={false}
          >
            {/* Left icon */}
            <Feather
              name="smartphone"
              size={18}
              color={focused ? PRIMARY : '#9CA3AF'}
              style={styles.leadIcon}
            />

            {/* +91 prefix — static, not editable */}
            <View style={styles.prefixWrap}>
              <Text style={[styles.prefixText, { color: focused ? PRIMARY : '#374151' }]}>
                +91
              </Text>
              <View style={styles.divider} />
            </View>

            {/* Actual text input */}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={mobile}
              onChangeText={handleChange}
              onFocus={() => { setFocused(true); setTouched(false); }}
              onBlur={() => { setFocused(false); setTouched(true); }}
              onSubmitEditing={handleSendOtp}
              placeholder="10-digit number"
              placeholderTextColor="#9CA3AF"
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
              returnKeyType="done"
              maxLength={10}
              textContentType="telephoneNumber"
              autoComplete="tel"
              importantForAutofill="yes"
              caretHidden={false}
              selection={undefined}          // let OS manage cursor
              autoFocus
            />

            {/* Clear button when there are digits */}
            {mobile.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setMobile('');
                  clearError();
                  inputRef.current?.focus();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </Pressable>

          {/* Inline validation message */}
          {showLengthError ? (
            <View style={styles.hintRow}>
              <Feather name="alert-circle" size={12} color="#EF4444" />
              <Text style={styles.hintText}>
                Please enter a 10-digit mobile number ({mobile.length}/10)
              </Text>
            </View>
          ) : mobile.length === 10 ? (
            <View style={styles.hintRow}>
              <Feather name="check-circle" size={12} color="#16A34A" />
              <Text style={[styles.hintText, { color: '#16A34A' }]}>
                Looks good!
              </Text>
            </View>
          ) : (
            <Text style={[styles.hintText, { marginTop: 4 }]}>
              {mobile.length}/10 digits entered
            </Text>
          )}
        </View>

        {/* ── Send OTP ── */}
        <PrimaryButton
          label="Send OTP"
          onPress={handleSendOtp}
          loading={isLoading}
          disabled={!isValid}
          style={{ marginTop: 8 }}
        />

        {/* ── Sign-up link ── */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.linkRow}
          activeOpacity={0.7}
        >
          <Text style={[typography.bodySm, { color: '#6B7280' }]}>
            Don't have an account?{' '}
            <Text style={{ color: PRIMARY, fontWeight: '700' }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: BG },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },

  logoCard: {
    width: 140,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: '#111',
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  logo: { width: '100%', height: '100%' },

  title: { color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#6B7280', textAlign: 'center', marginBottom: 32 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.md,
    marginBottom: spacing.base,
    width: '100%',
  },

  /* ── Phone field ── */
  fieldWrapper: { width: '100%', marginBottom: spacing.md },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: radius.md,
    height: 56,          // tall enough for comfortable tap on all platforms
    overflow: 'visible', // don't clip the TextInput on Android
  },

  leadIcon: { marginLeft: 14, marginRight: 4 },

  prefixWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 10,
  },

  textInput: {
    flex: 1,
    height: '100%',           // fill full row height → maximum tap target
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    // Remove default padding on Android that can cause layout shifts
    paddingVertical: 0,
    paddingHorizontal: 0,
    // Prevent input from being clipped on some Android versions
    includeFontPadding: false,
  },

  clearBtn: { paddingHorizontal: 14 },

  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  hintText: {
    fontSize: 12,
    color: '#EF4444',
  },

  linkRow: { marginTop: spacing.lg, alignItems: 'center' },
});
