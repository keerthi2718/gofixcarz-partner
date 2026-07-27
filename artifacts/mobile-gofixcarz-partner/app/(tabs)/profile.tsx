import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthContext';

/* ── tokens ── */
const BG      = '#F4F4F8';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const INDIGO  = '#921527';
const TEXT    = '#1E293B';
const MUTED   = '#94A3B8';
const BORDER  = '#E8EAF0';
const TINT    = '#FEF2F2';
const DANGER  = '#EF4444';
const PH      = '#B0B8C4';

/* ── services list ── */
const ALL_SERVICES = [
  'Oil Change','Tyre Rotation','Wheel Alignment','Wheel Balancing',
  'Battery Replacement','Brake Service','AC Service','AC Repair',
  'Engine Tune-Up','Suspension Repair','Clutch Repair','Gearbox Service',
  'Denting & Painting','Car Wash','Detailing','Insurance Repair',
  'Electrical Repair','Windshield Repair','Exhaust Repair','Full Service',
];

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

/* ── helpers ── */
function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function t(h: number, m = 0) { const d = new Date(); d.setHours(h,m,0,0); return d; }

/* ── simple text row inside a group card ── */
function Row({
  icon, label, value, onChange, placeholder,
  keyboard, cap = 'sentences', prefix, last = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: React.ComponentProps<typeof TextInput>['keyboardType'];
  cap?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  prefix?: string; last?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[row.wrap, !last && row.divider]}>
      <View style={[row.iconBox, focused && row.iconBoxOn]}>
        <Feather name={icon} size={16} color={focused ? PRIMARY : MUTED} />
      </View>
      <View style={row.mid}>
        <Text style={row.label}>{label}</Text>
        <View style={row.inputRow}>
          {prefix ? <Text style={row.prefix}>{prefix} </Text> : null}
          <TextInput
            style={row.input}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={PH}
            keyboardType={keyboard}
            autoCapitalize={cap}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
      </View>
      <Feather name="chevron-right" size={16} color={BORDER} />
    </View>
  );
}
const row = StyleSheet.create({
  wrap:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  divider:   { borderBottomWidth: 1, borderBottomColor: BORDER },
  iconBox:   { width: 34, height: 34, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconBoxOn: { backgroundColor: TINT },
  mid:       { flex: 1 },
  label:     { fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  inputRow:  { flexDirection: 'row', alignItems: 'center' },
  prefix:    { fontSize: 14, fontWeight: '700', color: TEXT, marginRight: 2 },
  input:     { flex: 1, fontSize: 15, color: TEXT, padding: 0 },
});

/* ── group card wrapper ── */
function Group({ children }: { children: React.ReactNode }) {
  return <View style={g.card}>{children}</View>;
}
const g = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 16, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
});

/* ── section title ── */
function SectionTitle({ label }: { label: string }) {
  return <Text style={st.t}>{label}</Text>;
}
const st = StyleSheet.create({ t: { fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 } });

/* ── time picker pill ── */
function TimePill({ value, onChange, label }: { value: Date; onChange: (d: Date) => void; label: string }) {
  const [show, setShow] = useState(false);
  function onPick(_: DateTimePickerEvent, sel?: Date) {
    if (Platform.OS !== 'ios') setShow(false);
    if (sel) onChange(sel);
  }
  return (
    <View style={tp.wrap}>
      <Text style={tp.label}>{label}</Text>
      <TouchableOpacity style={tp.pill} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Feather name="clock" size={13} color={PRIMARY} />
        <Text style={tp.time}>{fmt(value)}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={value} mode="time" is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onPick} />
      )}
    </View>
  );
}
const tp = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center' },
  label: { fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 6 },
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TINT, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(196,30,58,0.18)', paddingHorizontal: 16, paddingVertical: 10, width: '100%', justifyContent: 'center' },
  time:  { fontSize: 17, fontWeight: '800', color: PRIMARY },
});

