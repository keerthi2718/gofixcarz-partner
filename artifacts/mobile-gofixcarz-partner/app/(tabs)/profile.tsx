import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import { STORAGE_KEYS } from '@/src/constants/storage';
import StorageService from '@/src/services/storage.service';
import ProfileService from '@/src/services/profile.service';
import GarageService from '@/src/services/garage.service';
import type { WorkingHours } from '@/src/types';
import {
  ChevronRight, LogOut, HelpCircle, Shield, Info, Lock,
  Camera, Sun, Moon, CheckCircle, AlertTriangle,
} from 'lucide-react-native';

/* ─────────────── Tokens ─────────────── */
const BG      = '#FFFFFF';
const TEXT    = '#1A1A1A';
const MUTED   = '#9CA3AF';
const LINE    = '#D1D5DB';
const PRIMARY = '#C41E3A';
const DANGER  = '#DC2626';
const SUCCESS = '#16A34A';
const WARN    = '#D97706';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

/* ─────────────── Helpers ────────────── */
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}
function fmt24(d: Date) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function makeTime(h: number, m = 0) { const d = new Date(); d.setHours(h, m, 0, 0); return d; }
function dateFromHHMM(s: string) { const [h=9,m=0]=(s||'').split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0); return d; }
function fmt12(d: Date) { let h=d.getHours(); const min=d.getMinutes(); const ap=h>=12?'PM':'AM'; h=h%12||12; return `${h}:${String(min).padStart(2,'0')} ${ap}`; }

