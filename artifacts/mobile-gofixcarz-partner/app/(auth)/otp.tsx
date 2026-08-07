/**
 * OTP Verification Screen
 *
 * Auto-fill strategies (priority order):
 *  1. iOS  — textContentType="oneTimeCode"  → OS reads SMS → QuickType suggests code
 *  2. Android — autoComplete="sms-otp"      → Autofill framework fills from SMS
 *  3. Multi-digit paste handler             → onChangeText receives full code string
 *  4. Clipboard polling (1.5 s interval)    → catches manual copy-paste from SMS app
 *  5. AppState listener                     → checks clipboard immediately on foreground
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
import { useAuth } from '@/src/context/AuthContext';
import { useAuthStore } from '@/src/store/auth.store';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import { AlertTriangle, Clock, AlertOctagon, CheckCircle, ChevronLeft, ShieldCheck } from 'lucide-react-native';

/* ─────────────── Tokens ─────────────── */
const PRIMARY = '#2563EB';
const DANGER = '#DC2626';
const SUCCESS = '#16A34A';
const WARNING = '#F59E0B';
const BG = '#EEEEF6';
const OTP_LENGTH = 6;
const OTP_REGEX = /\b(\d{6})\b|\b(\d{4})\b/;

/* ─────────────── Error type detector ─────────────── */
type ErrorKind = 'wrong' | 'expired' | 'too_many' | 'network';
function detectErrorKind(msg: string | null): ErrorKind {
  if (!msg) return 'wrong';
  const m = msg.toLowerCase();
  if (m.includes('expir')) return 'expired';
  if (m.includes('too many') || m.includes('attempt') || m.includes('limit') || m.includes('block')) return 'too_many';
  if (m.includes('network') || m.includes('connection') || m.includes('timeout')) return 'network';
  return 'wrong';
}

