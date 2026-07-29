import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import GarageService from '@/src/services/garage.service';
import type { WorkingHours } from '@/src/types';
import { ArrowLeft, Check, ChevronRight, Sun, Moon, CheckCircle } from 'lucide-react-native';

/* ─────────────── Tokens ─────────────── */
const BG      = '#FFFFFF';
const TEXT    = '#1A1A1A';
const MUTED   = '#9CA3AF';
const LINE    = '#D1D5DB';
const PRIMARY = '#C41E3A';
const SUCCESS = '#059669';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ALL_SERVICES = [
  'Oil Change', 'Tyre Rotation', 'Wheel Alignment', 'Wheel Balancing',
  'Battery Replacement', 'Brake Service', 'AC Service', 'AC Repair',
  'Engine Tune-Up', 'Suspension Repair', 'Clutch Repair', 'Gearbox Service',
  'Denting & Painting', 'Car Wash', 'Detailing', 'Insurance Repair',
  'Electrical Repair', 'Windshield Repair', 'Exhaust Repair', 'Full Service',
];

const WHEELERS = ['2W', '3W', '4W', '6W'];

/* ─────────────── Helpers ────────────── */
function fmt24(d: Date) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function makeTime(h: number, m = 0) { const d = new Date(); d.setHours(h, m, 0, 0); return d; }
function dateFromHHMM(s: string): Date { const [h=9,m=0]=(s||'').split(':').map(Number); const d=new Date(); d.setHours(h,m,0,0); return d; }
function fmt12(d: Date) { let h=d.getHours(); const min=d.getMinutes(); const ap=h>=12?'PM':'AM'; h=h%12||12; return `${h}:${String(min).padStart(2,'0')} ${ap}`; }
function isOpenNow(days: string[], open: Date, close: Date): boolean {
  if (!days.length) return false;
  const now = new Date(); const map = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (!days.includes(map[now.getDay()])) return false;
  const cur = now.getHours()*60+now.getMinutes();
  return cur >= open.getHours()*60+open.getMinutes() && cur < close.getHours()*60+close.getMinutes();
}

