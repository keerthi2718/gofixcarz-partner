import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Wrench, Shield, Star, Users, AlertTriangle, CheckCircle, X } from 'lucide-react-native';
import { useAuth } from '@/src/context/AuthContext';

/* ─────────────── Tokens ─────────────── */
const PRIMARY = '#C41E3A';
const DANGER  = '#DC2626';
const SUCCESS = '#16A34A';
const MUTED   = '#94A3B8';
const TEXT    = '#0F172A';

/* ── Shadow helpers ── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  android: { elevation: 4 },
  default: {},
});
const SHADOW_LOGO = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

/* ── India flag SVG ── */
function IndiaFlag() {
  return (
    <Svg width={20} height={16} viewBox="0 0 512 512">
      <Path fill="#f98000" d="M0 85.3h512v113.8H0z" />
      <Path fill="#fff" d="M0 199.1h512v113.8H0z" />
      <Path fill="#008000" d="M0 312.9h512v113.8H0z" />
      <Circle cx={256} cy={256} r={40} fill="#000080" />
      <Circle cx={256} cy={256} r={32} fill="#fff" />
      <Path fill="#000080" d="M256 216l2 40-2 40-2-40zm0 80l-2-40 2-40 2 40zm40-40l-40 2-40-2 40-2zm-80 0l40-2 40 2-40 2zm28.3-28.3l28.3 28.3-28.3 28.3-28.3-28.3zm-56.6 56.6l28.3-28.3 28.3 28.3-28.3 28.3zm56.6 0l-28.3-28.3-28.3 28.3 28.3 28.3zm-56.6-56.6l28.3 28.3 28.3-28.3-28.3-28.3z" />
    </Svg>
  );
}

