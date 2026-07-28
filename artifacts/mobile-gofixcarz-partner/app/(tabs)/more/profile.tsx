import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import GarageService from '@/src/services/garage.service';
import ProfileService from '@/src/services/profile.service';
import type { WorkingHours } from '@/src/types';

/* ─── Tokens ──────────────────────────────────────────────────────────── */
const BG        = '#EEEEF6';
const CARD      = '#FFFFFF';
const PRIMARY   = '#C41E3A';
const INDIGO    = '#921527';
const GRAD_END  = '#E11D48';
const TEXT      = '#1E293B';
const MUTED     = '#64748B';
const LABEL     = '#475569';
const BORDER    = '#E2E8F0';
const TINT      = '#FEF2F2';
const PLACEHOLDER = '#94A3B8';

const ALL_SERVICES = [
  'Oil Change', 'Tyre Rotation', 'Wheel Alignment', 'Wheel Balancing',
  'Battery Replacement', 'Brake Service', 'AC Service', 'AC Repair',
  'Engine Tune-Up', 'Suspension Repair', 'Clutch Repair', 'Gearbox Service',
  'Denting & Painting', 'Car Wash', 'Detailing', 'Insurance Repair',
  'Electrical Repair', 'Windshield Repair', 'Exhaust Repair', 'Full Service',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function dateFromHHMM(s: string): Date {
  const [h = 9, m = 0] = (s || '').split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}

/* ─── Section card ────────────────────────────────────────────────────── */
function Section({
  icon, iconBg = TINT, iconFg = PRIMARY, title, children,
}: {
  icon: string;
  iconBg?: string; iconFg?: string;
  title: string; children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={[sc.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 16,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 14, fontWeight: '700', color: TEXT },
  body:     { padding: 18 },
});

/* ─── Field ───────────────────────────────────────────────────────────── */
function Field({
  label, value, onChange, placeholder,
  keyboardType, autoCapitalize = 'sentences',
  icon, prefix, half = false, editable = true,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  icon?: string; prefix?: string;
  half?: boolean; editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fld.wrap, half && fld.half]}>
      <Text style={fld.label}>{label}</Text>
      <View style={[fld.row, focused && fld.focused, !editable && fld.disabled]}>
        {icon   && <Feather name={icon} size={15} color={focused ? PRIMARY : PLACEHOLDER} style={fld.icon} />}
        {prefix && <Text style={fld.prefix}>{prefix}</Text>}
        <TextInput
          style={[fld.input, !editable && { color: MUTED }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}
const fld = StyleSheet.create({
  wrap:     { marginBottom: 12 },
  half:     { flex: 1 },
  label:    { fontSize: 12, fontWeight: '600', color: LABEL, marginBottom: 5, letterSpacing: 0.2 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BG, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, height: 46,
    paddingHorizontal: 12,
  },
  focused:  { borderColor: PRIMARY, borderWidth: 1.5, backgroundColor: CARD },
  disabled: { backgroundColor: '#F1F5F9' },
  icon:     { marginRight: 7 },
  prefix:   { fontSize: 14, color: TEXT, fontWeight: '600', marginRight: 4 },
  input:    { flex: 1, fontSize: 14, color: TEXT },
});

/* ─── Time button ─────────────────────────────────────────────────────── */
function TimeBtn({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [show, setShow] = useState(false);
  function onPick(_: DateTimePickerEvent, sel?: Date) {
    if (Platform.OS !== 'ios') setShow(false);
    if (sel) onChange(sel);
  }
  return (
    <TouchableOpacity style={tb.btn} onPress={() => setShow(true)} activeOpacity={0.75}>
      <Feather name="clock" size={14} color={PRIMARY} />
      <Text style={tb.val}>{hhmm(value)}</Text>
      {show && (
        <DateTimePicker
          value={value} mode="time" is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPick}
        />
      )}
    </TouchableOpacity>
  );
}
const tb = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: TINT, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(196,30,58,0.2)',
    paddingHorizontal: 16, paddingVertical: 11, flex: 1,
  },
  val: { fontSize: 16, fontWeight: '800', color: PRIMARY, letterSpacing: 0.5 },
});