/* ─────────────── Debounce ───────────── */
function useDebounce<T>(val: T, ms: number): T {
  const [v, setV] = useState(val);
  useEffect(() => { const t = setTimeout(() => setV(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return v;
}

/* ─────────────── SectionHeader ─────── */
function SectionHeader({ title }: { title: string }) {
  return <Text style={sh.text}>{title}</Text>;
}
const sh = StyleSheet.create({
  text: { fontSize: 12, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, marginTop: 28 },
});

/* ─────────────── UnderlineInput ─────── */
function UnderlineInput({
  label, value, onChange, keyboard, capitalize = 'sentences',
  readOnly = false, prefix, onBlur, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; capitalize?: any; readOnly?: boolean; prefix?: string; onBlur?: () => void;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lineColor = error ? DANGER : focused && !readOnly ? PRIMARY : LINE;
  return (
    <View style={ui.wrap}>
      <View style={[ui.row, { borderBottomColor: lineColor }]}>
        {prefix ? <Text style={ui.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[ui.input, readOnly && ui.readOnly]}
          value={value} onChangeText={onChange}
          placeholder={label} placeholderTextColor={MUTED}
          keyboardType={keyboard} autoCapitalize={capitalize}
          editable={!readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
        />
        {error ? <AlertTriangle size={15} color={DANGER} strokeWidth={2} /> : null}
      </View>
      {error ? <Text style={ui.error}>{error}</Text> : null}
    </View>
  );
}
const ui = StyleSheet.create({
  wrap:    { paddingVertical: 4 },
  row:     { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingBottom: 8, paddingTop: 2 },
  prefix:  { fontSize: 15, color: TEXT, marginRight: 6 },
  input:   { flex: 1, fontSize: 15, color: TEXT, padding: 0 },
  readOnly:{ color: MUTED },
  error:   { fontSize: 11.5, color: DANGER, marginTop: 4 },
});

/* ─────────────── TwoCol ─────────────── */
function TwoCol({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 20 }}>{children}</View>;
}

/* ─────────────── AddressInput (Google Places) ─────────────── */
interface Suggestion {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

function AddressInput({ value, onChange, onSelect, error }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (parts: { address: string; city: string; state: string; pincode: string; country: string }) => void;
  error?: string;
}) {
  const [focused,     setFocused]     = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [show,        setShow]        = useState(false);
  const debounced = useDebounce(value, 400);

  useEffect(() => {
    if (!GOOGLE_KEY || debounced.length < 3) { setSuggestions([]); setShow(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(debounced)}&types=address&components=country:in&key=${GOOGLE_KEY}`
    )
      .then(r => r.json())
      .then(d => { if (!cancelled) { setSuggestions(d.predictions ?? []); setShow((d.predictions ?? []).length > 0); } })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  async function pick(s: Suggestion) {
    setShow(false); onChange(s.description);
    if (!GOOGLE_KEY) return;
    try {
      const res  = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.place_id}&fields=address_components,formatted_address&key=${GOOGLE_KEY}`);
      const data = await res.json();
      const comps: { types: string[]; long_name: string }[] = data.result?.address_components ?? [];
      const get = (t: string) => comps.find(c => c.types.includes(t))?.long_name ?? '';
      onSelect({ address: data.result?.formatted_address ?? s.description, city: get('locality') || get('administrative_area_level_2'), state: get('administrative_area_level_1'), pincode: get('postal_code'), country: get('country') });
    } catch {}
  }

  return (
    <View style={addr.wrap}>
      <View style={[ui.row, { borderBottomColor: error ? DANGER : focused ? PRIMARY : LINE }]}>
        <TextInput
          style={ui.input}
          value={value}
          onChangeText={v => { onChange(v); setShow(v.length >= 3); }}
          placeholder="Street Address"
          placeholderTextColor={MUTED}
          autoCapitalize="words"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTimeout(() => setShow(false), 350); }}
        />
        {loading
          ? <ActivityIndicator size="small" color={PRIMARY} />
          : error ? <AlertTriangle size={15} color={DANGER} strokeWidth={2} /> : null}
      </View>
      {error ? <Text style={ui.error}>{error}</Text> : null}
      {show && suggestions.length > 0 && (
        <View style={addr.list}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s.place_id}
              style={[addr.item, i < suggestions.length - 1 && addr.itemBorder]}
              onPress={() => pick(s)} activeOpacity={0.7}
            >
              <Text style={addr.main} numberOfLines={1}>{s.structured_formatting.main_text}</Text>
              <Text style={addr.sub}  numberOfLines={1}>{s.structured_formatting.secondary_text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
const addr = StyleSheet.create({
  wrap: { paddingVertical: 4, zIndex: 10 },
  list: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
    backgroundColor: BG, borderRadius: 8, borderWidth: 1, borderColor: LINE,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10 }, android: { elevation: 6 }, default: {} }),
  },
  item:       { paddingHorizontal: 12, paddingVertical: 10 },
  itemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  main:       { fontSize: 13, fontWeight: '600', color: TEXT },
  sub:        { fontSize: 11, color: MUTED, marginTop: 1 },
});

/* ─────────────── DaySched type ─────── */
type DaySched = { open: Date; close: Date; active: boolean };
function makeDefaultSchedules(): Record<string, DaySched> {
  return Object.fromEntries(
    DAYS.map(d => [d, { open: makeTime(9), close: makeTime(19), active: d !== 'Sun' }])
  );
}

/* ─────────────── TimePickerModal ─────── */
function TimePickerModal({ visible, label, value, onConfirm, onCancel }: {
  visible: boolean; label: string; value: Date;
  onConfirm: (d: Date) => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (visible) setDraft(value); }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={tp.backdrop} />
      </TouchableWithoutFeedback>
      <View style={tp.sheet}>
        <View style={tp.handle} />
        <View style={tp.toolbar}>
          <TouchableOpacity onPress={onCancel}><Text style={tp.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={tp.title}>{label}</Text>
          <TouchableOpacity onPress={() => onConfirm(draft)}><Text style={tp.done}>Done</Text></TouchableOpacity>
        </View>
        <DateTimePicker value={draft} mode="time" is24Hour display="spinner"
          onChange={(_: DateTimePickerEvent, sel?: Date) => { if (sel) setDraft(sel); }}
          style={tp.picker} textColor={TEXT} />
      </View>
    </Modal>
  );
}
const tp = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: LINE, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  toolbar:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  title:    { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: TEXT },
  cancel:   { fontSize: 15, color: MUTED, fontWeight: '500', minWidth: 60 },
  done:     { fontSize: 15, color: PRIMARY, fontWeight: '700', textAlign: 'right', minWidth: 60 },
  picker:   { width: '100%', height: 200 },
});

/* ─────────────── ToggleRow ──────────── */
function ToggleRow({ label, sub, value, onChange, last = false }: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[tr.row, !last && tr.border]}>
      <View style={tr.mid}>
        <Text style={tr.label}>{label}</Text>
        {sub ? <Text style={tr.sub}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: PRIMARY + '66' }}
        thumbColor={value ? PRIMARY : '#F3F4F6'}
        ios_backgroundColor="#E5E7EB" />
    </View>
  );
}
const tr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  border:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  mid:   { flex: 1, marginRight: 8 },
  label: { fontSize: 15, color: TEXT, fontWeight: '500' },
  sub:   { fontSize: 12, color: MUTED, marginTop: 2 },
});

