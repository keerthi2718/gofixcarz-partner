import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pencil, ChevronRight } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import GarageService from '@/src/services/garage.service';
import ProfileService from '@/src/services/profile.service';
import type { WorkingHours } from '@/src/types';

/* ─── Tokens ──────────────────────────────────────────────────────────── */
const BG        = '#F8FAFC';
const CARD      = '#FFFFFF';
const PRIMARY   = '#C41E3A';
const TEXT      = '#0F172A';
const MUTED     = '#64748B';
const SUBLABEL  = '#94A3B8';
const BORDER    = '#E2E8F0';
const DIVIDER   = '#F1F5F9';
const TINT      = '#FEF2F2';

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
function formatTime(d: Date): string {
  let h = d.getHours();
  const min = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(min).padStart(2, '0')} ${ampm}`;
}
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

/* ─── Shadow ──────────────────────────────────────────────────────────── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
}) as object;

/* ─── InfoRow ─────────────────────────────────────────────────────────── */
function InfoRow({
  label, value, truncate = false, editable = false,
  onChangeText, onPress,
}: {
  label: string;
  value: string;
  truncate?: boolean;
  editable?: boolean;
  onChangeText?: (v: string) => void;
  onPress?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function handlePress() {
    if (editable) {
      setEditing(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (onPress) {
      onPress();
    }
  }

  return (
    <TouchableOpacity
      style={ir.row}
      onPress={handlePress}
      activeOpacity={editable ? 0.7 : 1}
    >
      <Text style={ir.label}>{label}</Text>
      <View style={ir.valueWrap}>
        {editable && editing ? (
          <TextInput
            ref={inputRef}
            style={ir.input}
            value={value}
            onChangeText={onChangeText}
            onBlur={() => setEditing(false)}
            autoCapitalize="words"
          />
        ) : (
          <Text
            style={ir.value}
            numberOfLines={truncate ? 1 : undefined}
          >
            {value || '—'}
          </Text>
        )}
        <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
}
const ir = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: MUTED,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginLeft: 16,
  },
  value: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  input: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
    minWidth: 80,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY,
    paddingBottom: 2,
  },
});

/* ─── Toggle ──────────────────────────────────────────────────────────── */
function Toggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[tog.track, value ? tog.trackOn : tog.trackOff]}
    >
      <View style={[tog.thumb, value ? tog.thumbOn : tog.thumbOff]} />
    </TouchableOpacity>
  );
}
const tog = StyleSheet.create({
  track: {
    width: 40,
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  trackOn:  { backgroundColor: PRIMARY },
  trackOff: { backgroundColor: '#E2E8F0' },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  thumbOn:  { alignSelf: 'flex-end' },
  thumbOff: { alignSelf: 'flex-start' },
});

/* ═══════════════════════════════════════════════════════════════════════ */
export default function GarageProfileScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  /* ── State ── */
  const [garageName, setGarageName] = useState('');
  const [ownerName,  setOwnerName]  = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [address,    setAddress]    = useState('');
  const [city,       setCity]       = useState('');
  const [state,      setState]      = useState('');
  const [zipcode,    setZipcode]    = useState('');

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
      setState((garage as any).state ?? '');
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
          zipcode:      zipcode.trim()    || null,
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

  /* ── Derived ── */
  const initials = getInitials(garageName) || 'G';
  const timeDisplay = `${formatTime(openTime)} - ${formatTime(closeTime)}`;

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD} />

      {/* ── Header ────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: 40 + insets.top }]}>
        <Text style={s.headerTitle}>Garage Profile</Text>
      </View>

      {/* ── Body ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>Loading profile…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 80 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Identity Card ── */}
          <View style={[s.identityCard, SHADOW_CARD]}>
            {/* Edit pencil button */}
            <TouchableOpacity style={s.pencilBtn} activeOpacity={0.7}>
              <Pencil size={16} color={MUTED} strokeWidth={2} />
            </TouchableOpacity>

            <View style={s.identityContent}>
              {/* Garage monogram */}
              <View style={s.logoBox}>
                <Text style={s.logoInitials}>{initials}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={s.changePhoto}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Garage Info Section ── */}
          <View style={[s.section, SHADOW_CARD]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Garage Info</Text>
            </View>
            <InfoRow
              label="Garage Name"
              value={garageName}
              editable
              onChangeText={setGarageName}
            />
            <View style={s.divider} />
            <InfoRow
              label="Owner"
              value={ownerName}
              editable
              onChangeText={setOwnerName}
            />
            <View style={s.divider} />
            <InfoRow
              label="Phone"
              value={phone}
            />
            <View style={s.divider} />
            <InfoRow
              label="Email"
              value={email}
              editable
              onChangeText={setEmail}
            />
          </View>

          {/* ── Location Section ── */}
          <View style={[s.section, SHADOW_CARD]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Location</Text>
            </View>
            <InfoRow
              label="City"
              value={city}
              editable
              onChangeText={setCity}
            />
            <View style={s.divider} />
            <InfoRow
              label="State"
              value={state}
              editable
              onChangeText={setState}
            />
            <View style={s.divider} />
            <InfoRow
              label="Pincode"
              value={zipcode}
              editable
              onChangeText={v => setZipcode(v.replace(/\D/g, '').slice(0, 6))}
            />
            <View style={s.divider} />
            <InfoRow
              label="Address"
              value={address}
              truncate
              editable
              onChangeText={setAddress}
            />
          </View>

          {/* ── Working Hours ── */}
          <View style={[s.section, SHADOW_CARD]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Working Hours</Text>
            </View>
            <View style={s.workingHoursBody}>
              {DAYS.map((day, index) => {
                const isActive = workDays.includes(day);
                return (
                  <View key={day} style={s.dayRow}>
                    <Text style={s.dayName}>{day}</Text>
                    <Text style={[s.dayTime, !isActive && s.dayTimeClosed]}>
                      {isActive ? timeDisplay : 'Closed'}
                    </Text>
                    <Toggle
                      value={isActive}
                      onToggle={() => toggleDay(day)}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Services ── */}
          <View style={[s.section, SHADOW_CARD]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Services Offered</Text>
            </View>
            <View style={s.chipsWrap}>
              {ALL_SERVICES.map(svc => {
                const on = services.includes(svc);
                return (
                  <TouchableOpacity
                    key={svc}
                    style={[s.chip, on && s.chipOn]}
                    onPress={() => toggleService(svc)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.chipText, on && s.chipTextOn]}>{svc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.7}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={s.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  /* Header */
  header: {
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT,
  },

  /* Loading */
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: MUTED,
    fontWeight: '500',
  },

  /* Body */
  body: {
    paddingTop: 16,
  },

  /* Identity Card */
  identityCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  pencilBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    backgroundColor: BG,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: TINT,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY,
  },
  changePhoto: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '500',
    marginTop: 4,
  },

  /* Section */
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SUBLABEL,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Divider */
  divider: {
    marginHorizontal: 16,
    height: 1,
    backgroundColor: DIVIDER,
  },

  /* Working Hours */
  workingHoursBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayName: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
    width: 40,
  },
  dayTime: {
    fontSize: 14,
    color: MUTED,
    flex: 1,
    marginLeft: 16,
  },
  dayTimeClosed: {
    color: SUBLABEL,
  },

  /* Services chips */
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
  },
  chipOn: {
    backgroundColor: TINT,
    borderColor: PRIMARY,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: MUTED,
  },
  chipTextOn: {
    color: PRIMARY,
  },

  /* Save button */
  saveBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