/* ─────────────── FadeSlide banner ─────────────── */
function FadeBanner({ children, style }: { children: React.ReactNode; style?: object }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

/* ─────────────── Countdown format ─────────────── */
function fmtCountdown(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

type AutofillStatus = 'idle' | 'detected' | 'verifying';

/* ════════════════════ Screen ════════════════════ */
export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { verifyOtp, resendOtp, isLoading, error, clearError } = useAuth();
  const pendingMobile = useAuthStore(s => s.pendingMobile);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(30);
  const [autofillStatus, setAutofillStatus] = useState<AutofillStatus>('idle');

  const inputs = useRef<Array<TextInput | null>>([]);
  const lastClipboard = useRef('');
  const hasSubmitted = useRef(false);
  const clipboardTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── animations ── */
  const rowScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;   // X offset for shake

  /* ── shake on error ── */
  useEffect(() => {
    if (!error) return;
    hasSubmitted.current = false;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -9, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [error]);

  /* ── countdown ── */
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  /* ── fill helper ── */
  const fillOtp = useCallback((raw: string): boolean => {
    const digits = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (digits.length < OTP_LENGTH) return false;
    setOtp(digits.split(''));
    setAutofillStatus('detected');
    Animated.sequence([
      Animated.spring(rowScale, { toValue: 1.04, friction: 4, tension: 220, useNativeDriver: true }),
      Animated.spring(rowScale, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }),
    ]).start();
    inputs.current[OTP_LENGTH - 1]?.focus();
    return true;
  }, [rowScale]);

  /* ── clipboard polling ── */
  const checkClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text === lastClipboard.current) return;
      const match = text.match(OTP_REGEX);
      if (!match) return;
      const code = match[1] ?? match[2];
      lastClipboard.current = text;
      fillOtp(code);
    } catch { }
  }, [fillOtp]);

  /* ── mount cleanup & clipboard priming ── */
  useEffect(() => {
    let isMounted = true;
    // Capture pre-existing clipboard text on mount so old OTPs from past logins are ignored
    (async () => {
      try {
        const initialText = await Clipboard.getStringAsync();
        if (isMounted && initialText) {
          lastClipboard.current = initialText;
        }
      } catch { }
    })();

    // Always clear OTP boxes & errors when mounting/remounting
    setOtp(Array(OTP_LENGTH).fill(''));
    setAutofillStatus('idle');
    clearError();
    hasSubmitted.current = false;

    return () => {
      isMounted = false;
      setOtp(Array(OTP_LENGTH).fill(''));
    };
  }, []);

  useEffect(() => {
    clipboardTimer.current = setInterval(checkClipboard, 1500);
    const handleAppState = (state: AppStateStatus) => { if (state === 'active') checkClipboard(); };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => { if (clipboardTimer.current) clearInterval(clipboardTimer.current); sub.remove(); };
  }, [checkClipboard]);

  /* ── auto-submit ── */
  useEffect(() => {
    if (otp.every(d => d !== '') && pendingMobile && !isLoading && !hasSubmitted.current) {
      hasSubmitted.current = true;
      setAutofillStatus('verifying');
      (async () => {
        try { await verifyOtp(pendingMobile, otp.join('')); }
        finally { hasSubmitted.current = false; }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  /* ── input handlers ── */
  function handleChange(val: string, idx: number) {
    clearError();
    setAutofillStatus('idle');
    const digits = val.replace(/\D/g, '');
    if (digits.length >= OTP_LENGTH) { fillOtp(digits); return; }
    if (digits.length > 1) {
      const next = [...otp];
      for (let i = 0; i < digits.length && idx + i < OTP_LENGTH; i++) next[idx + i] = digits[i];
      setOtp(next);
      inputs.current[Math.min(idx + digits.length, OTP_LENGTH - 1)]?.focus();
      return;
    }
    const digit = digits.slice(-1);
    const next = [...otp]; next[idx] = digit; setOtp(next);
    if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleKeyPress(e: any, idx: number) {
    if (e.nativeEvent.key === 'Backspace') {
      hasSubmitted.current = false;
      setAutofillStatus('idle');
      if (otp[idx]) { const next = [...otp]; next[idx] = ''; setOtp(next); }
      else if (idx > 0) { const next = [...otp]; next[idx - 1] = ''; setOtp(next); inputs.current[idx - 1]?.focus(); }
    }
  }

  async function handleVerify() {
    if (!pendingMobile || isLoading || hasSubmitted.current) return;
    hasSubmitted.current = true;
    try { await verifyOtp(pendingMobile, otp.join('')); }
    finally { hasSubmitted.current = false; }
  }

  async function handleResend() {
    if (countdown > 0 || !pendingMobile) return;
    await resendOtp(pendingMobile);
    setOtp(Array(OTP_LENGTH).fill(''));
    setCountdown(30);
    setAutofillStatus('idle');
    clearError();
    hasSubmitted.current = false;
    lastClipboard.current = '';
    inputs.current[0]?.focus();
  }

  /* ── derived ── */
  const otpFilled = otp.every(d => d !== '');
  const maskedNumber = pendingMobile ? `+91 ${pendingMobile}` : '—';
  const errorKind = detectErrorKind(error);

  /* ════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView
      style={[s.kav, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* Crimson hero band */}
      <LinearGradient
        colors={['#1E40AF', '#2563EB']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.topBand, { paddingTop: insets.top + 28 }]}
      >
        <View style={s.bandCircle} />
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={24} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.shieldWrap}>
          <View style={s.shieldInner}>
            <ShieldCheck size={30} color={PRIMARY} strokeWidth={2} />
          </View>
        </View>
        <Text style={s.bandTitle}>Verify Your Number</Text>
        <Text style={s.bandSub}>OTP sent to <Text style={{ fontWeight: '700', color: '#fff' }}>{maskedNumber}</Text></Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginTop: 6 }}>
          <Text style={s.changeLink}>Change number</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Error banners ── */}
        {error && errorKind === 'expired' && (
          <FadeBanner>
            <View style={[s.banner, s.bannerWarning]}>
              <Clock size={16} color={WARNING} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: WARNING }]}>OTP has expired.</Text>
                <Text style={s.bannerSub}>Request a new OTP using the Resend button below.</Text>
              </View>
            </View>
          </FadeBanner>
        )}
        {error && errorKind === 'too_many' && (
          <FadeBanner>
            <View style={[s.banner, s.bannerDanger]}>
              <AlertOctagon size={16} color={DANGER} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: DANGER }]}>Too many incorrect attempts.</Text>
                <Text style={s.bannerSub}>Please try again after 5 minutes.</Text>
              </View>
            </View>
          </FadeBanner>
        )}
        {error && errorKind === 'network' && (
          <FadeBanner>
            <View style={[s.banner, s.bannerDanger]}>
              <AlertTriangle size={16} color={DANGER} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: DANGER }]}>Something went wrong.</Text>
                <Text style={s.bannerSub}>Check your connection and try again.</Text>
              </View>
            </View>
          </FadeBanner>
        )}
        {error && errorKind === 'wrong' && (
          <FadeBanner>
            <View style={[s.banner, s.bannerDanger]}>
              <AlertTriangle size={16} color={DANGER} strokeWidth={2} />
              <Text style={[s.bannerTitle, { color: DANGER, flex: 1 }]}>Invalid OTP. Please try again.</Text>
            </View>
          </FadeBanner>
        )}

        {/* Autofill success */}
        {autofillStatus === 'detected' && !error && (
          <FadeBanner>
            <View style={[s.banner, s.bannerSuccess]}>
              <CheckCircle size={14} color={SUCCESS} strokeWidth={2} />
              <Text style={[s.bannerTitle, { color: SUCCESS }]}>OTP detected automatically</Text>
            </View>
          </FadeBanner>
        )}

        {/* OTP hint */}
        <Text style={s.boxHint}>Enter the 6-digit code</Text>

        {/* OTP boxes — shake + scale both applied */}
        <Animated.View style={[
          s.otpRow,
          { transform: [{ scale: rowScale }, { translateX: shakeAnim }] },
        ]}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              ref={r => { inputs.current[idx] = r; }}
              style={[
                s.otpBox,
                digit ? s.otpBoxFilled : null,
                error && errorKind !== 'network' ? s.otpBoxError : null,
                autofillStatus === 'detected' && digit ? s.otpBoxAutofill : null,
              ]}
              value={digit}
              onChangeText={v => handleChange(v, idx)}
              onKeyPress={e => handleKeyPress(e, idx)}
              keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
              importantForAutofill="yes"
              maxLength={OTP_LENGTH}
              textAlign="center"
              selectTextOnFocus
              autoFocus={idx === 0}
              caretHidden
              editable={!isLoading}
            />
          ))}
        </Animated.View>

        {/* Verifying indicator */}
        {isLoading ? (
          <View style={s.verifyingRow}>
            <ActivityIndicator size="small" color={PRIMARY} />
            <Text style={s.verifyingText}>Verifying…</Text>
          </View>
        ) : null}

        {/* Verify button */}
        <View style={s.btnWrap}>
          <PrimaryButton
            label="Verify & Sign In"
            onPress={handleVerify}
            loading={isLoading}
            disabled={!otpFilled || isLoading}
          />
        </View>

        {/* Resend */}
        <TouchableOpacity
          style={s.resendRow}
          onPress={handleResend}
          disabled={countdown > 0 || isLoading}
          activeOpacity={0.7}
        >
          {countdown > 0 ? (
            <View style={s.resendCountdownRow}>
              <Clock size={13} color="#94A3B8" strokeWidth={2} />
              <Text style={s.resendCountdownTxt}>Resend OTP ({fmtCountdown(countdown)})</Text>
            </View>
          ) : (
            <Text style={s.resendLink}>Resend OTP</Text>
          )}
        </TouchableOpacity>

        {/* Tip */}
        <View style={s.tipRow}>
          <Text style={s.tipText}>Auto-reads OTP from SMS on iOS &amp; Android</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kav: { flex: 1 },

  topBand: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 36, overflow: 'hidden' },
  bandCircle: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)' },
  backBtn: { position: 'absolute', top: Platform.OS === 'web' ? 76 : 54, left: 16, padding: 6, zIndex: 10 },
  shieldWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  shieldInner: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  bandTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
  bandSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  changeLink: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textDecorationLine: 'underline' },

  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28 },

  /* Banners */
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, padding: 13, marginBottom: 14 },
  bannerDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  bannerWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  bannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  bannerTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  bannerSub: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 17 },

  /* OTP row */
  boxHint: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  otpRow: { flexDirection: 'row', gap: 8, marginBottom: 24, justifyContent: 'center', width: '100%' },
  otpBox: {
    flex: 1, maxWidth: 52, height: 58, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF',
    fontSize: 22, fontWeight: '700', color: '#1E293B',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  otpBoxFilled: { borderColor: PRIMARY, backgroundColor: '#EFF6FF', color: PRIMARY },
  otpBoxError: { borderColor: DANGER, backgroundColor: '#FEF2F2' },
  otpBoxAutofill: { borderColor: SUCCESS, backgroundColor: '#F0FDF4', color: SUCCESS },

  verifyingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  verifyingText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  btnWrap: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },

  resendRow: { alignItems: 'center', marginBottom: 20 },
  resendCountdownRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  resendCountdownTxt: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  resendLink: { fontSize: 14, color: PRIMARY, fontWeight: '700' },

  tipRow: { alignItems: 'center' },
  tipText: { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
});