/* ── FadeInMsg ── */
function FadeInMsg({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/* ════════════════════ Screen ════════════════════ */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();

  const [mobile,  setMobile]  = useState('');
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  function handleChange(raw: string) {
    clearError();
    setMobile(raw.replace(/\D/g, '').slice(0, 10));
  }

  const isValid = mobile.length === 10;
  const isEmpty = touched && mobile.length === 0;
  const isTooShort = touched && mobile.length > 0 && mobile.length < 10;

  // Derive border color:
  // error/invalid → red | valid → green | focused → primary | default → grey
  function getBorderColor() {
    if (error || isEmpty || isTooShort) return DANGER;
    if (isValid && touched) return SUCCESS;
    if (focused) return PRIMARY;
    return '#E2E8F0';
  }
  const borderColor = getBorderColor();
  const bgColor = (error || isEmpty || isTooShort)
    ? '#FEF2F2'
    : (isValid && touched)
    ? '#F0FDF4'
    : '#F8FAFC';

  // Inline validation message
  const validationMsg: string | null =
    isEmpty            ? 'Mobile number is required.'
    : isTooShort       ? 'Please enter a valid 10-digit mobile number.'
    : error            ? error
    : null;

  const showSuccess = isValid && touched && !error;

  async function handleSendOtp() {
    setTouched(true);
    if (!isValid) return;
    await signIn(mobile);
  }

  return (
    <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top area */}
        <View style={[s.topArea, { paddingTop: 64 + insets.top }]}>
          <View style={[s.logoMark, SHADOW_LOGO]}>
            <Wrench size={28} color={PRIMARY} strokeWidth={2.5} />
          </View>
          <Text style={s.appName}>GoFixCarz</Text>
          <Text style={s.portalLabel}>Partner Portal</Text>
        </View>

        {/* Main card */}
        <View style={[s.card, SHADOW_CARD]}>
          <Text style={s.welcomeTitle}>Welcome back</Text>
          <Text style={s.welcomeSub}>Enter your mobile number to continue</Text>

          {/* Phone input */}
          <View style={[s.inputRow, { borderColor, backgroundColor: bgColor, borderWidth: 1.5 }]}>
            <IndiaFlag />
            <Text style={s.countryCode}>+91</Text>
            <View style={s.divider} />
            <TextInput
              style={s.textInput}
              value={mobile}
              onChangeText={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => { setFocused(false); setTouched(true); }}
              onSubmitEditing={handleSendOtp}
              placeholder="98765 43210"
              placeholderTextColor={MUTED}
              keyboardType="phone-pad"
              returnKeyType="done"
              maxLength={10}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />
            {/* Right-side status icon */}
            {(isEmpty || isTooShort || !!error) && (
              <AlertTriangle size={17} color={DANGER} strokeWidth={2} style={{ marginRight: 4 }} />
            )}
            {showSuccess && (
              <CheckCircle size={17} color={SUCCESS} strokeWidth={2} style={{ marginRight: 4 }} />
            )}
          </View>

          {/* Inline validation message */}
          {validationMsg ? (
            <FadeInMsg>
              <View style={s.inlineError}>
                <AlertTriangle size={12} color={DANGER} strokeWidth={2.5} />
                <Text style={s.inlineErrorTxt}>{validationMsg}</Text>
              </View>
            </FadeInMsg>
          ) : showSuccess ? (
            <FadeInMsg>
              <View style={s.inlineSuccess}>
                <CheckCircle size={12} color={SUCCESS} strokeWidth={2.5} />
                <Text style={s.inlineSuccessTxt}>Looks good!</Text>
              </View>
            </FadeInMsg>
          ) : null}

          {/* Send OTP */}
          <TouchableOpacity
            style={[s.otpButton, (!isValid || isLoading) && s.otpButtonDisabled]}
            onPress={handleSendOtp}
            activeOpacity={0.7}
            disabled={!isValid || isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.otpButtonText}>Send OTP</Text>
            }
          </TouchableOpacity>

          <Text style={s.termsText}>
            {'By continuing, you agree to our '}
            <Text style={s.termsLink}>Terms &amp; Privacy</Text>
          </Text>
        </View>

        {/* Sign-up link */}
        <TouchableOpacity style={s.signupRow} onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
          <Text style={s.signupText}>
            {'New garage owner? '}
            <Text style={s.signupLink}>Create account</Text>
          </Text>
        </TouchableOpacity>

        {/* Trust strip */}
        <View style={s.trustStrip}>
          {[
            { Icon: Shield, label: 'Secure Login' },
            { Icon: Star,   label: '4.8 Rated' },
            { Icon: Users,  label: '2,000+ Garages' },
          ].map(({ Icon, label }) => (
            <View key={label} style={s.trustItem}>
              <Icon size={14} color={MUTED} />
              <Text style={s.trustLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  kav:    { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flexGrow: 1 },

  topArea:     { alignItems: 'center', paddingHorizontal: 16 },
  logoMark:    { width: 56, height: 56, backgroundColor: '#FFFFFF', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  appName:     { fontSize: 24, fontWeight: '700', color: TEXT, marginTop: 16 },
  portalLabel: { fontSize: 14, color: MUTED, marginTop: 4 },

  card:         { marginHorizontal: 16, marginTop: 40, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: TEXT },
  welcomeSub:   { fontSize: 14, color: MUTED, marginTop: 4 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 20, borderRadius: 12, height: 52, paddingHorizontal: 16,
  },
  countryCode: { fontSize: 14, fontWeight: '700', color: TEXT },
  divider:     { width: 1, height: 16, backgroundColor: '#E2E8F0' },
  textInput:   { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT, paddingVertical: 0, includeFontPadding: false },

  inlineError:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  inlineErrorTxt:{ fontSize: 12, color: DANGER },
  inlineSuccess:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  inlineSuccessTxt:{ fontSize: 12, color: SUCCESS, fontWeight: '500' },

  otpButton:         { marginTop: 20, width: '100%', height: 52, backgroundColor: PRIMARY, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  otpButtonDisabled: { opacity: 0.55 },
  otpButtonText:     { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  termsText: { marginTop: 16, textAlign: 'center', fontSize: 12, color: MUTED },
  termsLink: { color: PRIMARY },

  signupRow:  { marginTop: 24, alignItems: 'center' },
  signupText: { fontSize: 14, color: MUTED, textAlign: 'center' },
  signupLink: { color: PRIMARY, fontWeight: '700' },

  trustStrip: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32, paddingBottom: 8 },
  trustItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustLabel: { fontSize: 10, color: MUTED, fontWeight: '500' },
});
