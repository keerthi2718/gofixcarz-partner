import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { Check } from 'lucide-react-native';

/* ─────────────── Tokens ─────────────── */
const BG      = '#FFFFFF';
const TEXT    = '#1A1A1A';
const MUTED   = '#9CA3AF';
const LINE    = '#D1D5DB';
const PRIMARY = '#C41E3A';
const DANGER  = '#DC2626';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

/* ─────────────── Debounce ───────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─────────────── Types ──────────────── */
interface Suggestion {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

/* ─────────────── UnderlineInput ─────── */
function UnderlineInput({
  label, required = false, value, onChange, onBlur,
  keyboard, capitalize = 'sentences', prefix, half = false,
  error, multiline = false,
}: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; onBlur?: () => void;
  keyboard?: any; capitalize?: any; prefix?: React.ReactNode;
  half?: boolean; error?: string; multiline?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const lineColor = error ? DANGER : focused ? PRIMARY : LINE;
  return (
    <View style={[ui.wrap, half && { flex: 1 }]}>
      <View style={[ui.row, { borderBottomColor: lineColor }]}>
        {prefix ? <View style={ui.prefixSlot}>{prefix}</View> : null}
        <TextInput
          style={ui.input}
          value={value}
          onChangeText={onChange}
          placeholder={required ? `${label}*` : label}
          placeholderTextColor={MUTED}
          keyboardType={keyboard}
          autoCapitalize={capitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
          multiline={multiline}
        />
      </View>
      {error ? <Text style={ui.error}>{error}</Text> : null}
    </View>
  );
}

/* ─────────────── AddressInput ──────────
   Same flat style but with live Place suggestions below */
function AddressInput({ value, onChange, onSelect }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (parts: { address: string; city: string; state: string; pincode: string; country: string }) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const debounced = useDebounce(value, 400);

  useEffect(() => {
    if (!GOOGLE_KEY || debounced.length < 3) { setSuggestions([]); setShow(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(debounced)}&types=address&components=country:in&key=${GOOGLE_KEY}`)
      .then(r => r.json())
      .then(d => { if (cancelled) return; setSuggestions(d.predictions ?? []); setShow((d.predictions ?? []).length > 0); })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  async function pick(s: Suggestion) {
    setShow(false);
    onChange(s.description);
    if (!GOOGLE_KEY) return;
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.place_id}&fields=address_components,formatted_address&key=${GOOGLE_KEY}`);
      const data = await res.json();
      const comps: { types: string[]; long_name: string }[] = data.result?.address_components ?? [];
      const get = (t: string) => comps.find(c => c.types.includes(t))?.long_name ?? '';
      onSelect({ address: data.result?.formatted_address ?? s.description, city: get('locality') || get('administrative_area_level_2'), state: get('administrative_area_level_1'), pincode: get('postal_code'), country: get('country') });
    } catch {}
  }

  return (
    <View style={[ui.wrap, { flex: 1 }]}>
      <View style={[ui.row, { borderBottomColor: focused ? PRIMARY : LINE }]}>
        <TextInput
          style={ui.input}
          value={value}
          onChangeText={v => { onChange(v); setShow(v.length >= 3); }}
          placeholder="Address"
          placeholderTextColor={MUTED}
          autoCapitalize="words"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTimeout(() => setShow(false), 350); }}
        />
        {loading ? <ActivityIndicator size="small" color={PRIMARY} style={{ marginBottom: 8 }} /> : null}
      </View>
      {show && suggestions.length > 0 && (
        <View style={ai.suggestionList}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s.place_id}
              style={[ai.item, i < suggestions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE }]}
              onPress={() => pick(s)}
              activeOpacity={0.7}
            >
              <Text style={ai.main} numberOfLines={1}>{s.structured_formatting.main_text}</Text>
              <Text style={ai.sub} numberOfLines={1}>{s.structured_formatting.secondary_text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const ai = StyleSheet.create({
  suggestionList: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
    backgroundColor: BG, borderRadius: 8, borderWidth: 1, borderColor: LINE,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  item: { paddingHorizontal: 12, paddingVertical: 9 },
  main: { fontSize: 13, fontWeight: '600', color: TEXT },
  sub:  { fontSize: 11, color: MUTED, marginTop: 2 },
});

/* ─────────────── FlagPrefix ─────────── */
function FlagPrefix() {
  return (
    <View style={fp.wrap}>
      <Text style={fp.flag}>🇮🇳</Text>
      <Text style={fp.caret}>▾</Text>
    </View>
  );
}
const fp = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 8, marginRight: 6 },
  flag:  { fontSize: 18, lineHeight: 22 },
  caret: { fontSize: 9, color: MUTED, lineHeight: 14 },
});

