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
import { useLogoStore } from '@/src/store/logo.store';
import ProfileService from '@/src/services/profile.service';
import GarageService from '@/src/services/garage.service';
import { cleanMobileNumber } from '@/src/utils/validators';
import type { WorkingHours } from '@/src/types';
import * as Location from 'expo-location';
import {
  ChevronRight, ChevronLeft, LogOut, HelpCircle, Shield, Info, Lock,
  Camera, Sun, Moon, CheckCircle, AlertTriangle, ArrowLeft, Navigation,
} from 'lucide-react-native';

/* ─────────────── Tokens ─────────────── */
const BG      = '#FFFFFF';
const TEXT    = '#1A1A1A';
const MUTED   = '#9CA3AF';
const LINE    = '#D1D5DB';
const PRIMARY = '#2563EB';
const DANGER  = '#DC2626';
const SUCCESS = '#16A34A';
const WARN    = '#D97706';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'AIzaSyBUCnvnJyRUoph57Ft2X3Qhkkbfz8Ldkls';

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
  readOnly = false, prefix, onBlur, error, maxLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; capitalize?: any; readOnly?: boolean; prefix?: string; onBlur?: () => void;
  error?: string; maxLength?: number;
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
          maxLength={maxLength}
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
const COMMON_INDIAN_LOCATIONS = [
  { main: 'Warangal', sub: 'Telangana 506002', city: 'Warangal', state: 'Telangana', pincode: '506002', country: 'India' },
  { main: 'Hanamkonda', sub: 'Warangal, Telangana 506001', city: 'Warangal', state: 'Telangana', pincode: '506001', country: 'India' },
  { main: 'Kazipet', sub: 'Warangal, Telangana 506003', city: 'Warangal', state: 'Telangana', pincode: '506003', country: 'India' },
  { main: 'Karimnagar', sub: 'Telangana 505001', city: 'Karimnagar', state: 'Telangana', pincode: '505001', country: 'India' },
  { main: 'Nizamabad', sub: 'Telangana 503001', city: 'Nizamabad', state: 'Telangana', pincode: '503001', country: 'India' },
  { main: 'Khammam', sub: 'Telangana 507001', city: 'Khammam', state: 'Telangana', pincode: '507001', country: 'India' },
  { main: 'Gachibowli', sub: 'Hyderabad, Telangana 500032', city: 'Hyderabad', state: 'Telangana', pincode: '500032', country: 'India' },
  { main: 'HITECH City', sub: 'Hyderabad, Telangana 500081', city: 'Hyderabad', state: 'Telangana', pincode: '500081', country: 'India' },
  { main: 'Kukatpally', sub: 'Hyderabad, Telangana 500072', city: 'Hyderabad', state: 'Telangana', pincode: '500072', country: 'India' },
  { main: 'Secunderabad', sub: 'Telangana 500003', city: 'Hyderabad', state: 'Telangana', pincode: '500003', country: 'India' },
  { main: 'Vijayawada', sub: 'Andhra Pradesh 520001', city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520001', country: 'India' },
  { main: 'Visakhapatnam (Vizag)', sub: 'Andhra Pradesh 530001', city: 'Visakhapatnam', state: 'Andhra Pradesh', pincode: '530001', country: 'India' },
  { main: 'Guntur', sub: 'Andhra Pradesh 522002', city: 'Guntur', state: 'Andhra Pradesh', pincode: '522002', country: 'India' },
  { main: 'Tirupati', sub: 'Andhra Pradesh 517501', city: 'Tirupati', state: 'Andhra Pradesh', pincode: '517501', country: 'India' },
  { main: 'Koramangala', sub: 'Bengaluru, Karnataka 560034', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', country: 'India' },
  { main: 'Indiranagar', sub: 'Bengaluru, Karnataka 560038', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', country: 'India' },
  { main: 'HSR Layout', sub: 'Bengaluru, Karnataka 560102', city: 'Bengaluru', state: 'Karnataka', pincode: '560102', country: 'India' },
  { main: 'Whitefield', sub: 'Bengaluru, Karnataka 560066', city: 'Bengaluru', state: 'Karnataka', pincode: '560066', country: 'India' },
  { main: 'Peenya Industrial Area', sub: 'Bengaluru, Karnataka 560058', city: 'Bengaluru', state: 'Karnataka', pincode: '560058', country: 'India' },
  { main: 'Mysuru (Mysore)', sub: 'Karnataka 570001', city: 'Mysuru', state: 'Karnataka', pincode: '570001', country: 'India' },
  { main: 'Hubballi', sub: 'Karnataka 580020', city: 'Hubballi', state: 'Karnataka', pincode: '580020', country: 'India' },
  { main: 'Mangaluru', sub: 'Karnataka 575001', city: 'Mangaluru', state: 'Karnataka', pincode: '575001', country: 'India' },
  { main: 'Andheri West', sub: 'Mumbai, Maharashtra 400053', city: 'Mumbai', state: 'Maharashtra', pincode: '400053', country: 'India' },
  { main: 'Andheri East', sub: 'Mumbai, Maharashtra 400069', city: 'Mumbai', state: 'Maharashtra', pincode: '400069', country: 'India' },
  { main: 'Bandra West', sub: 'Mumbai, Maharashtra 400050', city: 'Mumbai', state: 'Maharashtra', pincode: '400050', country: 'India' },
  { main: 'Thane West', sub: 'Mumbai, Maharashtra 400601', city: 'Thane', state: 'Maharashtra', pincode: '400601', country: 'India' },
  { main: 'Viman Nagar', sub: 'Pune, Maharashtra 411014', city: 'Pune', state: 'Maharashtra', pincode: '411014', country: 'India' },
  { main: 'Nagpur', sub: 'Maharashtra 440001', city: 'Nagpur', state: 'Maharashtra', pincode: '440001', country: 'India' },
  { main: 'Nashik', sub: 'Maharashtra 422001', city: 'Nashik', state: 'Maharashtra', pincode: '422001', country: 'India' },
  { main: 'Connaught Place', sub: 'New Delhi, Delhi 110001', city: 'New Delhi', state: 'Delhi', pincode: '110001', country: 'India' },
  { main: 'DLF Cyber City', sub: 'Gurugram, Haryana 122002', city: 'Gurugram', state: 'Haryana', pincode: '122002', country: 'India' },
  { main: 'Noida Sector 62', sub: 'Noida, Uttar Pradesh 201301', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', country: 'India' },
  { main: 'T. Nagar', sub: 'Chennai, Tamil Nadu 600017', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017', country: 'India' },
  { main: 'Coimbatore', sub: 'Tamil Nadu 641001', city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', country: 'India' },
  { main: 'Madurai', sub: 'Tamil Nadu 625001', city: 'Madurai', state: 'Tamil Nadu', pincode: '625001', country: 'India' },
  { main: 'Kochi', sub: 'Kerala 682001', city: 'Kochi', state: 'Kerala', pincode: '682001', country: 'India' },
  { main: 'Kozhikode', sub: 'Kerala 673001', city: 'Kozhikode', state: 'Kerala', pincode: '673001', country: 'India' },
  { main: 'Thiruvananthapuram', sub: 'Kerala 695001', city: 'Thiruvananthapuram', state: 'Kerala', pincode: '695001', country: 'India' },
  { main: 'SG Highway', sub: 'Ahmedabad, Gujarat 380054', city: 'Ahmedabad', state: 'Gujarat', pincode: '380054', country: 'India' },
  { main: 'Surat', sub: 'Gujarat 395002', city: 'Surat', state: 'Gujarat', pincode: '395002', country: 'India' },
  { main: 'Vadodara', sub: 'Gujarat 390001', city: 'Vadodara', state: 'Gujarat', pincode: '390001', country: 'India' },
  { main: 'Park Street', sub: 'Kolkata, West Bengal 700016', city: 'Kolkata', state: 'West Bengal', pincode: '700016', country: 'India' },
  { main: 'Jaipur', sub: 'Rajasthan 302001', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', country: 'India' },
];

/* ─────────────── AddressInput ──────── */
function AddressInput({ value, onChange, onSelect, error }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (parts: { address: string; city: string; state: string; pincode: string; country: string }) => void;
  error?: string;
}) {
  const [focused,     setFocused]     = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [show,        setShow]        = useState(false);
  const isSelected = useRef(false);
  const debounced = useDebounce(value, 300);

  useEffect(() => {
    if (!focused || isSelected.current || debounced.length < 2) {
      setSuggestions([]);
      setShow(false);
      setLoading(false);
      return;
    }

    const q = debounced.toLowerCase();
    const fallbackMatched = COMMON_INDIAN_LOCATIONS.filter(
      loc => loc.main.toLowerCase().includes(q) || loc.sub.toLowerCase().includes(q) || loc.city.toLowerCase().includes(q)
    ).map((loc, idx) => ({
      place_id: `common_${idx}`,
      description: `${loc.main}, ${loc.sub}`,
      main_text: loc.main,
      secondary_text: loc.sub,
      city: loc.city,
      state: loc.state,
      pincode: loc.pincode,
      country: loc.country,
      isGoogle: false,
    }));

    let cancelled = false;
    setLoading(true);

    if (GOOGLE_KEY) {
      const targetUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(debounced)}&components=country:in&key=${GOOGLE_KEY}`;
      const fetchUrl = Platform.OS === 'web' ? `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` : targetUrl;

      fetch(fetchUrl)
        .then(r => r.json())
        .then(d => {
          if (!cancelled) {
            const googlePreds = (d.predictions ?? []).map((p: any) => ({
              place_id: p.place_id,
              description: p.description,
              main_text: p.structured_formatting?.main_text || p.description,
              secondary_text: p.structured_formatting?.secondary_text || '',
              isGoogle: true,
            }));
            if (googlePreds.length > 0) {
              setSuggestions(googlePreds);
              setShow(true);
              return;
            }
          }
          fetchOsm();
        })
        .catch(() => { if (!cancelled) fetchOsm(); });
    } else {
      fetchOsm();
    }

    function fetchOsm() {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debounced)}&countrycodes=in&format=json&addressdetails=1&limit=6`)
        .then(r => r.json())
        .then(data => {
          if (!cancelled && data && Array.isArray(data) && data.length > 0) {
            const osmPreds = data.map((item: any, idx: number) => {
              const addr = item.address || {};
              const main = item.name || addr.suburb || addr.city || addr.town || item.display_name.split(',')[0];
              const sub = item.display_name;
              const city = addr.city || addr.town || addr.suburb || addr.county || addr.district || '';
              const state = addr.state || '';
              const pincode = addr.postcode || '';
              return {
                place_id: `osm_${idx}_${Date.now()}`,
                description: sub,
                main_text: main,
                secondary_text: sub,
                city,
                state,
                pincode,
                country: addr.country || 'India',
                isGoogle: false,
              };
            });
            setSuggestions(osmPreds);
            setShow(true);
          } else if (!cancelled) {
            setSuggestions(fallbackMatched);
            setShow(fallbackMatched.length > 0);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions(fallbackMatched);
            setShow(fallbackMatched.length > 0);
          }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
    }

    return () => { cancelled = true; };
  }, [debounced, focused]);

  async function handleUseGps() {
    try {
      setGpsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      if (GOOGLE_KEY) {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          const comps: { types: string[]; long_name: string }[] = first.address_components ?? [];
          const get = (...types: string[]) => {
            for (const t of types) {
              const found = comps.find(c => c.types.includes(t));
              if (found?.long_name) return found.long_name;
            }
            return '';
          };
          const city = get('locality', 'sublocality_level_1', 'administrative_area_level_2');
          const state = get('administrative_area_level_1');
          const pincode = get('postal_code');
          const country = get('country');
          isSelected.current = true;
          setShow(false);
          onChange(first.formatted_address);
          onSelect({ address: first.formatted_address, city, state, pincode, country });
          return;
        }
      }

      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geo && geo.length > 0) {
        const place = geo[0];
        const addr = [place.name, place.street, place.subregion, place.city].filter(Boolean).join(', ');
        isSelected.current = true;
        setShow(false);
        onChange(addr);
        onSelect({
          address: addr,
          city: place.city || place.subregion || '',
          state: place.region || '',
          pincode: place.postalCode || '',
          country: place.country || 'India',
        });
      }
    } catch (e) {
      console.error('Location error:', e);
    } finally {
      setGpsLoading(false);
    }
  }

  async function pick(s: any) {
    isSelected.current = true;
    setShow(false);
    onChange(s.description);

    if (!s.isGoogle) {
      onSelect({
        address: s.description,
        city: s.city,
        state: s.state,
        pincode: s.pincode,
        country: s.country,
      });
      return;
    }

    if (!GOOGLE_KEY) return;
    try {
      const res  = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.place_id}&fields=address_components,formatted_address&key=${GOOGLE_KEY}`);
      const data = await res.json();
      const comps: { types: string[]; long_name: string }[] = data.result?.address_components ?? [];
      const get = (...types: string[]) => {
        for (const t of types) {
          const found = comps.find(c => c.types.includes(t));
          if (found?.long_name) return found.long_name;
        }
        return '';
      };
      const city = get('locality', 'sublocality_level_1', 'administrative_area_level_2');
      const state = get('administrative_area_level_1');
      const pincode = get('postal_code');
      const country = get('country');
      onSelect({ address: data.result?.formatted_address ?? s.description, city, state, pincode, country });
    } catch {}
  }

  return (
    <View style={addr.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Street Address</Text>
        <TouchableOpacity
          onPress={handleUseGps}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          activeOpacity={0.7}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <>
              <Navigation size={12} color={PRIMARY} strokeWidth={2.5} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY }}>Use Current GPS</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={[ui.row, { borderBottomColor: error ? DANGER : focused ? PRIMARY : LINE }]}>
        <TextInput
          style={ui.input}
          value={value}
          onChangeText={v => {
            isSelected.current = false;
            onChange(v);
            setShow(v.length >= 2);
          }}
          placeholder="Search area, landmark or street..."
          placeholderTextColor={MUTED}
          autoCapitalize="words"
          onFocus={() => { setFocused(true); if (!isSelected.current && suggestions.length > 0) setShow(true); }}
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
              key={s.place_id || i}
              style={[addr.item, i < suggestions.length - 1 && addr.itemBorder]}
              onPress={() => pick(s)}
              activeOpacity={0.7}
            >
              <Text style={addr.main} numberOfLines={1}>{s.main_text}</Text>
              <Text style={addr.sub} numberOfLines={1}>{s.secondary_text}</Text>
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
  /* ── Logo — read from Zustand store (single source of truth) ── */
  const logoUri          = useLogoStore(s => s.logoUri);
  const setLogoUri_store = useLogoStore(s => s.setLogoUri);

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

    profilePopulated.current = true;
  }, [profile, garage]);

  /* ── Logo — seed Zustand store from server URL when store is still empty ── */
  useEffect(() => {
    if (!garage?.logo_url) return;
    // Only seed if the store has nothing yet (initializeLogo hasn't run or found nothing).
    // Avoids overwriting an in-progress or freshly-uploaded local URI.
    if (useLogoStore.getState().logoUri) return;
    setLogoUri_store(garage.logo_url);
    StorageService.set(STORAGE_KEYS.GARAGE_LOGO, garage.logo_url).catch(() => {});
  }, [garage?.logo_url]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Timestamp used for both filename uniqueness and HTTP cache-busting
    const ts = Date.now();

    // Helper: update all logo sinks at once
    const applyLogo = async (uri: string, persist: boolean) => {
      setLogoUri_store(uri);       // Zustand store → all screens re-render instantly
      if (persist) await StorageService.set(STORAGE_KEYS.GARAGE_LOGO, uri);
    };

    // Step 1 — show immediately AND persist the picked URI right away.
    // Persisting here ensures the More screen sees the logo even if the copy
    // or server upload later fails silently (both have been swallowing errors).
    await applyLogo(picked, true);

    // Step 2 — copy to a TIMESTAMPED stable path in documentDirectory.
    // On iOS, ImagePicker may return a ph:// or file:///tmp URI that survives
    // only for the current session; copying gives us a durable local file.
    const ext  = (picked.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
    const dest = `${FileSystem.documentDirectory}garage_logo_${ts}.${ext}`;
    let savedUri: string | null = null;
    try {
      const prevPath = await StorageService.get(STORAGE_KEYS.GARAGE_LOGO) as string | null;
      if (prevPath && FileSystem.documentDirectory && prevPath.startsWith(FileSystem.documentDirectory)) {
        await FileSystem.deleteAsync(prevPath, { idempotent: true });
      }
      await FileSystem.copyAsync({ from: picked, to: dest });
      savedUri = dest;
      await applyLogo(dest, true);   // upgrade to durable path
    } catch (copyErr) {
      console.warn('[Profile] FileSystem.copyAsync failed — keeping temp URI:', String(copyErr));
    }

    // Step 3 — upload to server via S3 pre-signed URL flow.
    GarageService.uploadLogo(savedUri ?? picked).then(async updatedGarage => {
      const serverUrl = updatedGarage?.logo_url ?? null;
      if (serverUrl) {
        await applyLogo(serverUrl, true);
        qc.setQueryData(QUERY_KEYS.GARAGE, (old: any) =>
          old ? { ...old, logo_url: serverUrl } : old
        );
        qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE });
      }
    }).catch((uploadErr) => {
      console.warn('[Profile] S3 uploadLogo failed:', String(uploadErr));
    });
  }

  /* ── Validate ── */
  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!garageName.trim())                         e.garageName  = 'Garage name is required.';
    if (!garagePhone.trim())                        e.garagePhone = 'Phone number is required.';
    else if (garagePhone.replace(/\D/g,'').length < 10) e.garagePhone = 'Enter a valid 10-digit phone number.';
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
          logo_url:         logoUri || null,
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
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? undefined : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push('/(tabs)/more' as never)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>My Profile</Text>
          {memberSince && <Text style={s.headerSub}>Partner since {memberSince}</Text>}
        </View>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}><ActivityIndicator size="large" color={PRIMARY} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 80 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
            onChange={v => { setGaragePhone(cleanMobileNumber(v)); clearError('garagePhone'); }}
            keyboard="phone-pad" prefix="🇮🇳 +91" error={errors.garagePhone} maxLength={15} />

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
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  backBtn: {
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 1 },

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
