import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/auth.store';

const NAVY = '#1B3A6B';
const ORANGE = '#FF6B2B';
const OTP_LENGTH = 6;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const pendingMobile = useAuthStore(s => s.pendingMobile);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleChange(text: string, index: number) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    clearError();
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every(d => d !== '') && next.join('').length === OTP_LENGTH) {
      verifyOtp(pendingMobile ?? '', next.join(''));
    }
  }

  function handleKeyPress(e: { nativeEvent: { key: string } }, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleResend() {
    if (countdown > 0 || !pendingMobile) return;
    await resendOtp(pendingMobile);
    setDigits(Array(OTP_LENGTH).fill(''));
    setCountdown(60);
    inputRefs.current[0]?.focus();
  }

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={NAVY} />
        </TouchableOpacity>

        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: ORANGE + '15' }]}>
            <Feather name="lock" size={26} color={ORANGE} />
          </View>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={{ fontWeight: '700' as const, color: NAVY }}>+91 {pendingMobile}</Text>
          </Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* OTP Boxes */}
        <View style={styles.otpRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={ref => { inputRefs.current[i] = ref; }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : {},
                error ? styles.otpBoxError : {},
              ]}
              value={digit}
              onChangeText={t => handleChange(t, i)}
              onKeyPress={e => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              textAlign="center"
              autoFocus={i === 0}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, { opacity: isComplete && !isLoading ? 1 : 0.55 }]}
          onPress={() => verifyOtp(pendingMobile ?? '', otp)}
          disabled={!isComplete || isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verify & Sign In</Text>
          }
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the code?</Text>
          {countdown > 0
            ? <Text style={styles.timer}>Resend in {countdown}s</Text>
            : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend OTP</Text>
              </TouchableOpacity>
            )
          }
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  back: { marginBottom: 32, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  top: { gap: 10, marginBottom: 32 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800' as const, color: NAVY },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  errorBox: {
    flexDirection: 'row' as const, alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444' },
  otpRow: { flexDirection: 'row' as const, gap: 10, justifyContent: 'center', marginBottom: 32 },
  otpBox: {
    width: 46, height: 56, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    fontSize: 22, fontWeight: '700' as const, color: NAVY,
    backgroundColor: '#F9FAFB',
  },
  otpBoxFilled: { borderColor: NAVY, backgroundColor: '#EFF6FF' },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  btn: {
    backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  resendRow: { flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'center', gap: 6 },
  resendLabel: { fontSize: 13, color: '#6B7280' },
  timer: { fontSize: 13, color: '#9CA3AF' },
  resendLink: { fontSize: 13, color: ORANGE, fontWeight: '600' as const },
});
