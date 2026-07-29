import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import GarageService from '@/src/services/garage.service';
import ProfileService from '@/src/services/profile.service';
import type { WorkingHours } from '@/src/types';
import {
  Camera, Mail, Phone, MapPin, Briefcase, User, Hash,
  Clock, Sun, Moon, CheckCircle, Bell, HelpCircle, Shield,
  LogOut, ChevronRight, Check, Pencil, Wrench, Star,
  Navigation, Flag, Building2, Edit2, X,
} from 'lucide-react-native';

/* ─────────────────────────── Tokens ─────────────────────────── */
const BG      = '#F2F4F7';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#0D1117';
const MUTED   = '#6B7280';
const BORDER  = '#E5E7EB';
const DANGER  = '#DC2626';
const SUCCESS = '#059669';
const WARN    = '#D97706';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ALL_SERVICES = [
  'Oil Change', 'Tyre Rotation', 'Wheel Alignment', 'Wheel Balancing',
  'Battery Replacement', 'Brake Service', 'AC Service', 'AC Repair',
  'Engine Tune-Up', 'Suspension Repair', 'Clutch Repair', 'Gearbox Service',
  'Denting & Painting', 'Car Wash', 'Detailing', 'Insurance Repair',
  'Electrical Repair', 'Windshield Repair', 'Exhaust Repair', 'Full Service',
];

