import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import GarageService from '@/src/services/garage.service';
import type { WorkingHours } from '@/src/types';
import {
  ArrowLeft, Building2, User, Phone, MapPin, Navigation, Flag,
  Hash, Clock, Sun, Moon, Wrench, Check, CheckCircle,
  Camera, ChevronRight, Edit2, X,
} from 'lucide-react-native';

/* ─────────────────────── Tokens ───────────────────────── */
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

/* ─────────────────────── Helpers ──────────────────────── */
function fmt24(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function makeTime(h: number, m = 0) {
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function dateFromHHMM(s: string): Date {
  const [h = 9, m = 0] = (s || '').split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function fmt12(d: Date) {
  let h = d.getHours();
  const min = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(min).padStart(2, '0')} ${ap}`;
}
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'G';
}
function isOpenNow(workDays: string[], open: Date, close: Date): boolean {
  if (!workDays.length) return false;
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (!workDays.includes(days[now.getDay()])) return false;
  const cur  = now.getHours() * 60 + now.getMinutes();
  const oMin = open.getHours()  * 60 + open.getMinutes();
  const cMin = close.getHours() * 60 + close.getMinutes();
  return cur >= oMin && cur < cMin;
}

/* ─────────────────────── SectionCard ──────────────────── */
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

/* ─────────────────────── FieldRow ─────────────────────── */
function FieldRow({
  Icon, iconBg = '#F3F4F6', iconColor = MUTED,
  label, value, onChange, placeholder, keyboard,
  capitalize = 'sentences', editable = true, last = false,
}: {
  Icon: any; iconBg?: string; iconColor?: string; label: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboard?: any; capitalize?: any; editable?: boolean; last?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused && editable;
  return (
    <View style={[fr.wrap, !last && fr.divider]}>
      <View style={[fr.iconSlot, { backgroundColor: active ? '#FEF2F2' : iconBg }]}>
        <Icon size={15} color={active ? PRIMARY : editable ? iconColor : '#D1D5DB'} strokeWidth={2} />
      </View>
      <View style={fr.mid}>
        <Text style={fr.label}>{label}</Text>
        <TextInput
          style={[fr.input, !editable && { color: MUTED }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboard}
          autoCapitalize={capitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {active && <View style={fr.focusBar} />}
      </View>
    </View>
  );
}
const fr = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  iconSlot: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mid: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT, padding: 0 },
  focusBar: { height: 1.5, backgroundColor: PRIMARY, marginTop: 4, borderRadius: 1 },
});

/* ─────────────────────── TimePickerModal ──────────────── */
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
          <Text style={tp.title}>{label}</Text>
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
  title:  { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: TEXT },
  cancel: { fontSize: 15, color: MUTED, fontWeight: '500', minWidth: 60 },
  done:   { fontSize: 15, color: PRIMARY, fontWeight: '700', textAlign: 'right', minWidth: 60 },
  picker: { width: '100%', height: 200 },
});

/* ════════════════════ Main Screen ═════════════════════════ */
export default function GarageScreen() {
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const topPad  = insets.top + (Platform.OS === 'web' ? 67 : 0);

  /* ── Edit mode ── */
  const [editMode, setEditMode] = useState(false);

  /* ── State ── */
  const [logoUri,    setLogoUri]    = useState<string | null>(null);
  const [name,       setName]       = useState('');
  const [owner,      setOwner]      = useState('');
  const [altPhone,   setAltPhone]   = useState('');
  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [stateVal,   setStateVal]   = useState('');
  const [zipcode,    setZipcode]    = useState('');
  const [workDays,   setWorkDays]   = useState<string[]>([]);
  const [openTime,   setOpenTime]   = useState(makeTime(9));
  const [closeTime,  setCloseTime]  = useState(makeTime(19));
  const [services,   setServices]   = useState<string[]>([]);
  const [pickerFor,  setPickerFor]  = useState<'open' | 'close' | null>(null);
  const [saving,     setSaving]     = useState(false);

  const populated = useRef(false);
  // snapshot for cancel
  const snapshot  = useRef({ name, owner, altPhone, address, city, stateVal, zipcode, workDays, openTime, closeTime, services });

  /* ── Query ── */
  const { data: garage, isLoading } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn: GarageService.get,
  });

  useEffect(() => {
    if (populated.current || !garage) return;
    setName(garage.name ?? '');
    setOwner(garage.owner ?? '');
    setAltPhone(garage.alternate_number ?? '');
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
    populated.current = true;
  }, [garage]);

  /* ── Mutation ── */
  const { mutate, isPending } = useMutation({
    mutationFn: (p: Parameters<typeof GarageService.update>[0]) => GarageService.update(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE });
      setEditMode(false);
      Alert.alert('Saved ✓', 'Garage profile updated.');
    },
    onError: () => Alert.alert('Error', 'Failed to save. Please try again.'),
  });

  function toggleDay(d: string) { setWorkDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]); }
  function toggleService(svc: string) { setServices(p => p.includes(svc) ? p.filter(x => x !== svc) : [...p, svc]); }

  function enterEdit() {
    snapshot.current = { name, owner, altPhone, address, city, stateVal, zipcode, workDays, openTime, closeTime, services };
    setEditMode(true);
  }
  function cancelEdit() {
    const snap = snapshot.current;
    setName(snap.name); setOwner(snap.owner); setAltPhone(snap.altPhone);
    setAddress(snap.address); setCity(snap.city); setStateVal(snap.stateVal);
    setZipcode(snap.zipcode); setWorkDays(snap.workDays);
    setOpenTime(snap.openTime); setCloseTime(snap.closeTime);
    setServices(snap.services);
    setEditMode(false);
  }

  function save() {
    if (!name.trim()) { Alert.alert('Required', 'Garage name cannot be empty.'); return; }
    const working_hours: WorkingHours = {};
    DAYS.forEach(day => {
      working_hours[day] = { open: fmt24(openTime), close: fmt24(closeTime), closed: !workDays.includes(day) };
    });
    mutate({ name: name.trim(), owner: owner.trim() || null, alternate_number: altPhone.trim() || null,
      address: address.trim() || null, city: city.trim() || null,
      state: stateVal.trim() || null, zipcode: zipcode.trim() || null, working_hours });
  }

  /* ── Logo ── */
  async function pickLogo() {
    if (!editMode) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!res.canceled && res.assets[0]) setLogoUri(res.assets[0].uri);
  }

  /* ── Derived ── */
  const initials  = getInitials(name || 'Garage');
  const location  = [city, stateVal].filter(Boolean).join(', ');
  const openStatus = isOpenNow(workDays, openTime, closeTime);

  /* ═══════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD} />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={18} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Garage Profile</Text>
        <TouchableOpacity
          style={[s.editBtn, editMode && s.editBtnActive]}
          onPress={editMode ? cancelEdit : enterEdit}
          activeOpacity={0.8}
        >
          {editMode
            ? <X size={16} color={DANGER} strokeWidth={2.5} />
            : <Edit2 size={15} color={PRIMARY} strokeWidth={2} />}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>Loading…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Garage hero ── */}
          <View style={s.hero}>
            <TouchableOpacity style={s.logoWrap} onPress={pickLogo} activeOpacity={editMode ? 0.85 : 1}>
              {logoUri
                ? <Image source={{ uri: logoUri }} style={s.logoImg} />
                : (
                  <View style={s.logoCircle}>
                    <Text style={s.logoInitials}>{initials}</Text>
                  </View>
                )
              }
              {editMode && (
                <View style={s.logoCameraBadge}>
                  <Camera size={11} color="#fff" strokeWidth={2.5} />
                </View>
              )}
            </TouchableOpacity>

            <View style={s.heroInfo}>
              <Text style={s.heroName} numberOfLines={1}>{name || 'Your Garage'}</Text>
              {owner ? <Text style={s.heroOwner}>{owner}</Text> : null}
              {location ? (
                <View style={s.heroLocRow}>
                  <MapPin size={11} color={MUTED} strokeWidth={2} />
                  <Text style={s.heroLocText}>{location}</Text>
                </View>
              ) : null}
            </View>

            <View style={[s.statusPill, { backgroundColor: openStatus ? '#ECFDF5' : '#FEF2F2' }]}>
              <View style={[s.statusDot, { backgroundColor: openStatus ? SUCCESS : DANGER }]} />
              <Text style={[s.statusText, { color: openStatus ? SUCCESS : DANGER }]}>
                {openStatus ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>

          {/* edit mode hint */}
          {editMode && (
            <View style={s.editHint}>
              <Edit2 size={12} color={PRIMARY} strokeWidth={2} />
              <Text style={s.editHintText}>Editing mode — tap any field to update</Text>
            </View>
          )}

          {/* ── Business Details ── */}
          <SectionCard title="Business Details" Icon={Building2} iconBg="#FEE2E2" iconColor={PRIMARY}>
            <FieldRow Icon={Building2} iconBg="#FEE2E2" iconColor={PRIMARY}
              label="Garage Name" value={name} onChange={setName}
              placeholder="e.g. Sharma Auto Works" capitalize="words" editable={editMode} />
            <FieldRow Icon={User} iconBg="#F3F4F6" iconColor={MUTED}
              label="Owner / Manager" value={owner} onChange={setOwner}
              placeholder="Full name" capitalize="words" editable={editMode} />
            <FieldRow Icon={Phone} iconBg="#F3F4F6" iconColor={MUTED}
              label="Alternate Phone" value={altPhone}
              onChange={v => setAltPhone(v.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit number" keyboard="phone-pad" editable={editMode} last />
          </SectionCard>

          {/* ── Location ── */}
          <SectionCard title="Location" Icon={MapPin} iconBg="#EDE9FE" iconColor="#7C3AED">
            <FieldRow Icon={MapPin} iconBg="#EDE9FE" iconColor="#7C3AED"
              label="Street Address" value={address} onChange={setAddress}
              placeholder="Plot / Door no, Street name" capitalize="words" editable={editMode} />
            <FieldRow Icon={Navigation} iconBg="#F3F4F6" iconColor={MUTED}
              label="City" value={city} onChange={setCity}
              placeholder="City" capitalize="words" editable={editMode} />
            <FieldRow Icon={Flag} iconBg="#F3F4F6" iconColor={MUTED}
              label="State" value={stateVal} onChange={setStateVal}
              placeholder="State" capitalize="words" editable={editMode} />
            <FieldRow Icon={Hash} iconBg="#F3F4F6" iconColor={MUTED}
              label="PIN Code" value={zipcode}
              onChange={v => setZipcode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN" keyboard="number-pad" editable={editMode} last />
          </SectionCard>

          {/* ── Working Hours ── */}
          <SectionCard title="Working Hours" Icon={Clock} iconBg="#FEF3C7" iconColor={WARN}>
            {/* Day selector */}
            <View style={s.daysWrap}>
              <Text style={s.microLabel}>WORKING DAYS</Text>
              <View style={s.daysRow}>
                {DAYS.map(d => {
                  const on = workDays.includes(d);
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[s.dayBtn, on && s.dayBtnOn, !editMode && s.dayBtnReadOnly]}
                      onPress={() => editMode && toggleDay(d)}
                      activeOpacity={editMode ? 0.75 : 1}
                    >
                      <Text style={[s.dayLetter, on && s.dayLetterOn]}>{d[0]}</Text>
                      <Text style={[s.dayFull, on && s.dayFullOn]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time pickers */}
            <View style={s.timesWrap}>
              <Text style={s.microLabel}>BUSINESS HOURS</Text>
              <TouchableOpacity
                style={s.timeRow}
                onPress={() => editMode && setPickerFor('open')}
                activeOpacity={editMode ? 0.8 : 1}
              >
                <View style={[s.timeIcon, { backgroundColor: '#FFF7ED' }]}>
                  <Sun size={16} color="#F97316" strokeWidth={2} />
                </View>
                <Text style={s.timeLabel}>Opens at</Text>
                <View style={[s.timePill, editMode && s.timePillEditable]}>
                  <Text style={s.timePillText}>{fmt12(openTime)}</Text>
                </View>
                {editMode && <ChevronRight size={14} color="#D1D5DB" strokeWidth={2} />}
              </TouchableOpacity>

              <View style={s.innerDivider} />

              <TouchableOpacity
                style={[s.timeRow, { paddingBottom: workDays.length > 0 ? 4 : 14 }]}
                onPress={() => editMode && setPickerFor('close')}
                activeOpacity={editMode ? 0.8 : 1}
              >
                <View style={[s.timeIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Moon size={16} color="#7C3AED" strokeWidth={2} />
                </View>
                <Text style={s.timeLabel}>Closes at</Text>
                <View style={[s.timePill, editMode && s.timePillEditable]}>
                  <Text style={s.timePillText}>{fmt12(closeTime)}</Text>
                </View>
                {editMode && <ChevronRight size={14} color="#D1D5DB" strokeWidth={2} />}
              </TouchableOpacity>
            </View>

            {/* Summary */}
            {workDays.length > 0 && (
              <View style={s.hoursSummary}>
                <CheckCircle size={13} color={SUCCESS} strokeWidth={2} />
                <Text style={s.hoursSummaryText}>
                  <Text style={{ fontWeight: '700' }}>
                    {workDays.length === 7 ? 'Every day' :
                     workDays.length === 5 && !workDays.includes('Sat') && !workDays.includes('Sun') ? 'Mon – Fri' :
                     workDays.join(' · ')}
                  </Text>
                  {'  ·  '}
                  {fmt12(openTime)} – {fmt12(closeTime)}
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

          {/* ── Services Offered ── */}
          <SectionCard
            title="Services Offered"
            Icon={Wrench} iconBg="#FEE2E2" iconColor={PRIMARY}
            right={
              <View style={s.svcCounter}>
                <Text style={s.svcCounterText}>{services.length} selected</Text>
              </View>
            }
          >
            {!editMode && services.length === 0 ? (
              <View style={s.svcEmpty}>
                <Wrench size={22} color="#D1D5DB" strokeWidth={1.5} />
                <Text style={s.svcEmptyText}>No services added yet</Text>
                <TouchableOpacity onPress={enterEdit} activeOpacity={0.8}>
                  <Text style={s.svcEmptyAction}>Tap edit to add services</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.svcGrid}>
                {ALL_SERVICES.map(svc => {
                  const on = services.includes(svc);
                  return (
                    <TouchableOpacity
                      key={svc}
                      style={[s.svcChip, on && s.svcChipOn, !editMode && on && s.svcChipOnReadOnly]}
                      onPress={() => editMode && toggleService(svc)}
                      activeOpacity={editMode ? 0.75 : 1}
                    >
                      {on && <Check size={11} color={PRIMARY} strokeWidth={3} />}
                      <Text style={[s.svcText, on && s.svcTextOn]}>{svc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </SectionCard>

        </ScrollView>
      )}

      {/* ── Footer (edit mode) ── */}
      {editMode && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={s.footerCancel} onPress={cancelEdit} activeOpacity={0.8}>
            <Text style={s.footerCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.footerSave, (isPending || saving) && { opacity: 0.65 }]}
            onPress={save} disabled={isPending || saving} activeOpacity={0.85}
          >
            {isPending || saving
              ? <ActivityIndicator color="#fff" />
              : <><Check size={16} color="#fff" strokeWidth={3} /><Text style={s.footerSaveText}>Save Changes</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────── Styles ───────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    backgroundColor: CARD, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  editBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  editBtnActive: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: MUTED, fontWeight: '500' },

  body: { paddingHorizontal: 16, paddingTop: 16 },

  /* Hero */
  hero: {
    backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  logoWrap:     { position: 'relative', flexShrink: 0 },
  logoImg:      { width: 66, height: 66, borderRadius: 18 },
  logoCircle: {
    width: 66, height: 66, borderRadius: 18,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  logoInitials:    { fontSize: 22, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },
  logoCameraBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PRIMARY, borderWidth: 2, borderColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  heroInfo:    { flex: 1, gap: 2 },
  heroName:    { fontSize: 17, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  heroOwner:   { fontSize: 13, color: MUTED },
  heroLocRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  heroLocText: { fontSize: 12, color: MUTED },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start',
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  /* Edit hint */
  editHint: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  editHintText: { fontSize: 13, color: PRIMARY, fontWeight: '500', flex: 1 },

  /* Working Hours */
  daysWrap:    { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  microLabel:  { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },
  daysRow:     { flexDirection: 'row', gap: 5 },
  dayBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
    backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
  },
  dayBtnOn:       { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayBtnReadOnly: { opacity: 0.9 },
  dayLetter:   { fontSize: 13, fontWeight: '800', color: MUTED, lineHeight: 17 },
  dayLetterOn: { color: '#fff' },
  dayFull:     { fontSize: 8.5, fontWeight: '600', color: '#9CA3AF', lineHeight: 12 },
  dayFullOn:   { color: 'rgba(255,255,255,0.75)' },
  timesWrap:    { paddingHorizontal: 16, paddingTop: 16 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  timeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  timeLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT },
  timePill: { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5, borderColor: BORDER },
  timePillEditable: { borderColor: PRIMARY + '44', backgroundColor: '#FEF2F2' },
  timePillText: { fontSize: 15, fontWeight: '700', color: TEXT },
  innerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginBottom: 14 },
  hoursSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, marginTop: 0, padding: 12,
    backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0',
  },
  hoursSummaryText: { flex: 1, fontSize: 12.5, color: '#166534', lineHeight: 18 },

  /* Services */
  svcCounter: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  svcCounterText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  svcEmpty: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  svcEmptyText: { fontSize: 14, color: MUTED },
  svcEmptyAction: { fontSize: 13, color: PRIMARY, fontWeight: '600', marginTop: 2 },
  svcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  svcChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: BORDER,
  },
  svcChipOn:         { backgroundColor: '#FEF2F2', borderColor: PRIMARY + '66' },
  svcChipOnReadOnly: { opacity: 1 },
  svcText:    { fontSize: 12.5, color: MUTED, fontWeight: '500' },
  svcTextOn:  { color: PRIMARY, fontWeight: '600' },

  /* Footer */
  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 14,
    backgroundColor: CARD, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  footerCancel: {
    paddingVertical: 15, paddingHorizontal: 20, borderRadius: 13,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  footerCancelText: { fontSize: 14, fontWeight: '600', color: TEXT },
  footerSave: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 13, backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
