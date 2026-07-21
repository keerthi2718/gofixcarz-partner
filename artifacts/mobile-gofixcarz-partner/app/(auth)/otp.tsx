import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/auth.store';

const RED = '#C62828';
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
    if (next.every(d => d !== '')) {
      verifyOtp(pendingMobile ?? '', next.join(''));
    }
  }

  function handleKeyPress(e: { nativeEvent: { key: string } }, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
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
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your garage account</Text>

        {/* OTP info */}
        <Text style={styles.otpInfo}>
          OTP sent to{' '}
          <Text style={styles.otpMobile}>+91 {pendingMobile}</Text>
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 28 }}>
          <Text style={styles.changeLink}>Change number</Text>
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
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

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.btn, { opacity: isComplete && !isLoading ? 1 : 0.6 }]}
          onPress={() => verifyOtp(pendingMobile ?? '', otp)}
          disabled={!isComplete || isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verify &amp; Sign In</Text>
          }
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive OTP? </Text>
          {countdown > 0
            ? <Text style={styles.timer}>Resend in {countdown}s</Text>
            : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            )
          }
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28, alignItems: 'center' },
  logoContainer: {
    width: 120, height: 80, borderRadius: 12,
    overflow: 'hidden', marginBottom: 24, backgroundColor: '#111',
  },
  logo: { width: '100%', height: '100%' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20, textAlign: 'center' },
  otpInfo: { fontSize: 13, color: '#374151', textAlign: 'center' },
  otpMobile: { fontWeight: '700', color: '#111827' },
  changeLink: { fontSize: 13, color: RED, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16, width: '100%',
  },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 28 },
  otpBox: {
    width: 46, height: 54, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    fontSize: 22, fontWeight: '700', color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpBoxFilled: { borderColor: RED, backgroundColor: '#FFF5F5' },
  otpBoxError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  btn: {
    width: '100%', backgroundColor: RED, borderRadius: 10,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  resendLabel: { fontSize: 13, color: '#6B7280' },
  timer: { fontSize: 13, color: '#9CA3AF' },
  resendLink: { fontSize: 13, color: RED, fontWeight: '600' },
});