/* ═══════════════════════════════════════════════════════════════════════ */
export default function GarageProfileScreen() {
  const insets = useSafeAreaInsets();
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
  const [pincode,    setPincode]    = useState('');

  /* working hours */
  const [openTime,  setOpenTime]  = useState(dateFromHHMM('09:00'));
  const [closeTime, setCloseTime] = useState(dateFromHHMM('19:00'));
  const [workDays,  setWorkDays]  = useState<string[]>([]);

  /* services */
  const [services, setServices] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  // guard: only auto-populate once
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

  /* ── Populate form from API on first load ── */
  useEffect(() => {
    if (populated.current) return;
    if (!garage && !profile) return;

    if (garage) {
      setGarageName(garage.name ?? '');
      setOwnerName(garage.owner ?? '');
      setAddress(garage.address ?? '');
      setCity(garage.city ?? '');
      setPincode(garage.zipcode ?? '');

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
      // Use profile name as fallback if garage.owner is empty
      if (!garage?.owner && profile.name) setOwnerName(profile.name);
    }

    populated.current = true;
  }, [garage, profile]);

  /* ── Mutations ── */
  const garageMut = useMutation({
    mutationFn: GarageService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE }),
  });
  const profileMut = useMutation({
    mutationFn: ProfileService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }),
  });

  /* ── Logo picker ── */
  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload your logo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!res.canceled && res.assets.length > 0) setLogoUri(res.assets[0].uri);
  }

  /* ── Day toggle ── */
  function toggleDay(d: string) {
    setWorkDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  }

  /* ── Service toggle ── */
  function toggleService(s: string) {
    setServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  /* ── Save ── */
  async function save() {
    if (!garageName.trim()) { Alert.alert('Required', 'Please enter your garage name.'); return; }
    setSaving(true);
    try {
      // Build working_hours object from current state
      const working_hours: WorkingHours = {};
      DAYS.forEach(day => {
        working_hours[day] = {
          open:   hhmm(openTime),
          close:  hhmm(closeTime),
          closed: !workDays.includes(day),
        };
      });

      await Promise.all([
        garageMut.mutateAsync({
          name:         garageName.trim(),
          owner:        ownerName.trim()  || null,
          address:      address.trim()    || null,
          city:         city.trim()       || null,
          zipcode:      pincode.trim()    || null,
          working_hours,
        }),
        profileMut.mutateAsync({
          name:  ownerName.trim() || null,
          email: email.trim()     || null,
        }),
      ]);

      Alert.alert('Saved', 'Your profile has been updated!');
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />

      {/* ── Header ────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[INDIGO, PRIMARY, GRAD_END]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: topPad + 10 }]}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Garage Profile</Text>
          <Text style={s.headerSub}>Manage your garage details</Text>
        </View>
      </LinearGradient>

      {/* ── Body ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>Loading profile…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 110 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={s.logoOuter}>
            <TouchableOpacity onPress={pickLogo} activeOpacity={0.8} style={s.logoTouch}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={s.logoImg} />
              ) : (
                <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={s.logoPlaceholder}>
                  <Feather name="image" size={28} color={PLACEHOLDER} />
                  <Text style={s.logoPlaceholderText}>Garage Logo</Text>
                </LinearGradient>
              )}
              <View style={s.cameraBadge}>
                <LinearGradient colors={[INDIGO, PRIMARY]} style={s.cameraBadgeGrad}>
                  <Feather name="camera" size={12} color="#fff" />
                </LinearGradient>
              </View>
            </TouchableOpacity>
            <Text style={s.logoHint}>{logoUri ? 'Tap to change logo' : 'Upload your garage logo'}</Text>
          </View>

          {/* ── Garage Info ── */}
          <Section icon="home" title="Garage Information">
            <Field label="GARAGE NAME" value={garageName} onChange={setGarageName}
              placeholder="e.g. AutoCare Garage" autoCapitalize="words" icon="briefcase" />
            <Field label="ADDRESS" value={address} onChange={setAddress}
              placeholder="Street, locality" autoCapitalize="words" icon="map-pin" />
            <View style={s.twoCol}>
              <Field label="CITY" value={city} onChange={setCity}
                placeholder="City" autoCapitalize="words" half />
              <View style={{ width: 10 }} />
              <Field label="PINCODE" value={pincode}
                onChange={v => setPincode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="560001" keyboardType="number-pad" half />
            </View>
          </Section>

          {/* ── Owner Contact ── */}
          <Section icon="user" title="Owner & Contact">
            <Field label="OWNER NAME" value={ownerName} onChange={setOwnerName}
              placeholder="Full name" autoCapitalize="words" icon="user" />
            <Field label="EMAIL" value={email} onChange={setEmail}
              placeholder="owner@garage.com" keyboardType="email-address" autoCapitalize="none" icon="mail" />
            <Field
              label="PHONE NUMBER" value={phone}
              onChange={() => {}}
              placeholder="Mobile number" keyboardType="phone-pad"
              icon="phone" prefix="+91"
              editable={false}
            />
          </Section>

          {/* ── Working Hours ── */}
          <Section icon="clock" iconBg="#FFF7ED" iconFg="#F97316" title="Working Hours">
            <Text style={s.subLabel}>WORKING DAYS</Text>
            <View style={s.daysRow}>
              {DAYS.map(d => {
                const on = workDays.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={[s.dayChip, on && s.dayChipOn]}
                    onPress={() => toggleDay(d)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.dayText, on && s.dayTextOn]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[s.subLabel, { marginTop: 16 }]}>HOURS OF OPERATION</Text>
            <View style={s.timesRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.timeCaption}>Opens at</Text>
                <TimeBtn value={openTime} onChange={setOpenTime} />
              </View>
              <View style={s.timeDivider}>
                <View style={s.timeDividerLine} />
                <Text style={s.timeDividerText}>to</Text>
                <View style={s.timeDividerLine} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.timeCaption}>Closes at</Text>
                <TimeBtn value={closeTime} onChange={setCloseTime} />
              </View>
            </View>

            {workDays.length > 0 && (
              <View style={s.hoursSummary}>
                <Feather name="info" size={12} color={PRIMARY} />
                <Text style={s.hoursSummaryText}>
                  {workDays.join(', ')} · {hhmm(openTime)} – {hhmm(closeTime)}
                </Text>
              </View>
            )}
          </Section>

          {/* ── Services ── */}
          <Section icon="tool" iconBg="#F0FDF4" iconFg="#16A34A" title="Services Offered">
            <Text style={s.servicesHint}>
              Tap to select the services your garage provides. Customers will see these when searching.
            </Text>
            <View style={s.chipsGrid}>
              {ALL_SERVICES.map(svc => {
                const on = services.includes(svc);
                return (
                  <TouchableOpacity
                    key={svc}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => toggleService(svc)}
                    activeOpacity={0.75}
                  >
                    {on && <Feather name="check" size={11} color={PRIMARY} style={{ marginRight: 4 }} />}
                    <Text style={[s.chipText, on && s.chipTextOn]}>{svc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={s.selectedCount}>
              <Text style={s.selectedCountText}>
                {services.length} service{services.length !== 1 ? 's' : ''} selected
              </Text>
            </View>
          </Section>

        </ScrollView>
      )}

      {/* ── Save ── */}
      {!isLoading && (
        <View style={[s.footer, { paddingBottom: insets.bottom + 14 }]}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={s.saveBtnText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingBottom: 22,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.72)', marginTop: 2 },

  /* Loading */
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: MUTED, fontWeight: '500' },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 20 },

  /* Logo */
  logoOuter: { alignItems: 'center', marginBottom: 22 },
  logoTouch: { position: 'relative', marginBottom: 8 },
  logoImg: {
    width: 96, height: 96, borderRadius: 20,
    borderWidth: 3, borderColor: CARD,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  logoPlaceholder: {
    width: 96, height: 96, borderRadius: 20,
    borderWidth: 2, borderColor: BORDER, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  logoPlaceholderText: { fontSize: 11, color: PLACEHOLDER, fontWeight: '500' },
  cameraBadge: {
    position: 'absolute', bottom: -5, right: -5,
    borderRadius: 14, borderWidth: 2, borderColor: CARD,
    overflow: 'hidden',
  },
  cameraBadgeGrad: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  logoHint: { fontSize: 13, color: MUTED, fontWeight: '500' },

  /* Two-column row */
  twoCol: { flexDirection: 'row' },

  /* Sub label */
  subLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 0.8, marginBottom: 10,
  },

  /* Day chips */
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    backgroundColor: BG,
  },
  dayChipOn: {
    backgroundColor: TINT, borderColor: 'rgba(196,30,58,0.3)',
  },
  dayText:   { fontSize: 12, fontWeight: '600', color: MUTED },
  dayTextOn: { color: PRIMARY },

  /* Time */
  timesRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  timeCaption: { fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  timeDivider: { alignItems: 'center', paddingHorizontal: 8, marginTop: 18 },
  timeDividerLine: { width: 1, height: 8, backgroundColor: BORDER },
  timeDividerText: { fontSize: 11, color: MUTED, fontWeight: '700', marginVertical: 2 },

  hoursSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: TINT, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(196,30,58,0.15)',
    padding: 10, marginTop: 14,
  },
  hoursSummaryText: { flex: 1, fontSize: 12, color: PRIMARY, fontWeight: '600' },

  /* Services */
  servicesHint: {
    fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 14,
  },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    backgroundColor: BG,
  },
  chipOn: {
    backgroundColor: TINT,
    borderColor: 'rgba(196,30,58,0.3)',
  },
  chipText:   { fontSize: 13, color: MUTED, fontWeight: '500' },
  chipTextOn: { color: PRIMARY, fontWeight: '600' },

  selectedCount: {
    marginTop: 14, alignItems: 'center',
  },
  selectedCountText: {
    fontSize: 12, color: MUTED, fontWeight: '600',
  },

  /* Footer */
  footer: {
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: CARD,
    borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 14, height: 54,
    ...Platform.select({
      ios:     { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