/* ─────────────── UnderlineInput ─────── */
function UnderlineInput({
  label, value, onChange, keyboard, capitalize = 'sentences',
  editable = true, half = false, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; capitalize?: any; editable?: boolean; half?: boolean; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lineColor = focused && editable ? PRIMARY : LINE;
  return (
    <View style={[ui.wrap, half && { flex: 1 }]}>
      <View style={[ui.row, { borderBottomColor: lineColor }]}>
        {prefix ? <Text style={ui.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[ui.input, !editable && { color: MUTED }]}
          value={value}
          onChangeText={onChange}
          placeholder={label}
          placeholderTextColor={MUTED}
          keyboardType={keyboard}
          autoCapitalize={capitalize}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}
const ui = StyleSheet.create({
  wrap:  { paddingVertical: 6 },
  row:   { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingBottom: 8, paddingTop: 2 },
  prefix:{ fontSize: 15, color: TEXT, marginRight: 6 },
  input: { flex: 1, fontSize: 15, color: TEXT, padding: 0 },
});

/* ─────────────── TwoCol ─────────────── */
function TwoCol({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 20 }}>{children}</View>;
}

/* ─────────────── SectionHeader ─────── */
function SectionHeader({ title }: { title: string }) {
  return <Text style={sh.text}>{title}</Text>;
}
const sh = StyleSheet.create({ text: { fontSize: 13, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14, marginTop: 28 } });

/* ─────────────── CheckBox ───────────── */
function CheckBox({ label, checked, onPress, disabled = false }: {
  label: string; checked: boolean; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity style={cb.row} onPress={onPress} disabled={disabled} activeOpacity={0.7}>
      <View style={[cb.box, checked && cb.boxOn]}>
        {checked && <Check size={11} color="#fff" strokeWidth={3.5} />}
      </View>
      <Text style={[cb.label, checked && cb.labelOn]}>{label}</Text>
    </TouchableOpacity>
  );
}
const cb = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  box:    { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  boxOn:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  label:  { fontSize: 14, color: TEXT, fontWeight: '500' },
  labelOn:{ color: PRIMARY, fontWeight: '600' },
});

/* ─────────────── DayPill ────────────── */
function DayPill({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled: boolean }) {
  return (
    <TouchableOpacity style={[dp.pill, on && dp.pillOn]} onPress={onPress} disabled={disabled} activeOpacity={0.75}>
      <Text style={[dp.label, on && dp.labelOn]}>{label}</Text>
    </TouchableOpacity>
  );
}
const dp = StyleSheet.create({
  pill:    { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1.5, borderColor: LINE, backgroundColor: '#F9FAFB' },
  pillOn:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  label:   { fontSize: 12, fontWeight: '700', color: MUTED },
  labelOn: { color: '#fff' },
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
  sheet:    { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  handle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: LINE, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  toolbar:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  title:    { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: TEXT },
  cancel:   { fontSize: 15, color: MUTED, fontWeight: '500', minWidth: 60 },
  done:     { fontSize: 15, color: PRIMARY, fontWeight: '700', textAlign: 'right', minWidth: 60 },
  picker:   { width: '100%', height: 200 },
});

/* ════════════════════ Main ══════════════════ */
export default function GarageScreen() {
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const topPad  = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [editMode,   setEditMode]   = useState(false);
  const [name,       setName]       = useState('');
  const [owner,      setOwner]      = useState('');
  const [altPhone,   setAltPhone]   = useState('');
  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [stateVal,   setStateVal]   = useState('');
  const [zipcode,    setZipcode]    = useState('');
  const [country,    setCountry]    = useState('India');
  const [wheelers,   setWheelers]   = useState<string[]>([]);
  const [workDays,   setWorkDays]   = useState<string[]>([]);
  const [openTime,   setOpenTime]   = useState(makeTime(9));
  const [closeTime,  setCloseTime]  = useState(makeTime(19));
  const [services,   setServices]   = useState<string[]>([]);
  const [pickerFor,  setPickerFor]  = useState<'open'|'close'|null>(null);

  const populated = useRef(false);
  const snapshot  = useRef({ name, owner, altPhone, address, city, stateVal, zipcode, country, wheelers, workDays, openTime, closeTime, services });

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
    setCountry(garage.country ?? 'India');
    setWheelers(garage.wheelers ?? []);
    if (garage.working_hours) {
      const active = Object.entries(garage.working_hours).filter(([,v]) => !v.closed).map(([d]) => d);
      setWorkDays(active);
      const first = Object.values(garage.working_hours).find(v => !v.closed);
      if (first) { setOpenTime(dateFromHHMM(first.open)); setCloseTime(dateFromHHMM(first.close)); }
    }
    populated.current = true;
  }, [garage]);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: Parameters<typeof GarageService.update>[0]) => GarageService.update(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE });
      setEditMode(false);
      Alert.alert('Saved', 'Garage profile updated successfully.');
    },
    onError: () => Alert.alert('Error', 'Failed to save. Please try again.'),
  });

  function toggleWheeler(w: string) { setWheelers(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]); }
  function toggleDay(d: string)     { setWorkDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]); }
  function toggleService(svc: string) { setServices(p => p.includes(svc) ? p.filter(x => x !== svc) : [...p, svc]); }

  function enterEdit() {
    snapshot.current = { name, owner, altPhone, address, city, stateVal, zipcode, country, wheelers, workDays, openTime, closeTime, services };
    setEditMode(true);
  }
  function cancelEdit() {
    const s = snapshot.current;
    setName(s.name); setOwner(s.owner); setAltPhone(s.altPhone);
    setAddress(s.address); setCity(s.city); setStateVal(s.stateVal);
    setZipcode(s.zipcode); setCountry(s.country); setWheelers(s.wheelers);
    setWorkDays(s.workDays); setOpenTime(s.openTime); setCloseTime(s.closeTime);
    setServices(s.services); setEditMode(false);
  }

  function save() {
    if (!name.trim()) { Alert.alert('Required', 'Garage name cannot be empty.'); return; }
    const working_hours: WorkingHours = {};
    DAYS.forEach(day => {
      working_hours[day] = { open: fmt24(openTime), close: fmt24(closeTime), closed: !workDays.includes(day) };
    });
    mutate({ name: name.trim(), owner: owner.trim() || null, alternate_number: altPhone.trim() || null,
      address: address.trim() || null, city: city.trim() || null, state: stateVal.trim() || null,
      zipcode: zipcode.trim() || null, country: country.trim() || null,
      wheelers: wheelers.length ? wheelers : null, working_hours });
  }

  const openStatus = isOpenNow(workDays, openTime, closeTime);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={18} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.headerMid}>
          <Text style={s.headerTitle}>Garage Profile</Text>
          <View style={[s.statusPill, { backgroundColor: openStatus ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[s.statusDot, { backgroundColor: openStatus ? SUCCESS : PRIMARY }]} />
            <Text style={[s.statusText, { color: openStatus ? SUCCESS : PRIMARY }]}>{openStatus ? 'Open' : 'Closed'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[s.editBtn, editMode && { backgroundColor: '#FEE2E2' }]}
          onPress={editMode ? cancelEdit : enterEdit}
          activeOpacity={0.8}
        >
          <Text style={[s.editTxt, editMode && { color: PRIMARY }]}>{editMode ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Business Details ── */}
          <SectionHeader title="Business Details" />
          <TwoCol>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="Owner Name*" value={owner} onChange={setOwner} capitalize="words" editable={editMode} />
            </View>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="Manager Name" value={name} onChange={setName} capitalize="words" editable={editMode} />
            </View>
          </TwoCol>
          <View style={s.gap} />
          <UnderlineInput label="Workshop Name*" value={name} onChange={setName} capitalize="words" editable={editMode} />

          {/* ── Contact / Phone ── */}
          <SectionHeader title="Contact" />
          <TwoCol>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="Phone Number" value={altPhone} onChange={v => setAltPhone(v.replace(/\D/g,'').slice(0,10))} keyboard="phone-pad" editable={editMode} prefix="🇮🇳" />
            </View>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="Phone Number 2" value="" onChange={() => {}} keyboard="phone-pad" editable={editMode} prefix="🇮🇳" />
            </View>
          </TwoCol>

          {/* ── Location ── */}
          <SectionHeader title="Location" />
          <UnderlineInput label="Address" value={address} onChange={setAddress} capitalize="words" editable={editMode} />
          <View style={s.gap} />
          <TwoCol>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="City" value={city} onChange={setCity} capitalize="words" editable={editMode} />
            </View>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="State" value={stateVal} onChange={setStateVal} capitalize="words" editable={editMode} />
            </View>
          </TwoCol>
          <View style={s.gap} />
          <TwoCol>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="Zipcode" value={zipcode} onChange={v => setZipcode(v.replace(/\D/g,'').slice(0,6))} keyboard="number-pad" editable={editMode} />
            </View>
            <View style={{ flex: 1 }}>
              <UnderlineInput label="Country" value={country} onChange={setCountry} capitalize="words" editable={editMode} />
            </View>
          </TwoCol>

          {/* ── Wheeler Types ── */}
          <SectionHeader title="Vehicle Types Serviced" />
          <View style={s.wheelersRow}>
            {WHEELERS.map(w => (
              <CheckBox key={w} label={w} checked={wheelers.includes(w)}
                onPress={() => editMode && toggleWheeler(w)} disabled={!editMode} />
            ))}
          </View>

          {/* ── Working Hours ── */}
          <SectionHeader title="Working Hours" />
          <Text style={s.microLabel}>Working Days</Text>
          <View style={s.daysRow}>
            {DAYS.map(d => (
              <DayPill key={d} label={d.slice(0,1)} on={workDays.includes(d)}
                onPress={() => toggleDay(d)} disabled={!editMode} />
            ))}
          </View>
          <View style={s.gap} />
          <Text style={s.microLabel}>Business Hours</Text>
          <View style={s.timesRow}>
            <TouchableOpacity
              style={s.timeBtn}
              onPress={() => editMode && setPickerFor('open')}
              activeOpacity={editMode ? 0.8 : 1}
            >
              <Sun size={14} color="#F97316" strokeWidth={2} />
              <Text style={s.timeBtnLabel}>Opens at</Text>
              <Text style={[s.timeBtnValue, { color: editMode ? PRIMARY : TEXT }]}>{fmt12(openTime)}</Text>
              {editMode && <ChevronRight size={14} color={MUTED} strokeWidth={2} />}
            </TouchableOpacity>
            <View style={s.timeDivider} />
            <TouchableOpacity
              style={s.timeBtn}
              onPress={() => editMode && setPickerFor('close')}
              activeOpacity={editMode ? 0.8 : 1}
            >
              <Moon size={14} color="#7C3AED" strokeWidth={2} />
              <Text style={s.timeBtnLabel}>Closes at</Text>
              <Text style={[s.timeBtnValue, { color: editMode ? PRIMARY : TEXT }]}>{fmt12(closeTime)}</Text>
              {editMode && <ChevronRight size={14} color={MUTED} strokeWidth={2} />}
            </TouchableOpacity>
          </View>

          {workDays.length > 0 && (
            <View style={s.hoursSummary}>
              <CheckCircle size={13} color={SUCCESS} strokeWidth={2} />
              <Text style={s.hoursSummaryTxt}>
                <Text style={{ fontWeight: '700' }}>
                  {workDays.length === 7 ? 'Every day' : workDays.join(' · ')}
                </Text>
                {'  ·  '}{fmt12(openTime)} – {fmt12(closeTime)}
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

          {/* ── Services Offered ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, marginBottom: 14 }}>
            <Text style={[sh.text, { marginTop: 0, marginBottom: 0 }]}>Services Offered</Text>
            <View style={s.svcCounter}>
              <Text style={s.svcCounterTxt}>{services.length} selected</Text>
            </View>
          </View>
          <View style={s.svcGrid}>
            {ALL_SERVICES.map(svc => {
              const on = services.includes(svc);
              return (
                <TouchableOpacity
                  key={svc}
                  style={[s.svcChip, on && s.svcChipOn]}
                  onPress={() => editMode && toggleService(svc)}
                  activeOpacity={editMode ? 0.75 : 1}
                >
                  {on && <Check size={11} color={PRIMARY} strokeWidth={3} />}
                  <Text style={[s.svcTxt, on && s.svcTxtOn]}>{svc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </ScrollView>
      )}

      {/* Footer */}
      {!isLoading && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {editMode ? (
            <View style={s.footerRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={cancelEdit} activeOpacity={0.8}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, isPending && { opacity: 0.65 }]}
                onPress={save} disabled={isPending} activeOpacity={0.85}
              >
                {isPending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveTxt}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.saveBtn} onPress={enterEdit} activeOpacity={0.85}>
              <Text style={s.saveTxt}>Edit Garage Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    backgroundColor: BG, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 9, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMid:   { flex: 1, gap: 3 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  editBtn:     { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editTxt:     { fontSize: 14, fontWeight: '600', color: TEXT },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: 20, paddingTop: 4 },
  gap:  { height: 12 },

  /* Wheelers */
  wheelersRow: { flexDirection: 'row', gap: 24, paddingVertical: 6 },

  /* Days */
  microLabel: { fontSize: 11, fontWeight: '600', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  daysRow:    { flexDirection: 'row', gap: 5 },

  /* Times */
  timesRow:      { flexDirection: 'row', borderWidth: 1.5, borderColor: LINE, borderRadius: 10, overflow: 'hidden' },
  timeBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13, paddingHorizontal: 14 },
  timeBtnLabel:  { flex: 1, fontSize: 14, color: MUTED },
  timeBtnValue:  { fontSize: 14, fontWeight: '700' },
  timeDivider:   { width: 1.5, backgroundColor: LINE },

  /* Hours summary */
  hoursSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 12,
    backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0',
  },
  hoursSummaryTxt: { flex: 1, fontSize: 12.5, color: '#166534', lineHeight: 18 },

  /* Services */
  svcCounter:    { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  svcCounterTxt: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  svcGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  svcChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: LINE, backgroundColor: '#F9FAFB' },
  svcChipOn:     { backgroundColor: '#FEF2F2', borderColor: PRIMARY + '66' },
  svcTxt:        { fontSize: 12.5, color: MUTED, fontWeight: '500' },
  svcTxtOn:      { color: PRIMARY, fontWeight: '600' },

  /* Footer */
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE,
  },
  footerRow:  { flexDirection: 'row', gap: 12 },
  cancelBtn:  { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1.5, borderColor: LINE, alignItems: 'center' },
  cancelTxt:  { fontSize: 14, fontWeight: '600', color: TEXT },
  saveBtn:    { flex: 1, backgroundColor: PRIMARY, borderRadius: 10, height: 52, alignItems: 'center', justifyContent: 'center' },
  saveTxt:    { color: '#fff', fontSize: 15, fontWeight: '700' },
});