/* ─────────────────────────── Helpers ────────────────────────── */
function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function makeTime(h: number, m = 0) {
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function dateFromHHMM(s: string): Date {
  const [h = 9, m = 0] = (s || '').split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function formatTime12(d: Date) {
  let h = d.getHours();
  const min = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(min).padStart(2, '0')} ${ampm}`;
}
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'G';
}

/* ─────────────────────────── SectionCard ───────────────────── */
function SectionCard({ title, Icon, iconBg, iconColor = PRIMARY, right, children }: {
  title: string; Icon: any; iconBg: string; iconColor?: string;
  right?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={[sc.iconCircle, { backgroundColor: iconBg }]}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={sc.title}>{title}</Text>
        {right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
});

/* ─────────────────────────── FieldRow ──────────────────────── */
function FieldRow({
  Icon, iconBg = '#F3F4F6', iconColor = MUTED,
  label, value, onChange, placeholder,
  keyboard, capitalize = 'sentences',
  prefix, readOnly = false, last = false,
}: {
  Icon: any; iconBg?: string; iconColor?: string;
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: any; capitalize?: any;
  prefix?: string; readOnly?: boolean; last?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fr.wrap, !last && fr.divider]}>
      <View style={[fr.iconSlot, { backgroundColor: focused ? '#FEF2F2' : iconBg }]}>
        <Icon size={15} color={focused ? PRIMARY : iconColor} strokeWidth={2} />
      </View>
      <View style={fr.mid}>
        <Text style={fr.label}>{label}</Text>
        <View style={fr.inputRow}>
          {prefix ? <Text style={fr.prefix}>{prefix} </Text> : null}
          <TextInput
            style={[fr.input, readOnly && { color: MUTED }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboard}
            autoCapitalize={capitalize}
            editable={!readOnly}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
        {focused && <View style={fr.focusLine} />}
      </View>
      {readOnly && <ChevronRight size={14} color="#D1D5DB" strokeWidth={2} />}
    </View>
  );
}
const fr = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  iconSlot: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mid: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  prefix: { fontSize: 15, fontWeight: '700', color: TEXT, marginRight: 4 },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT, padding: 0 },
  focusLine: { height: 1.5, backgroundColor: PRIMARY, marginTop: 4, borderRadius: 1 },
});

/* ─────────────────────────── TimePickerModal ───────────────── */
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
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={tp.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={tp.toolbarTitle}>{label}</Text>
          <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={tp.done}>Done</Text>
          </TouchableOpacity>
        </View>
        <DateTimePicker
          value={draft} mode="time" is24Hour display="spinner"
          onChange={(_: DateTimePickerEvent, sel?: Date) => { if (sel) setDraft(sel); }}
          style={tp.picker} textColor={TEXT}
        />
      </View>
    </Modal>
  );
}
const tp = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 24 },
      default: {},
    }),
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  toolbarTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: TEXT },
  cancel: { fontSize: 15, color: MUTED, fontWeight: '500', minWidth: 60 },
  done:   { fontSize: 15, color: PRIMARY, fontWeight: '700', textAlign: 'right', minWidth: 60 },
  picker: { width: '100%', height: 200 },
});

/* ─────────────────────────── WorkingHoursCard ──────────────── */
function WorkingHoursCard({
  workDays, toggleDay,
  openTime, setOpenTime,
  closeTime, setCloseTime,
}: {
  workDays: string[]; toggleDay: (d: string) => void;
  openTime: Date; setOpenTime: (d: Date) => void;
  closeTime: Date; setCloseTime: (d: Date) => void;
}) {
  const [pickerFor, setPickerFor] = useState<'open' | 'close' | null>(null);

  return (
    <SectionCard title="Working Hours" Icon={Clock} iconBg="#FEF3C7" iconColor={WARN}>
      {/* Day selector */}
      <View style={wh.daysWrap}>
        <Text style={wh.daysLabel}>WORKING DAYS</Text>
        <View style={wh.daysRow}>
          {DAYS.map(d => {
            const on = workDays.includes(d);
            return (
              <TouchableOpacity
                key={d}
                style={[wh.dayBtn, on && wh.dayBtnOn]}
                onPress={() => toggleDay(d)}
                activeOpacity={0.75}
              >
                <Text style={[wh.dayLetter, on && wh.dayLetterOn]}>{d[0]}</Text>
                <Text style={[wh.dayFull, on && wh.dayFullOn]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={wh.timesWrap}>
        <Text style={wh.daysLabel}>BUSINESS HOURS</Text>
        {/* Open row */}
        <TouchableOpacity style={wh.timeRow} onPress={() => setPickerFor('open')} activeOpacity={0.8}>
          <View style={[wh.timeIcon, { backgroundColor: '#FFF7ED' }]}>
            <Sun size={16} color="#F97316" strokeWidth={2} />
          </View>
          <Text style={wh.timeLabel}>Opens at</Text>
          <View style={wh.timePill}>
            <Text style={wh.timePillText}>{formatTime12(openTime)}</Text>
          </View>
          <ChevronRight size={14} color="#D1D5DB" strokeWidth={2} />
        </TouchableOpacity>

        <View style={wh.innerDivider} />

        {/* Close row */}
        <TouchableOpacity style={[wh.timeRow, { paddingBottom: 4 }]} onPress={() => setPickerFor('close')} activeOpacity={0.8}>
          <View style={[wh.timeIcon, { backgroundColor: '#EDE9FE' }]}>
            <Moon size={16} color="#7C3AED" strokeWidth={2} />
          </View>
          <Text style={wh.timeLabel}>Closes at</Text>
          <View style={wh.timePill}>
            <Text style={wh.timePillText}>{formatTime12(closeTime)}</Text>
          </View>
          <ChevronRight size={14} color="#D1D5DB" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Summary pill */}
      {workDays.length > 0 && (
        <View style={wh.summaryRow}>
          <CheckCircle size={13} color={SUCCESS} strokeWidth={2} />
          <Text style={wh.summaryText}>
            <Text style={{ fontWeight: '700' }}>
              {workDays.length === 7 ? 'Every day' : workDays.length === 5 && !workDays.includes('Sat') && !workDays.includes('Sun') ? 'Mon – Fri' : workDays.join(' · ')}
            </Text>
            {'  ·  '}
            {formatTime12(openTime)} – {formatTime12(closeTime)}
          </Text>
        </View>
      )}

      <TimePickerModal
        visible={pickerFor === 'open'} label="Opening Time" value={openTime}
        onConfirm={d => { setOpenTime(d); setPickerFor(null); }}
        onCancel={() => setPickerFor(null)}
      />
      <TimePickerModal
        visible={pickerFor === 'close'} label="Closing Time" value={closeTime}
        onConfirm={d => { setCloseTime(d); setPickerFor(null); }}
        onCancel={() => setPickerFor(null)}
      />
    </SectionCard>
  );
}

const wh = StyleSheet.create({
  daysWrap:  { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  daysLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },
  daysRow:   { flexDirection: 'row', gap: 5 },
  dayBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9,
    borderRadius: 10, backgroundColor: BG,
    borderWidth: 1.5, borderColor: BORDER,
  },
  dayBtnOn:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayLetter:   { fontSize: 13, fontWeight: '800', color: MUTED, lineHeight: 17 },
  dayLetterOn: { color: '#fff' },
  dayFull:     { fontSize: 8.5, fontWeight: '600', color: '#9CA3AF', lineHeight: 12 },
  dayFullOn:   { color: 'rgba(255,255,255,0.75)' },

  timesWrap:  { paddingHorizontal: 16, paddingTop: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  timeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT },
  timePill: {
    backgroundColor: BG, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1.5, borderColor: BORDER,
  },
  timePillText: { fontSize: 15, fontWeight: '700', color: TEXT },
  innerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginBottom: 14 },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginTop: 0, padding: 12,
    backgroundColor: '#F0FDF4', borderRadius: 10,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  summaryText: { flex: 1, fontSize: 12.5, color: '#166534', lineHeight: 18 },
});

/* ════════════════════════ Main Screen ══════════════════════════ */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  /* ── State ── */
  const [logoUri,    setLogoUri]    = useState<string | null>(null);
  const [garageName, setGarageName] = useState('');
  const [ownerName,  setOwnerName]  = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [stateVal,   setStateVal]   = useState('');
  const [zipcode,    setZipcode]    = useState('');
  const [openTime,   setOpenTime]   = useState(makeTime(9));
  const [closeTime,  setCloseTime]  = useState(makeTime(19));
  const [workDays,   setWorkDays]   = useState<string[]>([]);
  const [services,   setServices]   = useState<string[]>([]);
  const [saving,     setSaving]     = useState(false);

  const populated = useRef(false);

  /* ── Queries ── */
  const { data: garage, isLoading: garageLoading } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn: GarageService.get,
  });
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: ProfileService.get,
  });
  const isLoading = garageLoading || profileLoading;

  /* ── Populate ── */
  useEffect(() => {
    if (populated.current) return;
    if (!garage && !profile) return;

    if (garage) {
      setGarageName(garage.name ?? '');
      setOwnerName(garage.owner ?? '');
      setAddress(garage.address ?? '');
      setCity(garage.city ?? '');
      setStateVal((garage as any).state ?? '');
      setZipcode(garage.zipcode ?? '');

      if (garage.working_hours) {
        const activeDays = Object.entries(garage.working_hours)
          .filter(([, v]) => !v.closed)
          .map(([day]) => day);
        setWorkDays(activeDays);
        const firstActive = Object.values(garage.working_hours).find(v => !v.closed);
        if (firstActive) {
          setOpenTime(dateFromHHMM(firstActive.open));
          setCloseTime(dateFromHHMM(firstActive.close));
        }
      }
    }
    if (profile) {
      setEmail(profile.email ?? '');
      setPhone(profile.mobile ?? '');
      if (!garage?.owner && profile.name) setOwnerName(profile.name);
    }
    populated.current = true;
  }, [garage, profile]);

  /* ── Mutations ── */
  const garageMut  = useMutation({ mutationFn: GarageService.update,  onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE  }) });
  const profileMut = useMutation({ mutationFn: ProfileService.update, onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }) });

  /* ── Logo picker ── */
  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to upload your logo.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!res.canceled && res.assets[0]) setLogoUri(res.assets[0].uri);
  }

  function toggleDay(d: string) { setWorkDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]); }
  function toggleService(s: string) { setServices(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]); }

  async function save() {
    if (!garageName.trim()) { Alert.alert('Required', 'Please enter your garage name.'); return; }
    setSaving(true);
    try {
      const working_hours: WorkingHours = {};
      DAYS.forEach(day => {
        working_hours[day] = { open: fmt(openTime), close: fmt(closeTime), closed: !workDays.includes(day) };
      });
      await Promise.all([
        garageMut.mutateAsync({
          name: garageName.trim(), owner: ownerName.trim() || null,
          address: address.trim() || null, city: city.trim() || null,
          zipcode: zipcode.trim() || null, working_hours,
        }),
        profileMut.mutateAsync({ name: ownerName.trim() || null, email: email.trim() || null }),
      ]);
      Alert.alert('Saved ✓', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* ── Derived ── */
  const initials = getInitials(garageName);
  const location = [city, stateVal].filter(Boolean).join(', ');
  const isOpenNow = (() => {
    if (!workDays.length) return false;
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = dayNames[now.getDay()];
    if (!workDays.includes(today)) return false;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const oMin = openTime.getHours() * 60 + openTime.getMinutes();
    const cMin = closeTime.getHours() * 60 + closeTime.getMinutes();
    return nowMin >= oMin && nowMin < cMin;
  })();

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top bar ── */}
      <View style={[s.topBar, { paddingTop: topPad + 10 }]}>
        <Text style={s.topBarTitle}>My Profile</Text>
        <TouchableOpacity style={s.editBtn} onPress={pickLogo} activeOpacity={0.8}>
          <Edit2 size={15} color={PRIMARY} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>Loading profile…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 90 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Hero Card ── */}
          <View style={s.heroCard}>
            {/* Avatar */}
            <TouchableOpacity style={s.avatarWrap} onPress={pickLogo} activeOpacity={0.85}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={s.avatarImg} />
              ) : (
                <LinearGradient
                  colors={['#921527', '#C41E3A']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.avatarGrad}
                >
                  <Text style={s.avatarInitials}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={s.cameraBadge}>
                <Camera size={11} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            {/* Identity */}
            <View style={s.heroMeta}>
              <Text style={s.heroName} numberOfLines={1}>{garageName || 'Your Garage'}</Text>
              {ownerName ? <Text style={s.heroOwner}>{ownerName}</Text> : null}
              {location ? (
                <View style={s.heroLocation}>
                  <MapPin size={11} color={MUTED} strokeWidth={2} />
                  <Text style={s.heroLocationText}>{location}</Text>
                </View>
              ) : null}
            </View>

            {/* Status badge */}
            <View style={[s.statusBadge, { backgroundColor: isOpenNow ? '#F0FDF4' : '#FEF2F2' }]}>
              <View style={[s.statusDot, { backgroundColor: isOpenNow ? SUCCESS : DANGER }]} />
              <Text style={[s.statusText, { color: isOpenNow ? SUCCESS : DANGER }]}>
                {isOpenNow ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* ── Stats row ── */}
          <View style={s.statsRow}>
            {[
              { label: 'Services', value: String(services.length || '—') },
              { label: 'Work Days', value: workDays.length === 7 ? 'All' : workDays.length > 0 ? `${workDays.length}d` : '—' },
              { label: 'Hours', value: workDays.length > 0 ? `${formatTime12(openTime).replace(' ', '')}` : '—' },
            ].map((stat, i) => (
              <View key={i} style={[s.statCell, i < 2 && s.statDivider]}>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Garage Info ── */}
          <SectionCard title="Business Details" Icon={Briefcase} iconBg="#FEE2E2" iconColor={PRIMARY}>
            <FieldRow Icon={Building2} iconBg="#FEE2E2" iconColor={PRIMARY}
              label="Garage Name" value={garageName} onChange={setGarageName}
              placeholder="e.g. Sharma Auto Works" capitalize="words" />
            <FieldRow Icon={User} iconBg="#F3F4F6" iconColor={MUTED}
              label="Owner Name" value={ownerName} onChange={setOwnerName}
              placeholder="Full name" capitalize="words" last />
          </SectionCard>

          {/* ── Contact ── */}
          <SectionCard title="Contact" Icon={Phone} iconBg="#F0FDF4" iconColor={SUCCESS}>
            <FieldRow Icon={Mail} iconBg="#F0FDF4" iconColor={SUCCESS}
              label="Email Address" value={email} onChange={setEmail}
              placeholder="you@garage.com" keyboard="email-address" capitalize="none" />
            <FieldRow Icon={Phone} iconBg="#F3F4F6" iconColor={MUTED}
              label="Phone Number" value={phone} onChange={() => {}}
              placeholder="Mobile number" keyboard="phone-pad" prefix="+91"
              readOnly last />
          </SectionCard>

          {/* ── Location ── */}
          <SectionCard title="Location" Icon={MapPin} iconBg="#EDE9FE" iconColor="#7C3AED">
            <FieldRow Icon={MapPin} iconBg="#EDE9FE" iconColor="#7C3AED"
              label="Street Address" value={address} onChange={setAddress}
              placeholder="Plot / Door no, Street name" capitalize="words" />
            <FieldRow Icon={Navigation} iconBg="#F3F4F6" iconColor={MUTED}
              label="City" value={city} onChange={setCity}
              placeholder="City" capitalize="words" />
            <FieldRow Icon={Flag} iconBg="#F3F4F6" iconColor={MUTED}
              label="State" value={stateVal} onChange={setStateVal}
              placeholder="State" capitalize="words" />
            <FieldRow Icon={Hash} iconBg="#F3F4F6" iconColor={MUTED}
              label="PIN Code" value={zipcode}
              onChange={v => setZipcode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN" keyboard="number-pad" last />
          </SectionCard>

          {/* ── Working Hours ── */}
          <WorkingHoursCard
            workDays={workDays} toggleDay={toggleDay}
            openTime={openTime} setOpenTime={setOpenTime}
            closeTime={closeTime} setCloseTime={setCloseTime}
          />

          {/* ── Services ── */}
          <SectionCard
            title="Services Offered"
            Icon={Wrench} iconBg="#FEE2E2" iconColor={PRIMARY}
            right={
              <View style={s.svcCounter}>
                <Text style={s.svcCounterText}>{services.length} selected</Text>
              </View>
            }
          >
            <View style={s.svcGrid}>
              {ALL_SERVICES.map(svc => {
                const on = services.includes(svc);
                return (
                  <TouchableOpacity
                    key={svc}
                    style={[s.svcChip, on && s.svcChipOn]}
                    onPress={() => toggleService(svc)}
                    activeOpacity={0.75}
                  >
                    {on && <Check size={11} color={PRIMARY} strokeWidth={3} />}
                    <Text style={[s.svcText, on && s.svcTextOn]}>{svc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* ── App Links ── */}
          <SectionCard title="More" Icon={Star} iconBg="#FFFBEB" iconColor={WARN}>
            {[
              { Icon: Bell,        label: 'Notifications',   iconBg: '#FFFBEB', iconColor: WARN    },
              { Icon: HelpCircle,  label: 'Help & Support',  iconBg: '#EDE9FE', iconColor: '#7C3AED' },
              { Icon: Shield,      label: 'Privacy Policy',  iconBg: '#F0FDF4', iconColor: SUCCESS  },
            ].map(({ Icon, label, iconBg, iconColor }, i, arr) => (
              <TouchableOpacity
                key={label}
                style={[s.menuRow, i < arr.length - 1 && s.menuDivider]}
                activeOpacity={0.75}
              >
                <View style={[s.menuIcon, { backgroundColor: iconBg }]}>
                  <Icon size={16} color={iconColor} strokeWidth={2} />
                </View>
                <Text style={s.menuLabel}>{label}</Text>
                <ChevronRight size={16} color="#D1D5DB" strokeWidth={2} />
              </TouchableOpacity>
            ))}
          </SectionCard>

          {/* ── Sign out ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <View style={s.logoutIcon}>
              <LogOut size={16} color={DANGER} strokeWidth={2} />
            </View>
            <Text style={s.logoutText}>Sign Out</Text>
            <ChevronRight size={16} color={DANGER + '66'} strokeWidth={2} />
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* ── Footer ── */}
      {!isLoading && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            onPress={save} disabled={saving} activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveTxt}>Save Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Top bar */
  topBar: {
    backgroundColor: CARD, paddingHorizontal: 20, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  editBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: MUTED, fontWeight: '500' },

  body: { paddingHorizontal: 16, paddingTop: 16 },

  /* Hero */
  heroCard: {
    backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 20, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  avatarWrap:    { position: 'relative', flexShrink: 0 },
  avatarGrad:    { width: 66, height: 66, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarImg:     { width: 66, height: 66, borderRadius: 18 },
  avatarInitials:{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  cameraBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PRIMARY, borderWidth: 2, borderColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  heroMeta:         { flex: 1 },
  heroName:         { fontSize: 17, fontWeight: '800', color: TEXT, letterSpacing: -0.3, marginBottom: 2 },
  heroOwner:        { fontSize: 13, color: MUTED, marginBottom: 4 },
  heroLocation:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLocationText: { fontSize: 12, color: MUTED },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    flexShrink: 0, alignSelf: 'flex-start',
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  /* Stats */
  statsRow: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  statCell:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: BORDER },
  statValue:   { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.4, marginBottom: 3 },
  statLabel:   { fontSize: 11, color: MUTED, fontWeight: '600' },

  /* Services */
  svcCounter: {
    backgroundColor: '#FEE2E2', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 3,
  },
  svcCounterText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  svcGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: 16,
  },
  svcChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER,
  },
  svcChipOn: { backgroundColor: '#FEF2F2', borderColor: PRIMARY + '66' },
  svcText:   { fontSize: 12.5, color: MUTED, fontWeight: '500' },
  svcTextOn: { color: PRIMARY, fontWeight: '600' },

  /* Menu */
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  menuIcon:    { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  menuLabel:   { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
  },
  logoutIcon: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '600', color: DANGER },

  /* Footer */
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: CARD,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
