import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/auth.store';
import PrimaryButton from '@/src/components/ui/PrimaryButton';

const PRIMARY = '#C62839';
const BG = '#FFFFFF';
const OTP_LENGTH = 4; // 4-box design per Figma

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const pendingMobile = useAuthStore(s => s.pendingMobile);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<Array<TextInput | null>>([]);

  // Countdown timer
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
    // Auto-advance
    if (digit && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[idx]) {
        // Clear current cell
        const next = [...otp];
        next[idx] = '';
        setOtp(next);
      } else if (idx > 0) {
        // Move back and clear previous
        const next = [...otp];
        next[idx - 1] = '';
        setOtp(next);
        inputs.current[idx - 1]?.focus();
      }
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

  const maskedNumber = pendingMobile
    ? `+91 ${pendingMobile}`
    : '—';

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

        {/* ── Sent-to info ── */}
        <Text style={styles.sentTo}>
          OTP sent to{' '}
          <Text style={styles.sentToNumber}>{maskedNumber}</Text>
        </Text>

        {/* Change number */}
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginBottom: 32 }}
        >
          <Text style={styles.changeLink}>Change number</Text>
        </TouchableOpacity>

        {/* ── Error ── */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* ── 4 OTP boxes ── */}
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => { inputs.current[idx] = r; }}
              style={[
                styles.otpBox,
                {
                  borderColor: digit
                    ? PRIMARY
                    : error
                    ? '#EF4444'
                    : '#D1D5DB',
                  backgroundColor: digit ? '#FFF0F1' : '#FFFFFF',
                  borderWidth: digit ? 1.5 : 1,
                  color: PRIMARY,
                },
              ]}
              value={digit}
              onChangeText={v => handleChange(v, idx)}
              onKeyPress={e => handleKeyPress(e, idx)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
              autoFocus={idx === 0}
              caretHidden
            />
          ))}
        </View>

        {/* ── Verify button ── */}
        <PrimaryButton
          label="Verify & Sign In"
          onPress={handleVerify}
          loading={isLoading}
          disabled={!otpFilled}
          style={styles.button}
        />

        {/* ── Resend ── */}
        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={countdown > 0}
          activeOpacity={0.7}
        >
          <Text style={styles.resendText}>
            Didn't receive OTP?{' '}
            {countdown > 0 ? (
              <Text style={styles.resendCountdown}>
                Resend in {countdown}s
              </Text>
            ) : (
              <Text style={styles.resendLink}>Resend</Text>
            )}
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
    marginBottom: 20,
  },

  /* Sent-to */
  sentTo: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 6,
  },
  sentToNumber: {
    fontWeight: '700',
    color: '#111827',
  },
  changeLink: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: '600',
    textAlign: 'center',
  },

  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },

  /* OTP boxes */
  otpRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 32,
    justifyContent: 'center',
  },
  otpBox: {
    width: 64,
    height: 64,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
  },

  /* Button */
  button: { width: '100%', marginBottom: 20 },

  /* Resend */
  resendRow: { alignItems: 'center' },
  resendText: { fontSize: 14, color: '#6B7280' },
  resendCountdown: { color: '#9CA3AF', fontWeight: '500' },
  resendLink: { color: PRIMARY, fontWeight: '700' },
});