/* ════════════════════════════════════════════════════════════════════════ */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [logoUri,    setLogoUri]    = useState<string | null>(null);
  const [garageName, setGarageName] = useState('AutoCare Garage');
  const [ownerName,  setOwnerName]  = useState('Ramesh Patel');
  const [email,      setEmail]      = useState('ramesh@autocare.com');
  const [phone,      setPhone]      = useState('9876543210');
  const [address,    setAddress]    = useState('123 MG Road, Bangalore');
  const [openTime,   setOpenTime]   = useState(t(9));
  const [closeTime,  setCloseTime]  = useState(t(19));
  const [workDays,   setWorkDays]   = useState<string[]>(['Mon','Tue','Wed','Thu','Fri','Sat']);
  const [services,   setServices]   = useState<string[]>(['Oil Change','Brake Service','AC Service','Full Service','Tyre Rotation']);
  const [saving,     setSaving]     = useState(false);

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access to upload your logo.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.85 });
    if (!res.canceled && res.assets[0]) setLogoUri(res.assets[0].uri);
  }

  function toggleDay(d: string) {
    setWorkDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  }
  function toggleService(s: string) {
    setServices(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }

  function save() {
    if (!garageName.trim()) { Alert.alert('Required', 'Please enter your garage name.'); return; }
    setSaving(true);
    setTimeout(() => { setSaving(false); Alert.alert('✓ Saved', 'Profile updated successfully!'); }, 1000);
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />

      {/* ── Header bar ── */}
      <LinearGradient
        colors={[INDIGO, PRIMARY]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.header, { paddingTop: topPad + 12 }]}
      >
        <Text style={s.headerTitle}>My Profile</Text>
        <Text style={s.headerSub}>Manage your garage details</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Logo ── */}
        <View style={s.logoSection}>
          <TouchableOpacity onPress={pickLogo} activeOpacity={0.8} style={s.logoBtn}>
            {logoUri
              ? <Image source={{ uri: logoUri }} style={s.logoImg} />
              : (
                <View style={s.logoEmpty}>
                  <Feather name="camera" size={26} color={MUTED} />
                  <Text style={s.logoEmptyText}>Upload Logo</Text>
                </View>
              )
            }
            {/* overlay badge when image exists */}
            {logoUri && (
              <View style={s.logoBadge}>
                <Feather name="camera" size={13} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={s.logoName}>{garageName}</Text>
          <Text style={s.logoSub}>{ownerName}</Text>
        </View>

        {/* ── Garage info ── */}
        <SectionTitle label="GARAGE INFO" />
        <Group>
          <Row icon="briefcase" label="Garage Name" value={garageName} onChange={setGarageName} placeholder="e.g. AutoCare Garage" cap="words" />
          <Row icon="user" label="Owner Name" value={ownerName} onChange={setOwnerName} placeholder="Full name" cap="words" />
          <Row icon="map-pin" label="Address" value={address} onChange={setAddress} placeholder="Street, city" cap="words" last />
        </Group>

        {/* ── Contact ── */}
        <SectionTitle label="CONTACT" />
        <Group>
          <Row icon="mail" label="Email" value={email} onChange={setEmail} placeholder="you@garage.com" keyboard="email-address" cap="none" />
          <Row icon="phone" label="Phone" value={phone} onChange={v => setPhone(v.replace(/\D/g,'').slice(0,10))} placeholder="10-digit mobile" keyboard="phone-pad" prefix="+91" last />
        </Group>

        {/* ── Working hours ── */}
        <SectionTitle label="WORKING HOURS" />
        <Group>
          {/* Days */}
          <View style={s.daysWrap}>
            <Text style={s.daysHint}>Tap days your garage is open</Text>
            <View style={s.daysRow}>
              {DAYS.map(d => {
                const on = workDays.includes(d);
                return (
                  <TouchableOpacity key={d} style={[s.dayChip, on && s.dayOn]} onPress={() => toggleDay(d)} activeOpacity={0.7}>
                    <Text style={[s.dayText, on && s.dayTextOn]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Time pickers */}
          <View style={s.timesRow}>
            <TimePill value={openTime}  onChange={setOpenTime}  label="Opens at" />
            <View style={s.timeSep}><Text style={s.timeSepText}>–</Text></View>
            <TimePill value={closeTime} onChange={setCloseTime} label="Closes at" />
          </View>
        </Group>

        {/* ── Services ── */}
        <SectionTitle label="SERVICES OFFERED" />
        <Group>
          <View style={s.svcWrap}>
            <Text style={s.svcHint}>Select all services your garage provides</Text>
            <View style={s.svcGrid}>
              {ALL_SERVICES.map(svc => {
                const on = services.includes(svc);
                return (
                  <TouchableOpacity key={svc} style={[s.svcChip, on && s.svcOn]} onPress={() => toggleService(svc)} activeOpacity={0.7}>
                    {on && <Feather name="check" size={11} color={PRIMARY} style={{ marginRight: 3 }} />}
                    <Text style={[s.svcText, on && s.svcTextOn]}>{svc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.svcCount}>{services.length} selected</Text>
          </View>
        </Group>

        {/* ── App links ── */}
        <SectionTitle label="MORE" />
        <Group>
          {[
            { icon: 'bell'        as const, label: 'Notifications' },
            { icon: 'help-circle' as const, label: 'Help & Support' },
            { icon: 'shield'      as const, label: 'Privacy Policy' },
          ].map((item, i, arr) => (
            <TouchableOpacity key={item.label} style={[s.menuRow, i < arr.length - 1 && s.menuDivider]} activeOpacity={0.7}>
              <View style={s.menuIcon}>
                <Feather name={item.icon} size={17} color={MUTED} />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={BORDER} />
            </TouchableOpacity>
          ))}
        </Group>

        {/* ── Sign out ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <Feather name="log-out" size={17} color={DANGER} />
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Save ── */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.65 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveTxt}>Save Profile</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── styles ── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  body: { paddingHorizontal: 16, paddingTop: 20 },

  /* Logo */
  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoBtn:     { position: 'relative', marginBottom: 10 },
  logoImg: {
    width: 90, height: 90, borderRadius: 22,
    borderWidth: 3, borderColor: CARD,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  logoEmpty: {
    width: 90, height: 90, borderRadius: 22,
    backgroundColor: CARD, borderWidth: 2,
    borderColor: BORDER, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  logoEmptyText: { fontSize: 11, color: MUTED, fontWeight: '600' },
  logoBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY, borderWidth: 2, borderColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  logoName: { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  logoSub:  { fontSize: 13, color: MUTED, marginTop: 2 },

  /* Days */
  daysWrap: { padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  daysHint: { fontSize: 12, color: MUTED, marginBottom: 10 },
  daysRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  dayOn:    { backgroundColor: TINT, borderColor: 'rgba(196,30,58,0.3)' },
  dayText:  { fontSize: 13, fontWeight: '600', color: MUTED },
  dayTextOn:{ color: PRIMARY },

  /* Times */
  timesRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  timeSep:  { alignItems: 'center', paddingHorizontal: 4 },
  timeSepText: { fontSize: 20, color: MUTED, fontWeight: '300' },

  /* Services */
  svcWrap:  { padding: 16 },
  svcHint:  { fontSize: 12, color: MUTED, marginBottom: 12 },
  svcGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  svcChip:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  svcOn:    { backgroundColor: TINT, borderColor: 'rgba(196,30,58,0.3)' },
  svcText:  { fontSize: 13, color: MUTED, fontWeight: '500' },
  svcTextOn:{ color: PRIMARY, fontWeight: '600' },
  svcCount: { marginTop: 12, fontSize: 12, color: MUTED, fontWeight: '600', textAlign: 'center' },

  /* Menu */
  menuRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: BORDER },
  menuIcon:    { width: 32, height: 32, borderRadius: 8, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel:   { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 16,
    borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 18, paddingVertical: 14, marginBottom: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: DANGER },

  /* Footer */
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