/* ─────────────── CheckBox ───────────── */
function CheckBox({ label, checked, onPress, linkLabel, onLinkPress }: {
  label: string; checked: boolean; onPress: () => void;
  linkLabel?: string; onLinkPress?: () => void;
}) {
  return (
    <TouchableOpacity style={cb.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[cb.box, checked && cb.boxOn]}>
        {checked && <Check size={11} color="#fff" strokeWidth={3.5} />}
      </View>
      <Text style={cb.label}>
        {label}
        {linkLabel ? (
          <Text style={cb.link} onPress={onLinkPress}> {linkLabel}</Text>
        ) : null}
      </Text>
    </TouchableOpacity>
  );
}
const cb = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  box:   { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  boxOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  label: { flex: 1, fontSize: 14, color: TEXT, lineHeight: 22 },
  link:  { color: PRIMARY, fontWeight: '700' },
});

/* ─────────────── WheelerBox ─────────── */
function WheelerBox({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={wb.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[wb.box, checked && wb.boxOn]}>
        {checked && <Check size={11} color="#fff" strokeWidth={3.5} />}
      </View>
      <Text style={[wb.label, checked && wb.labelOn]}>{label}</Text>
    </TouchableOpacity>
  );
}
const wb = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  box:    { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  boxOn:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  label:  { fontSize: 14, color: TEXT, fontWeight: '500' },
  labelOn:{ color: PRIMARY, fontWeight: '600' },
});

/* ─────────────── SectionLabel ──────── */
function SectionLabel({ title }: { title: string }) {
  return <Text style={sl.text}>{title}</Text>;
}
const sl = StyleSheet.create({
  text: { fontSize: 12, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, marginTop: 24 },
});

const ui = StyleSheet.create({
  wrap:       { paddingVertical: 4 },
  row:        { flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1.5, paddingBottom: 8, paddingTop: 2 },
  prefixSlot: { flexShrink: 0 },
  input:      { flex: 1, fontSize: 15, color: TEXT, padding: 0 },
  error:      { fontSize: 11.5, color: DANGER, marginTop: 4 },
});

