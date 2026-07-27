/**
 * OTP Verification Screen
 *
 * Auto-fill strategies (priority order):
 *  1. iOS  — textContentType="oneTimeCode"  → OS reads SMS → QuickType suggests code
 *  2. Android — autoComplete="sms-otp"      → Autofill framework fills from SMS
 *  3. Multi-digit paste handler             → onChangeText receives full code string
 *  4. Clipboard polling (1.5 s interval)    → catches manual copy-paste from SMS app
 *  5. AppState listener                     → checks clipboard immediately on foreground
 *
 * APIs / auth logic untouched.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
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
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/auth.store';
import PrimaryButton from '@/src/components/ui/PrimaryButton';

/* ─── constants ─────────────────────────────────────────────────────────── */

const PRIMARY    = '#C41E3A';
const BG         = '#EEEEF6';
const OTP_LENGTH = 6;

/**
 * Matches a standalone 6-digit code first, then falls back to 4-digit.
 * Anchored with \b so it doesn't match substrings of longer numbers.
 */
const OTP_REGEX = /\b(\d{6})\b|\b(\d{4})\b/;

/* ─── component ─────────────────────────────────────────────────────────── */

type AutofillStatus = 'idle' | 'detected' | 'verifying';

export default function OtpScreen() {
  const insets        = useSafeAreaInsets();
  const { verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const pendingMobile = useAuthStore(s => s.pendingMobile);

  const [otp,            setOtp]            = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown,      setCountdown]      = useState(30);
  const [autofillStatus, setAutofillStatus] = useState<AutofillStatus>('idle');

  /* refs — no re-renders needed */
  const inputs           = useRef<Array<TextInput | null>>([]);
  const lastClipboard    = useRef('');
  const hasSubmitted     = useRef(false);   // double-submit guard
  const clipboardTimer   = useRef<ReturnType<typeof setInterval> | null>(null);

  /* animation — subtle scale pulse on the OTP row when auto-filled */
  const rowScale = useRef(new Animated.Value(1)).current;

  /* ── countdown ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  /* ── fill helper ────────────────────────────────────────────────────────── */
  /**
   * Distributes up to OTP_LENGTH digits across all boxes.
   * Returns true if a full code was applied.
   */
  const fillOtp = useCallback((raw: string): boolean => {
    const digits = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (digits.length < OTP_LENGTH) return false;

    setOtp(digits.split(''));
    setAutofillStatus('detected');

    /* brief spring-bounce so the user notices the auto-fill */
    Animated.sequence([
      Animated.spring(rowScale, { toValue: 1.04, friction: 4, tension: 220, useNativeDriver: true }),
      Animated.spring(rowScale, { toValue: 1,    friction: 4, tension: 180, useNativeDriver: true }),
    ]).start();

    /* move focus to last box so keyboard stays visible */
    inputs.current[OTP_LENGTH - 1]?.focus();
    return true;
  }, [rowScale]);

  /* ── clipboard polling ──────────────────────────────────────────────────── */
  const checkClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text === lastClipboard.current) return;

      const match = text.match(OTP_REGEX);
      if (!match) return;

      const code = match[1] ?? match[2];   // 6-digit preferred, else 4-digit
      lastClipboard.current = text;         // mark seen — don't re-trigger

      fillOtp(code);
    } catch {
      /* clipboard permission denied or unavailable — silent fallback to manual */
    }
  }, [fillOtp]);

  useEffect(() => {
    /* poll clipboard every 1.5 s */
    clipboardTimer.current = setInterval(checkClipboard, 1500);

    /* also fire immediately whenever the app returns to foreground —
       covers the "switch to Messages, copy code, switch back" flow */
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') checkClipboard();
    };
    const appStateSub = AppState.addEventListener('change', handleAppState);

    return () => {
      if (clipboardTimer.current) clearInterval(clipboardTimer.current);
      appStateSub.remove();
    };
  }, [checkClipboard]);

  /* ── auto-submit when all digits filled ─────────────────────────────────── */
  useEffect(() => {
    if (
      otp.every(d => d !== '') &&
      pendingMobile            &&
      !isLoading               &&
      !hasSubmitted.current
    ) {
      hasSubmitted.current = true;
      setAutofillStatus('verifying');
      (async () => {
        try {
          await verifyOtp(pendingMobile, otp.join(''));
        } finally {
          /* reset guard on failure so the user can edit and retry */
          hasSubmitted.current = false;
        }
      })();
    }
  // otp is the only trigger; other deps are stable refs or stable callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  /* ── input event handlers ───────────────────────────────────────────────── */
  function handleChange(val: string, idx: number) {
    clearError();
    setAutofillStatus('idle');
    const digits = val.replace(/\D/g, '');

    if (digits.length >= OTP_LENGTH) {
      /* Full OTP: iOS AutoFill delivers all 6 digits to box[0] */
      fillOtp(digits);
      return;
    }

    if (digits.length > 1) {
      /* Partial paste starting from current box */
      const next = [...otp];
      for (let i = 0; i < digits.length && idx + i < OTP_LENGTH; i++) {
        next[idx + i] = digits[i];
      }
      setOtp(next);
      const nextFocus = Math.min(idx + digits.length, OTP_LENGTH - 1);
      inputs.current[nextFocus]?.focus();
      return;
    }

    /* Normal single-digit entry */
    const digit = digits.slice(-1);
    const next  = [...otp];
    next[idx]   = digit;
    setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === 'Backspace') {
      hasSubmitted.current = false;
      setAutofillStatus('idle');
      if (otp[idx]) {
        const next = [...otp]; next[idx] = ''; setOtp(next);
      } else if (idx > 0) {
        const next = [...otp]; next[idx - 1] = ''; setOtp(next);
        inputs.current[idx - 1]?.focus();
      }
    }
  }

  async function handleVerify() {
    if (!pendingMobile || isLoading || hasSubmitted.current) return;
    hasSubmitted.current = true;
    try {
      await verifyOtp(pendingMobile, otp.join(''));
    } finally {
      hasSubmitted.current = false;
    }
  }

  async function handleResend() {
    if (countdown > 0 || !pendingMobile) return;
    await resendOtp(pendingMobile);
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(30);
    setAutofillStatus('idle');
    hasSubmitted.current  = false;
    lastClipboard.current = '';
    inputs.current[0]?.focus();
  }

  /* ── derived state ──────────────────────────────────────────────────────── */
  const otpFilled    = otp.every(d => d !== '');
  const maskedNumber = pendingMobile ? `+91 ${pendingMobile}` : '—';

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView
      style={[styles.kav, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* ── Crimson hero band ── */}
      <LinearGradient
        colors={['#921527', '#C41E3A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topBand, { paddingTop: insets.top + 28 }]}
      >
        <View style={styles.bandCircle} />

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>

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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginTop: 6 }}
        >
          <Text style={styles.changeLink}>Change number</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Scrollable body ── */}
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

        {/* Auto-fill success badge */}
        {autofillStatus === 'detected' && !error ? (
          <View style={styles.autofillBanner}>
            <Feather name="check-circle" size={14} color="#059669" />
            <Text style={styles.autofillText}>OTP detected automatically</Text>
          </View>
        ) : null}

        {/* OTP hint */}
        <Text style={styles.boxHint}>Enter the 6-digit code</Text>

        {/* ── OTP boxes ── */}
        <Animated.View style={[styles.otpRow, { transform: [{ scale: rowScale }] }]}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => { inputs.current[idx] = r; }}
              style={[
                styles.otpBox,
                digit                           ? styles.otpBoxFilled    : null,
                error                           ? styles.otpBoxError     : null,
                autofillStatus === 'detected' && digit ? styles.otpBoxAutofill : null,
              ]}
              value={digit}
              onChangeText={v => handleChange(v, idx)}
              onKeyPress={e => handleKeyPress(e, idx)}

              /* ── Platform-specific autofill hints ── */
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
              textContentType="oneTimeCode"        // iOS 12+: reads SMS automatically
              autoComplete={
                Platform.OS === 'android'
                  ? 'sms-otp'                      // Android autofill framework
                  : 'one-time-code'                // web / iOS fallback
              }
              importantForAutofill="yes"           // Android: include in autofill context

              /* allow full-code delivery from iOS AutoFill */
              maxLength={OTP_LENGTH}

              textAlign="center"
              selectTextOnFocus
              autoFocus={idx === 0}
              caretHidden
              editable={!isLoading}
            />
          ))}
        </Animated.View>

        {/* Verifying indicator — replaces button label while auto-submitting */}
        {isLoading ? (
          <View style={styles.verifyingRow}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={styles.verifyingText}>Verifying…</Text>
          </View>
        ) : null}

        {/* Manual verify button */}
        <View style={styles.btnWrap}>
          <PrimaryButton
            label="Verify & Sign In"
            onPress={handleVerify}
            loading={isLoading}
            disabled={!otpFilled || isLoading}
          />
        </View>

        {/* Resend (timer unchanged) */}
        <TouchableOpacity
          style={styles.resendRow}
          onPress={handleResend}
          disabled={countdown > 0 || isLoading}
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

        {/* Contextual tip */}
        <View style={styles.tipRow}>
          <Feather name="zap" size={11} color="#94A3B8" />
          <Text style={styles.tipText}>
            Auto-reads OTP from SMS on iOS & Android
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  kav: { flex: 1 },

  /* ── Hero band ── */
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
  bandSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center',
  },
  changeLink: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    fontWeight: '600', textDecorationLine: 'underline',
  },

  /* ── Scroll body ── */
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },

  /* ── Banners ── */
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
    padding: 12, marginBottom: 20,
  },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },

  autofillBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0',
    padding: 12, marginBottom: 16,
  },
  autofillText: { fontSize: 13, color: '#059669', fontWeight: '500', flex: 1 },

  /* ── OTP row ── */
  boxHint: {
    fontSize: 14, color: '#64748B',
    textAlign: 'center', marginBottom: 20,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
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
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  otpBoxFilled: {
    borderColor: PRIMARY,
    backgroundColor: '#FEE2E2',
    color: PRIMARY,
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  /* green highlight applied when auto-filled from clipboard / SMS */
  otpBoxAutofill: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    color: '#059669',
  },

  /* ── Verifying indicator ── */
  verifyingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12,
  },
  verifyingText: {
    fontSize: 13, color: PRIMARY, fontWeight: '600',
  },

  /* ── Verify button ── */
  btnWrap: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 20,
  },

  /* ── Resend ── */
  resendRow:      { alignItems: 'center', marginBottom: 20 },
  resendText:     { fontSize: 14, color: '#64748B' },
  resendCountdown:{ color: '#94A3B8', fontWeight: '500' },
  resendLink:     { color: PRIMARY, fontWeight: '700' },

  /* ── Tip ── */
  tipRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5,
  },
  tipText: {
    fontSize: 11, color: '#94A3B8', textAlign: 'center',
  },
});
