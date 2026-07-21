import React, { useEffect, useRef, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/auth.store';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import { radius, shadow, spacing, typography } from '@/constants/theme';

const PRIMARY = '#C62839';
const BG = '#F7F8FA';
const OTP_LENGTH = 6;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const pendingMobile = useAuthStore(s => s.pendingMobile);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  function handleChange(val: string, idx: number) {
    clearError();
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (!digit && idx > 0) inputs.current[idx - 1]?.focus();
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify() {
    if (!pendingMobile) return;
    await verifyOtp(pendingMobile, otp.join(''));
  }

  async function handleResend() {
    if (countdown > 0 || !pendingMobile) return;
    await resendOtp(pendingMobile);
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(30);
    inputs.current[0]?.focus();
  }

  const otpFilled = otp.every(d => d !== '');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={[styles.logoCard, shadow.md]}>
          <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={[typography.headline, styles.title]}>Verify OTP</Text>

        {/* Sent-to info */}
        <View style={styles.sentRow}>
          <Text style={[typography.bodySm, { color: '#6B7280' }]}>
            OTP sent to{' '}
            <Text style={{ fontWeight: '700', color: '#111827' }}>+91 {pendingMobile ?? '—'}</Text>
          </Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[typography.label, { color: PRIMARY }]}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={[typography.bodySm, { color: '#EF4444', flex: 1 }]}>{error}</Text>
          </View>
        ) : null}

        {/* OTP boxes */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => { inputs.current[idx] = r; }}
              style={[
                styles.otpBox,
                {
                  borderColor: digit ? PRIMARY : '#E5E7EB',
                  backgroundColor: digit ? '#FFF0F1' : '#fff',
                  borderWidth: digit ? 1.5 : 1,
                },
              ]}
              value={digit}
              onChangeText={v => handleChange(v, idx)}
              onKeyPress={e => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              autoFocus={idx === 0}
            />
          ))}
        </View>

        {/* Verify */}
        <PrimaryButton
          label="Verify & Sign In"
          onPress={handleVerify}
          loading={isLoading}
          disabled={!otpFilled}
          style={{ marginTop: 8 }}
        />

        {/* Resend */}
        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={countdown > 0}
          activeOpacity={0.7}
        >
          {countdown > 0 ? (
            <Text style={[typography.bodySm, { color: '#6B7280' }]}>
              Resend OTP in <Text style={{ color: PRIMARY, fontWeight: '700' }}>{countdown}s</Text>
            </Text>
          ) : (
            <Text style={[typography.bodySm, { color: PRIMARY, fontWeight: '700' }]}>Resend OTP</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, alignItems: 'center' },
  logoCard: {
    width: 140, height: 96, borderRadius: radius.lg,
    backgroundColor: '#111', overflow: 'hidden', marginBottom: spacing.xl,
  },
  logo: { width: '100%', height: '100%' },
  title: { color: '#111827', textAlign: 'center', marginBottom: 12 },
  sentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md, paddingVertical: 10,
    marginBottom: spacing.xl, width: '100%',
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#FECACA',
    padding: spacing.md, marginBottom: spacing.base, width: '100%',
  },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.xl, width: '100%', justifyContent: 'center' },
  otpBox: {
    width: 48, height: 56, borderRadius: radius.md,
    fontSize: 22, fontWeight: '700', color: '#111827',
  },
  resendRow: { marginTop: spacing.lg },
});
