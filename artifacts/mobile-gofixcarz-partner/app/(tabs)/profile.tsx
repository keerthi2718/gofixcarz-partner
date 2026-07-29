import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import GarageService from '@/src/services/garage.service';
import type { WorkingHours } from '@/src/types';
import {
  ChevronRight, LogOut, HelpCircle, Shield, Info, Lock,
  Camera, Sun, Moon, CheckCircle,
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
  readOnly = false, prefix, onBlur,
}: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; capitalize?: any; readOnly?: boolean; prefix?: string; onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const lineColor = focused && !readOnly ? PRIMARY : LINE;
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
      </View>
    </View>
  );
}
const ui = StyleSheet.create({
  wrap:    { paddingVertical: 4 },
  row:     { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingBottom: 8, paddingTop: 2 },
  prefix:  { fontSize: 15, color: TEXT, marginRight: 6 },
  input:   { flex: 1, fontSize: 15, color: TEXT, padding: 0 },
  readOnly:{ color: MUTED },
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

function AddressInput({ value, onChange, onSelect }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (parts: { address: string; city: string; state: string; pincode: string; country: string }) => void;
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
      <View style={[ui.row, { borderBottomColor: focused ? PRIMARY : LINE }]}>
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
        {loading && <ActivityIndicator size="small" color={PRIMARY} />}
      </View>
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

/* ─────────────── DayPill ────────────── */
function DayPill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[dp.pill, on && dp.pillOn]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[dp.lbl, on && dp.lblOn]}>{label[0]}</Text>
    </TouchableOpacity>
  );
}
const dp = StyleSheet.create({
  pill:   { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1.5, borderColor: LINE, backgroundColor: '#F9FAFB' },
  pillOn: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  lbl:    { fontSize: 13, fontWeight: '800', color: MUTED },
  lblOn:  { color: '#fff' },
});

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
  const [workDays,    setWorkDays]    = useState<string[]>([]);
  const [openTime,    setOpenTime]    = useState(makeTime(9));
  const [closeTime,   setCloseTime]   = useState(makeTime(19));
  const [pickerFor,   setPickerFor]   = useState<'open' | 'close' | null>(null);

  const [saving,      setSaving]      = useState(false);
  const profilePopulated = useRef(false);
  const garagePopulated  = useRef(false);

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

  /* ── Populate from queries ── */
  useEffect(() => {
    if (profilePopulated.current || !profile) return;
    setName(profile.name ?? '');
    setEmail(profile.email ?? '');
    setPhone(profile.mobile ?? '');
    profilePopulated.current = true;
  }, [profile]);

  useEffect(() => {
    if (garagePopulated.current || !garage) return;
    setGarageName(garage.name ?? '');
    setOwner(garage.owner ?? '');
    setGaragePhone((garage as any).phone ?? '');
    setGarageEmail((garage as any).email ?? '');
    setAddress(garage.address ?? '');
    setCity(garage.city ?? '');
    setStateVal((garage as any).state ?? '');
    setZipcode(garage.zipcode ?? '');
    if (garage.working_hours) {
      const active = Object.entries(garage.working_hours).filter(([, v]) => !v.closed).map(([d]) => d);
      setWorkDays(active);
      const first = Object.values(garage.working_hours).find(v => !v.closed);
      if (first) { setOpenTime(dateFromHHMM(first.open)); setCloseTime(dateFromHHMM(first.close)); }
    }
    garagePopulated.current = true;
  }, [garage]);

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
    if (!res.canceled && res.assets[0]) setLogoUri(res.assets[0].uri);
  }

  /* ── Save both ── */
  async function save() {
    setSaving(true);
    try {
      const working_hours: WorkingHours = {};
      DAYS.forEach(day => {
        working_hours[day] = { open: fmt24(openTime), close: fmt24(closeTime), closed: !workDays.includes(day) };
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
      router.back();
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
          <UnderlineInput label="Garage Name" value={garageName} onChange={setGarageName} capitalize="words" />
          <View style={s.gap} />
          <UnderlineInput label="Owner / Manager" value={owner} onChange={setOwner} capitalize="words" />
          <View style={s.gap} />
          <UnderlineInput label="Phone Number" value={garagePhone}
            onChange={v => setGaragePhone(v.replace(/\D/g,'').slice(0,10))}
            keyboard="phone-pad" prefix="🇮🇳 +91" />
          <View style={s.gap} />
          <UnderlineInput label="Garage Email ID" value={garageEmail}
            onChange={setGarageEmail} keyboard="email-address" capitalize="none" />

          {/* ── Location ── */}
          <SectionHeader title="Location" />
          {/* Address with Google Places */}
          <AddressInput
            value={address}
            onChange={setAddress}
            onSelect={({ address: a, city: c, state: st, pincode: p, country: co }) => {
              setAddress(a);
              if (c)  setCity(c);
              if (st) setStateVal(st);
              if (p)  setZipcode(p);
            }}
          />
          <View style={s.gap} />
          <TwoCol>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="City" value={city} onChange={setCity} capitalize="words" />
            </View>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="State" value={stateVal} onChange={setStateVal} capitalize="words" />
            </View>
          </TwoCol>
          <View style={s.gap} />
          <UnderlineInput label="PIN Code" value={zipcode}
            onChange={v => setZipcode(v.replace(/\D/g,'').slice(0,6))}
            keyboard="number-pad" />

          {/* ── Working Hours ── */}
          <SectionHeader title="Working Hours" />
          <Text style={s.microLabel}>Working Days</Text>
          <View style={s.daysRow}>
            {DAYS.map(d => (
              <DayPill key={d} label={d} on={workDays.includes(d)}
                onPress={() => setWorkDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} />
            ))}
          </View>
          <View style={[s.timesRow, { marginTop: 16 }]}>
            <TouchableOpacity style={s.timeBtn} onPress={() => setPickerFor('open')} activeOpacity={0.8}>
              <Sun size={14} color="#F97316" strokeWidth={2} />
              <Text style={s.timeBtnLabel}>Opens at</Text>
              <Text style={s.timeBtnValue}>{fmt12(openTime)}</Text>
              <ChevronRight size={14} color={MUTED} strokeWidth={2} />
            </TouchableOpacity>
            <View style={s.timeDivider} />
            <TouchableOpacity style={s.timeBtn} onPress={() => setPickerFor('close')} activeOpacity={0.8}>
              <Moon size={14} color="#7C3AED" strokeWidth={2} />
              <Text style={s.timeBtnLabel}>Closes at</Text>
              <Text style={s.timeBtnValue}>{fmt12(closeTime)}</Text>
              <ChevronRight size={14} color={MUTED} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {workDays.length > 0 && (
            <View style={s.hoursSummary}>
              <CheckCircle size={12} color={SUCCESS} strokeWidth={2} />
              <Text style={s.hoursSummaryTxt}>
                <Text style={{ fontWeight: '700' }}>{workDays.join(' · ')}</Text>
                {'  ·  '}{fmt12(openTime)} – {fmt12(closeTime)}
              </Text>
            </View>
          )}

          <TimePickerModal visible={pickerFor === 'open'}  label="Opening Time" value={openTime}
            onConfirm={d => { setOpenTime(d); setPickerFor(null); }}  onCancel={() => setPickerFor(null)} />
          <TimePickerModal visible={pickerFor === 'close'} label="Closing Time" value={closeTime}
            onConfirm={d => { setCloseTime(d); setPickerFor(null); }} onCancel={() => setPickerFor(null)} />

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

  /* Days */
  microLabel: { fontSize: 10.5, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  daysRow:    { flexDirection: 'row', gap: 5 },

  /* Times */
  timesRow:     { flexDirection: 'row', borderWidth: 1.5, borderColor: LINE, borderRadius: 10, overflow: 'hidden' },
  timeBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 14 },
  timeBtnLabel: { flex: 1, fontSize: 13, color: MUTED },
  timeBtnValue: { fontSize: 14, fontWeight: '700', color: TEXT },
  timeDivider:  { width: 1.5, backgroundColor: LINE },

  /* Hours summary */
  hoursSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 10, padding: 11,
    backgroundColor: '#F0FDF4', borderRadius: 9, borderWidth: 1, borderColor: '#BBF7D0',
  },
  hoursSummaryTxt: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 18 },

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
