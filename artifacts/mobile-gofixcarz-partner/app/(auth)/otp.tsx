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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/auth.store';
import PrimaryButton from '@/src/components/ui/PrimaryButton';

const PRIMARY   = '#2563EB';
const INDIGO    = '#6366F1';
const BG        = '#EEEEF6';
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
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[idx]) {
        const next = [...otp];
        next[idx] = '';
        setOtp(next);
      } else if (idx > 0) {
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
  const maskedNumber = pendingMobile ? `+91 ${pendingMobile}` : '—';

  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <LinearGradient
        colors={['#1D4ED8', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topBand, { paddingTop: insets.top + 28 }]}
      >
        {/* Decorative circle */}
        <View style={styles.bandCircle} />

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>

        {/* OTP illustration icon */}
        <View style={styles.shieldWrap}>
          <View style={styles.shieldInner}>
            <Feather name="shield" size={32} color={PRIMARY} />
          </View>
        </View>

        <Text style={styles.bandTitle}>Verify Your Number</Text>
        <Text style={styles.bandSub}>
          OTP sent to{' '}
          <Text style={{ fontWeight: '700', color: '#fff' }}>{maskedNumber}</Text>
        </Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginTop: 6 }}>
          <Text style={styles.changeLink}>Change number</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* OTP boxes */}
        <Text style={styles.boxHint}>Enter the 6-digit code</Text>
        <View style={styles.otpRow}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => { inputs.current[idx] = r; }}
              style={[
                styles.otpBox,
                digit ? styles.otpBoxFilled : null,
                error ? styles.otpBoxError : null,
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

        {/* Verify button */}
        <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
          <PrimaryButton
            label="Verify & Sign In"
            onPress={handleVerify}
            loading={isLoading}
            disabled={!otpFilled}
          />
        </View>

        {/* Resend */}
        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={countdown > 0}
          activeOpacity={0.7}
        >
          <Text style={styles.resendText}>
            Didn't receive OTP?{' '}
            {countdown > 0 ? (
              <Text style={styles.resendCountdown}>Resend in {countdown}s</Text>
            ) : (
              <Text style={styles.resendLink}>Resend OTP</Text>
            )}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },

  /* Top gradient band */
  topBand: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  bandCircle: {
    position: 'absolute',
    top: -60, right: -60,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  backBtn: {
    position: 'absolute',
    top: 52, left: 20,
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  shieldWrap: {
    width: 72, height: 72,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  shieldInner: {
    width: 56, height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  bandTitle: {
    fontSize: 24, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginBottom: 8,
  },
  bandSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  changeLink: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textDecorationLine: 'underline' },

  /* Scroll content */
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },

  /* Error */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
    padding: 12, marginBottom: 20,
  },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },

  /* OTP boxes */
  boxHint: {
    fontSize: 14, color: '#64748B',
    textAlign: 'center', marginBottom: 20,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
    justifyContent: 'center',
    width: '100%',
  },
  otpBox: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  otpBoxFilled: {
    borderColor: PRIMARY,
    backgroundColor: '#EEF2FF',
    color: PRIMARY,
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },

  /* Resend */
  resendRow: { alignItems: 'center' },
  resendText: { fontSize: 14, color: '#64748B' },
  resendCountdown: { color: '#94A3B8', fontWeight: '500' },
  resendLink: { color: PRIMARY, fontWeight: '700' },
});