/* ════════════════════ Main ══════════════════ */
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, error, clearError } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [form, setForm] = useState({
    firstName:    '',
    lastName:     '',
    workshopName: '',
    email:        '',
    address:      '',
    city:         '',
    state:        '',
    zipcode:      '',
    country:      'India',
    rtoNumber:    '',
    phone:        '',
    phone2:       '',
    wheelers:     [] as string[],
    acceptTerms:  false,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
    clearError();
  }

  function touch(key: string) {
    setTouched(t => ({ ...t, [key]: true }));
  }

  function toggleWheeler(id: string) {
    setForm(f => ({
      ...f,
      wheelers: f.wheelers.includes(id)
        ? f.wheelers.filter(w => w !== id)
        : [...f.wheelers, id],
    }));
  }

  const errors = {
    firstName:    touched.firstName    && !form.firstName    ? 'First name is required' : '',
    workshopName: touched.workshopName && !form.workshopName ? 'Workshop name is required' : '',
    phone:        touched.phone        && form.phone.length < 10 ? 'Enter a valid 10-digit number' : '',
    email:        touched.email        && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
                    ? 'Enter a valid email' : '',
    wheelers:     touched.wheelers     && form.wheelers.length === 0 ? 'Select at least one vehicle type' : '',
  };

  const isValid = !!(
    form.firstName &&
    form.workshopName &&
    form.phone.length >= 10 &&
    form.wheelers.length > 0 &&
    form.acceptTerms
  );

  const handleSubmit = useCallback(async () => {
    setTouched(t => ({ ...t, firstName: true, workshopName: true, phone: true, wheelers: true }));
    if (!isValid) return;
    await signUp({
      first_name:     form.firstName,
      last_name:      form.lastName   || null,
      mobile:         form.phone,
      email:          form.email      || '',
      workshop_name:  form.workshopName,
      address:        form.address    || null,
      city:           form.city       || null,
      state:          form.state      || null,
      zipcode:        form.zipcode    || null,
      country:        form.country    || null,
      mobile_2:       form.phone2     || null,
      wheelers:       form.wheelers.length > 0 ? form.wheelers : null,
      terms_accepted: true,
    });
  }, [form, isValid, signUp]);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.scroll, { paddingTop: topPad + 20, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <Image
          source={require('../../assets/images/logo_clean.png')}
          style={s.logo}
          resizeMode="contain"
        />

        <Text style={s.pageTitle}>Create Your Account</Text>

        {/* API error */}
        {error ? (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerTxt}>{error}</Text>
          </View>
        ) : null}

        {/* ── Personal Details ── */}
        <SectionLabel title="Personal Details" />
        <View style={s.twoCol}>
          <View style={{ flex: 1, zIndex: 1 }}>
            <UnderlineInput
              label="First name" required
              value={form.firstName}
              onChange={v => set('firstName', v)}
              onBlur={() => touch('firstName')}
              capitalize="words"
              error={errors.firstName}
            />
          </View>
          <View style={{ flex: 1, zIndex: 1 }}>
            <UnderlineInput
              label="Last Name"
              value={form.lastName}
              onChange={v => set('lastName', v)}
              capitalize="words"
            />
          </View>
        </View>

        {/* ── Workshop ── */}
        <SectionLabel title="Workshop Details" />
        <UnderlineInput
          label="WorkShop Name" required
          value={form.workshopName}
          onChange={v => set('workshopName', v)}
          onBlur={() => touch('workshopName')}
          capitalize="words"
          error={errors.workshopName}
        />
        <View style={s.gap} />

        <View style={[s.twoCol, { zIndex: 20 }]}>
          <UnderlineInput
            label="Email" required={false}
            value={form.email}
            onChange={v => set('email', v)}
            onBlur={() => touch('email')}
            keyboard="email-address"
            capitalize="none"
            half
            error={errors.email}
          />
          <AddressInput
            value={form.address}
            onChange={v => set('address', v)}
            onSelect={({ address, city, state, pincode, country }) => {
              setForm(f => ({ ...f, address, city: city || f.city, state: state || f.state, zipcode: pincode || f.zipcode, country: country || f.country }));
            }}
          />
        </View>
        <View style={s.gap} />

        <View style={s.twoCol}>
          <UnderlineInput label="City" value={form.city} onChange={v => set('city', v)} capitalize="words" half />
          <UnderlineInput label="State" value={form.state} onChange={v => set('state', v)} capitalize="words" half />
        </View>
        <View style={s.gap} />

        <View style={s.twoCol}>
          <UnderlineInput label="Zipcode" value={form.zipcode} onChange={v => set('zipcode', v.replace(/\D/g,'').slice(0,6))} keyboard="number-pad" half />
          <UnderlineInput label="Country" value={form.country} onChange={v => set('country', v)} capitalize="words" half />
        </View>
        <View style={s.gap} />

        <UnderlineInput
          label="RTO No." required
          value={form.rtoNumber}
          onChange={v => set('rtoNumber', v.toUpperCase())}
          capitalize="characters"
        />

        {/* ── Phone ── */}
        <SectionLabel title="Contact" />
        <View style={s.twoCol}>
          <View style={[{ flex: 1 }]}>
            <View style={[ui.row, { borderBottomColor: form.phone ? PRIMARY : LINE }]}>
              <FlagPrefix />
              <TextInput
                style={ui.input}
                value={form.phone}
                onChangeText={v => set('phone', v.replace(/\D/g,'').slice(0,10))}
                onBlur={() => touch('phone')}
                placeholder="Phone Number"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
              />
            </View>
            {errors.phone ? <Text style={ui.error}>{errors.phone}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <View style={[ui.row, { borderBottomColor: LINE }]}>
              <FlagPrefix />
              <TextInput
                style={ui.input}
                value={form.phone2}
                onChangeText={v => set('phone2', v.replace(/\D/g,'').slice(0,10))}
                placeholder="Phone Number 2"
                placeholderTextColor={MUTED}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* ── Wheelers ── */}
        <SectionLabel title="Vehicle Types" />
        {errors.wheelers ? <Text style={[ui.error, { marginBottom: 8 }]}>{errors.wheelers}</Text> : null}
        <View style={s.wheelersRow}>
          {['2W', '3W', '4W', '6W'].map(w => (
            <WheelerBox
              key={w}
              label={w}
              checked={form.wheelers.includes(w)}
              onPress={() => { toggleWheeler(w); touch('wheelers'); }}
            />
          ))}
        </View>

        {/* ── Terms ── */}
        <View style={s.termsRow}>
          <CheckBox
            label="I accept "
            linkLabel="Terms and conditions"
            checked={form.acceptTerms}
            onPress={() => set('acceptTerms', !form.acceptTerms)}
            onLinkPress={() => Linking.openURL('https://gofixcarz.com/terms')}
          />
        </View>

        {/* ── Submit ── */}
        <View style={s.footerRow}>
          <TouchableOpacity
            style={[s.sendBtn, (!isValid || isLoading) && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={!isValid || isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.sendTxt}>Send OTP</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={s.loginLink}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={s.loginLinkTxt}>Already Have an account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  logo: { width: 160, height: 60, alignSelf: 'center', marginBottom: 10 },

  pageTitle: {
    fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.4,
    textAlign: 'center', marginBottom: 4,
  },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 8,
    borderWidth: 1, borderColor: '#FECACA',
    padding: 12, marginTop: 12,
  },
  errorBannerTxt: { fontSize: 13, color: DANGER, lineHeight: 18 },

  twoCol:      { flexDirection: 'row', gap: 20 },
  gap:         { height: 10 },

  wheelersRow: { flexDirection: 'row', gap: 32, paddingVertical: 6 },

  termsRow: { marginTop: 20, marginBottom: 20 },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  sendBtn: {
    backgroundColor: PRIMARY, borderRadius: 8,
    paddingVertical: 14, paddingHorizontal: 28,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 140,
  },
  sendTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  loginLink: { paddingVertical: 4 },
  loginLinkTxt: { fontSize: 14, color: PRIMARY, fontWeight: '600', textDecorationLine: 'underline' },
});