/* ─────────────── LinkRow ────────────── */
function LinkRow({ label, value, last = false }: { label: string; value?: string; last?: boolean }) {
  return (
    <TouchableOpacity style={[lr.row, !last && lr.border]} activeOpacity={0.75}>
      <Text style={lr.label}>{label}</Text>
      {value ? <Text style={lr.value}>{value}</Text> : <ChevronRight size={16} color={MUTED} strokeWidth={2} />}
    </TouchableOpacity>
  );
}
const lr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  border:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  label: { flex: 1, fontSize: 15, color: TEXT, fontWeight: '500' },
  value: { fontSize: 14, color: MUTED },
});

/* ════════════════════ Main ══════════════════ */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  /* ── Logo state ── */
  const [logoUri,     setLogoUri]     = useState<string | null>(null);

  /* ── Personal state ── */
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [notifJobs,   setNotifJobs]   = useState(true);
  const [notifPromo,  setNotifPromo]  = useState(false);

  /* ── Garage state ── */
  const [garageName,  setGarageName]  = useState('');
  const [owner,       setOwner]       = useState('');
  const [garagePhone, setGaragePhone] = useState('');
  const [garageEmail, setGarageEmail] = useState('');
  const [address,     setAddress]     = useState('');
  const [city,        setCity]        = useState('');
  const [stateVal,    setStateVal]    = useState('');
  const [zipcode,     setZipcode]     = useState('');
  const [schedules,   setSchedules]   = useState<Record<string, DaySched>>(makeDefaultSchedules);
  const [pickerFor,   setPickerFor]   = useState<{ day: string; slot: 'open' | 'close' } | null>(null);

  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const profilePopulated = useRef(false);

  /* ── Queries ── */
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: ProfileService.get,
  });
  const { data: garage, isLoading: loadingGarage } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn: GarageService.get,
  });

  const isLoading = loadingProfile || loadingGarage;

  /* ── Populate form once both queries have resolved ── */
  useEffect(() => {
    if (profilePopulated.current) return;   // already done
    if (!profile || !garage) return;        // wait for both

    // Personal
    setName(profile.name ?? '');
    setEmail(profile.email ?? '');
    setPhone(profile.mobile ?? '');

    // Garage — garage value takes priority; fall back to profile for phone/email
    setGarageName(garage.name ?? '');
    setOwner(garage.owner ?? '');
    setGaragePhone(garage.phone || profile.mobile || '');
    setGarageEmail((garage.email || profile.email || '').trim());
    setAddress(garage.address ?? '');
    setCity(garage.city ?? '');
    setStateVal(garage.state ?? '');
    setZipcode(garage.zipcode ?? '');

    if (garage.working_hours) {
      const updated = makeDefaultSchedules();
      Object.entries(garage.working_hours).forEach(([day, v]) => {
        updated[day] = { open: dateFromHHMM(v.open), close: dateFromHHMM(v.close), active: !v.closed };
      });
      setSchedules(updated);
    }

    if (garage.logo_url) {
      setLogoUri(garage.logo_url);
    } else {
      StorageService.get(STORAGE_KEYS.GARAGE_LOGO).then((cached: string | null) => {
        if (cached) setLogoUri(cached);
      });
    }

    profilePopulated.current = true;
  }, [profile, garage]);

  /* ── Mutations ── */
  const profileMut = useMutation({
    mutationFn: ProfileService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }),
  });
  const garageMut = useMutation({
    mutationFn: (p: Parameters<typeof GarageService.update>[0]) => GarageService.update(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE }),
  });

  /* ── Logo picker ── */
  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to upload a logo.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;

    const picked = res.assets[0].uri;

    // Copy to persistent app directory so the URI survives across sessions
    const ext  = picked.split('.').pop()?.toLowerCase() ?? 'jpg';
    const dest = `${FileSystem.documentDirectory}garage_logo.${ext}`;
    try {
      await FileSystem.copyAsync({ from: picked, to: dest });
    } catch {
      // If copy fails, fall back to the original temp URI
    }
    const persistentUri = dest;

    // Show immediately in UI
    setLogoUri(persistentUri);

    // Cache locally so it survives component unmount
    await StorageService.set(STORAGE_KEYS.GARAGE_LOGO, persistentUri);

    // Upload to server (silently — non-blocking)
    GarageService.uploadLogo(persistentUri).then(serverUrl => {
      if (serverUrl) {
        setLogoUri(serverUrl);
        StorageService.set(STORAGE_KEYS.GARAGE_LOGO, serverUrl);
      }
    }).catch(() => {
      // Server upload failed (endpoint may not be live yet); local cache still works
    });
  }

  /* ── Validate ── */
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!garageName.trim())                         e.garageName  = 'Garage name is required.';
    if (!garagePhone.trim())                        e.garagePhone = 'Phone number is required.';
    else if (garagePhone.replace(/\D/g,'').length < 10) e.garagePhone = 'Enter a valid 10-digit phone number.';
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))             e.email       = 'Enter a valid email address.';
    if (garageEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(garageEmail.trim())) e.garageEmail = 'Enter a valid email address.';
    if (!address.trim())                            e.address     = 'Street address is required.';
    if (!city.trim())                               e.city        = 'City is required.';
    if (!stateVal.trim())                           e.state       = 'State is required.';
    if (!zipcode.trim())                            e.zipcode     = 'PIN code is required.';
    else if (zipcode.replace(/\D/g,'').length < 6) e.zipcode     = 'Enter a valid 6-digit PIN code.';
    if (!DAYS.some(d => schedules[d].active))       e.workDays    = 'Select at least one working day.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function clearError(key: string) {
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  /* ── Save both ── */
  async function save() {
    if (!validate()) return;
    setSaving(true);
    try {
      const working_hours: WorkingHours = {};
      DAYS.forEach(day => {
        working_hours[day] = { open: fmt24(schedules[day].open), close: fmt24(schedules[day].close), closed: !schedules[day].active };
      });
      await Promise.all([
        profileMut.mutateAsync({ name: name.trim() || null, email: email.trim() || null }),
        garageMut.mutateAsync({
          name:             garageName.trim() || null,
          owner:            owner.trim() || null,
          phone:            garagePhone.trim() || null,
          email:            garageEmail.trim() || null,
          address:          address.trim() || null,
          city:             city.trim() || null,
          state:            stateVal.trim() || null,
          zipcode:          zipcode.trim() || null,
          working_hours,
        }),
      ]);
      router.push('/(tabs)/more' as never);
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  }

  /* ── Derived ── */
  const displayName = garageName || name || profile?.mobile || 'Garage';
  const initials    = getInitials(displayName);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  /* ─────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Text style={s.headerTitle}>My Profile</Text>
        {memberSince && <Text style={s.headerSub}>Partner since {memberSince}</Text>}
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Garage Logo ── */}
          <View style={s.logoSection}>
            <TouchableOpacity style={s.logoWrap} onPress={pickLogo} activeOpacity={0.85}>
              {logoUri
                ? <Image source={{ uri: logoUri }} style={s.logoImg} />
                : (
                  <View style={s.logoCircle}>
                    <Text style={s.logoInitials}>{initials}</Text>
                  </View>
                )
              }
              <View style={s.logoCameraBadge}>
                <Camera size={12} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            <Text style={s.logoHint}>Tap to update garage logo</Text>
          </View>

          {/* ── Garage Details ── */}
          <SectionHeader title="Garage Details" />
          <UnderlineInput label="Garage Name*" value={garageName}
            onChange={v => { setGarageName(v); clearError('garageName'); }}
            capitalize="words" error={errors.garageName} />
          <View style={s.gap} />
          <UnderlineInput label="Owner / Manager" value={owner} onChange={setOwner} capitalize="words" />
          <View style={s.gap} />
          <UnderlineInput label="Phone Number*" value={garagePhone}
            onChange={v => { setGaragePhone(v.replace(/\D/g,'').slice(0,10)); clearError('garagePhone'); }}
            keyboard="phone-pad" prefix="🇮🇳 +91" error={errors.garagePhone} />

          {/* ── Location ── */}
          <SectionHeader title="Location" />
          <AddressInput
            value={address}
            onChange={v => { setAddress(v); clearError('address'); }}
            onSelect={({ address: a, city: c, state: st, pincode: p }) => {
              setAddress(a); clearError('address');
              if (c)  { setCity(c);     clearError('city'); }
              if (st) { setStateVal(st); clearError('state'); }
              if (p)  { setZipcode(p);  clearError('zipcode'); }
            }}
            error={errors.address}
          />
          <View style={s.gap} />
          <TwoCol>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="City*" value={city}
                onChange={v => { setCity(v); clearError('city'); }}
                capitalize="words" error={errors.city} />
            </View>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="State*" value={stateVal}
                onChange={v => { setStateVal(v); clearError('state'); }}
                capitalize="words" error={errors.state} />
            </View>
          </TwoCol>
          <View style={s.gap} />
          <UnderlineInput label="PIN Code*" value={zipcode}
            onChange={v => { setZipcode(v.replace(/\D/g,'').slice(0,6)); clearError('zipcode'); }}
            keyboard="number-pad" error={errors.zipcode} />

          {/* ── Working Hours ── */}
          <SectionHeader title="Working Hours" />

          <View style={s.hoursCard}>
            {/* ── Header row ── */}
            <View style={s.hoursCardHeaderRow}>
              <Text style={s.hoursCardTitle}>Set Hours Per Day</Text>
              <Text style={s.hoursCardHint}>Tap a time to edit</Text>
            </View>

            {/* ── One row per day ── */}
            {DAYS.map((day, idx) => {
              const sched = schedules[day];
              return (
                <View key={day}>
                  {idx > 0 && <View style={s.dayDivider} />}
                  <View style={s.dayRow}>
                    {/* Toggle chip */}
                    <TouchableOpacity
                      style={[s.dayChip, sched.active && s.dayChipOn]}
                      onPress={() => { setSchedules(p => ({ ...p, [day]: { ...p[day], active: !p[day].active } })); clearError('workDays'); }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.dayChipTxt, sched.active && s.dayChipTxtOn]}>{day}</Text>
                    </TouchableOpacity>

                    {sched.active ? (
                      <View style={s.dayTimesRow}>
                        {/* Open time */}
                        <TouchableOpacity
                          style={s.dayTimeBtn}
                          onPress={() => setPickerFor({ day, slot: 'open' })}
                          activeOpacity={0.75}
                        >
                          <Sun size={11} color="#F97316" strokeWidth={2.5} />
                          <Text style={s.dayTimeTxt}>{fmt12(sched.open)}</Text>
                        </TouchableOpacity>

                        <Text style={s.dayTimeSep}>–</Text>

                        {/* Close time */}
                        <TouchableOpacity
                          style={s.dayTimeBtn}
                          onPress={() => setPickerFor({ day, slot: 'close' })}
                          activeOpacity={0.75}
                        >
                          <Moon size={11} color="#7C3AED" strokeWidth={2.5} />
                          <Text style={s.dayTimeTxt}>{fmt12(sched.close)}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={s.dayClosedBadge}>
                        <Text style={s.dayClosedTxt}>Closed</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* ── Validation error ── */}
            {errors.workDays ? (
              <View style={s.daysError}>
                <AlertTriangle size={12} color={DANGER} strokeWidth={2} />
                <Text style={s.daysErrorTxt}>{errors.workDays}</Text>
              </View>
            ) : null}
          </View>

          {/* Single shared time picker modal */}
          <TimePickerModal
            visible={!!pickerFor}
            label={pickerFor
              ? `${pickerFor.day} — ${pickerFor.slot === 'open' ? 'Opening' : 'Closing'} Time`
              : ''}
            value={pickerFor ? schedules[pickerFor.day][pickerFor.slot] : makeTime(9)}
            onConfirm={d => {
              if (pickerFor) setSchedules(p => ({ ...p, [pickerFor.day]: { ...p[pickerFor.day], [pickerFor.slot]: d } }));
              setPickerFor(null);
            }}
            onCancel={() => setPickerFor(null)}
          />

          {/* ── Notifications ── */}
          <SectionHeader title="Notifications" />
          <ToggleRow label="Job Alerts" sub="New bookings & status changes" value={notifJobs} onChange={setNotifJobs} />
          <ToggleRow label="Promotions & Updates" sub="GoFixCarz news and offers" value={notifPromo} onChange={setNotifPromo} last />

        </ScrollView>
      )}

      {/* Footer Save */}
      {!isLoading && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            onPress={save} disabled={saving} activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ─────────────── Styles ─────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: BG, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  headerSub:   { fontSize: 12, color: MUTED, marginTop: 3 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body:        { paddingHorizontal: 20, paddingTop: 10 },
  gap:         { height: 12 },

  /* Logo */
  logoSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 4 },
  logoWrap:    { position: 'relative' },
  logoImg:     { width: 88, height: 88, borderRadius: 20 },
  logoCircle:  { width: 88, height: 88, borderRadius: 20, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  logoInitials:{ fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  logoCameraBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#1F2937', borderWidth: 2.5, borderColor: BG,
    alignItems: 'center', justifyContent: 'center',
  },
  logoHint: { fontSize: 12, color: MUTED, marginTop: 10 },

  /* Working Hours card */
  hoursCard: {
    backgroundColor: '#F8FAFC', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden', marginBottom: 4,
  },
  hoursCardHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  hoursCardTitle: { fontSize: 12, fontWeight: '700', color: TEXT },
  hoursCardHint:  { fontSize: 11, color: MUTED, fontStyle: 'italic' },

  /* Per-day row */
  dayDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', marginLeft: 16 },
  dayRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
  },

  /* Day toggle chip */
  dayChip: {
    width: 46, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  dayChipOn:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayChipTxt:   { fontSize: 11, fontWeight: '700', color: MUTED },
  dayChipTxtOn: { color: '#fff' },

  /* Times */
  dayTimesRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayTimeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 8,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingVertical: 6, paddingHorizontal: 8,
  },
  dayTimeTxt:  { fontSize: 12, fontWeight: '600', color: TEXT },
  dayTimeSep:  { fontSize: 13, color: MUTED, fontWeight: '300' },

  /* Closed badge */
  dayClosedBadge: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F5F9', borderRadius: 8,
    paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0',
  },
  dayClosedTxt: { fontSize: 12, color: MUTED, fontWeight: '500', letterSpacing: 0.3 },

  /* Error */
  daysError:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingBottom: 10 },
  daysErrorTxt: { fontSize: 11.5, color: DANGER },

  /* Logout */
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: DANGER, borderRadius: 10, paddingVertical: 14, marginTop: 32, marginBottom: 8,
  },
  logoutTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Footer */
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE,
  },
  saveBtn: { backgroundColor: PRIMARY, borderRadius: 10, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
