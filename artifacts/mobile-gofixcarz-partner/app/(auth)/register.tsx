import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { isAxiosError } from 'axios';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Location from 'expo-location';
import { useAuth } from '@/src/context/AuthContext';
import { cleanMobileNumber } from '@/src/utils/validators';
import type { SignUpPayload } from '@/src/types';
import {
  Check,
  AlertTriangle,
  X,
  Wifi,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Hash,
  Navigation,
} from 'lucide-react-native';

/* ─────────────── Tokens ─────────────── */
const BG           = '#FFFFFF';
const CARD         = '#FFFFFF';
const TEXT         = '#0F172A';
const MUTED        = '#64748B';
const BORDER       = '#E2E8F0';
const PRIMARY      = '#2563EB';
const PRIMARY_DARK = '#1E40AF';
const PRIMARY_BG   = '#EFF6FF';
const DANGER       = '#DC2626';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || 'AIzaSyBUCnvnJyRUoph57Ft2X3Qhkkbfz8Ldkls';

const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  android: { elevation: 3 },
  default: {},
});

const SHADOW_BTN = Platform.select({
  ios:     { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  android: { elevation: 6 },
  default: {},
});

/* ─────────────── Debounce ───────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface Suggestion {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

/* ─────────────── FadeMsg ────────────── */
function FadeMsg({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/* ─────────────── InlineError ─────────── */
function InlineError({ msg }: { msg: string }) {
  return (
    <FadeMsg>
      <View style={ie.row}>
        <AlertTriangle size={12} color={DANGER} strokeWidth={2.5} />
        <Text style={ie.txt}>{msg}</Text>
      </View>
    </FadeMsg>
  );
}
const ie = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  txt: { fontSize: 11.5, color: DANGER, fontWeight: '500', flex: 1 },
});

/* ─────────────── Snackbar ───────────── */
function Snackbar({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 80, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(onDismiss);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[sb.wrap, { transform: [{ translateY }], opacity }]}>
      <Wifi size={15} color="#fff" strokeWidth={2} />
      <Text style={sb.txt} numberOfLines={2}>{msg}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={14} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}
const sb = StyleSheet.create({
  wrap: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0F172A', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    zIndex: 999,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 10 },
      default: {},
    }),
  },
  txt: { flex: 1, fontSize: 13, color: '#fff', lineHeight: 18 },
});

/* ─────────────── India Flag SVG ─────── */
function IndiaFlag() {
  return (
    <Svg width={20} height={16} viewBox="0 0 512 512">
      <Path fill="#f98000" d="M0 85.3h512v113.8H0z" />
      <Path fill="#fff" d="M0 199.1h512v113.8H0z" />
      <Path fill="#008000" d="M0 312.9h512v113.8H0z" />
      <Circle cx={256} cy={256} r={40} fill="#000080" />
      <Circle cx={256} cy={256} r={32} fill="#fff" />
      <Path fill="#000080" d="M256 216l2 40-2 40-2-40zm0 80l-2-40 2-40 2 40zm40-40l-40 2-40-2 40-2zm-80 0l40-2 40 2-40 2zm28.3-28.3l28.3 28.3-28.3 28.3-28.3-28.3zm-56.6 56.6l28.3-28.3 28.3 28.3-28.3 28.3zm56.6 0l-28.3-28.3-28.3 28.3 28.3 28.3zm-56.6-56.6l28.3 28.3 28.3-28.3-28.3-28.3z" />
    </Svg>
  );
}

/* ─────────────── RoundedInput ───────── */
function RoundedInput({
  label, required = false, value, onChange, onBlur,
  keyboard, capitalize = 'sentences', prefix, Icon,
  half = false, error, maxLength, hint, placeholder, textContentType, autoComplete, importantForAutofill,
}: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; onBlur?: () => void;
  keyboard?: any; capitalize?: any; prefix?: React.ReactNode; Icon?: any;
  half?: boolean; error?: string; maxLength?: number; hint?: string; placeholder?: string;
  textContentType?: any; autoComplete?: any; importantForAutofill?: any;
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? DANGER : focused ? PRIMARY : BORDER;
  const bgColor     = error ? '#FEF2F2' : focused ? '#FFFFFF' : '#F8FAFC';

  const defaultPlaceholder = placeholder || `Enter ${label.replace(/\s*\([^)]*\)/gi, '').trim().toLowerCase()}`;

  return (
    <View style={[ri.wrap, half && { flex: 1 }]}>
      <Text style={ri.label}>
        {label} {required && <Text style={{ color: DANGER }}>*</Text>}
      </Text>
      <View style={[ri.inputBox, { borderColor, backgroundColor: bgColor }]}>
        {Icon && (
          <View style={ri.iconSlot}>
            <Icon size={16} color={focused ? PRIMARY : MUTED} strokeWidth={2} />
          </View>
        )}
        {prefix ? <View style={ri.prefixSlot}>{prefix}</View> : null}
        <TextInput
          style={ri.field}
          value={value}
          onChangeText={onChange}
          placeholder={defaultPlaceholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboard}
          autoCapitalize={capitalize}
          maxLength={maxLength}
          textContentType={textContentType}
          autoComplete={autoComplete}
          importantForAutofill={importantForAutofill}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); onBlur?.(); }}
        />
        {error && <AlertTriangle size={15} color={DANGER} strokeWidth={2} style={{ marginRight: 10 }} />}
      </View>
      {hint && !error && <Text style={ri.hintText}>{hint}</Text>}
      {error ? <InlineError msg={error} /> : null}
    </View>
  );
}

const ri = StyleSheet.create({
  wrap:     { marginBottom: 12 },
  label:    { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6, letterSpacing: 0.2 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    height: 48, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, overflow: 'hidden',
  },
  iconSlot:  { marginRight: 8 },
  prefixSlot:{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8, borderRightWidth: 1, borderRightColor: BORDER, marginRight: 10 },
  field:     { flex: 1, height: '100%', fontSize: 14, fontWeight: '500', color: TEXT, paddingVertical: 0, textAlignVertical: 'center' },
  hintText:  { fontSize: 11, color: MUTED, marginTop: 4, fontStyle: 'italic' },
});

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
  { main: 'Lucknow', sub: 'Uttar Pradesh 226001', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', country: 'India' },
  { main: 'Indore', sub: 'Madhya Pradesh 452001', city: 'Indore', state: 'Madhya Pradesh', pincode: '452001', country: 'India' },
  { main: 'Patna', sub: 'Bihar 800001', city: 'Patna', state: 'Bihar', pincode: '800001', country: 'India' },
];

/* ─────────────── AddressInput ──────── */
function AddressInput({ value, onChange, onSelect }: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (parts: { address: string; city: string; state: string; pincode: string; country: string }) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [show, setShow] = useState(false);
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
    <View style={ai.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={ri.label}>Workshop Address</Text>
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

      <View style={[ri.inputBox, { borderColor: focused ? PRIMARY : BORDER, backgroundColor: focused ? '#FFFFFF' : '#F8FAFC' }]}>
        <View style={ri.iconSlot}>
          <MapPin size={16} color={focused ? PRIMARY : MUTED} strokeWidth={2} />
        </View>
        <TextInput
          style={ri.field}
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
        {loading && <ActivityIndicator size="small" color={PRIMARY} />}
      </View>

      {show && suggestions.length > 0 && (
        <View style={ai.list}>
          {suggestions.map((s, i) => (
            <TouchableOpacity key={s.place_id || i} style={[ai.item, i < suggestions.length - 1 && ai.itemBorder]} onPress={() => pick(s)} activeOpacity={0.7}>
              <Text style={ai.main} numberOfLines={1}>{s.main_text}</Text>
              <Text style={ai.sub} numberOfLines={1}>{s.secondary_text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const ai = StyleSheet.create({
  wrap: { marginBottom: 12, position: 'relative', zIndex: 30 },
  list: {
    position: 'absolute', top: 72, left: 0, right: 0, zIndex: 99,
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  item: { paddingHorizontal: 14, paddingVertical: 11 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  main: { fontSize: 13, fontWeight: '600', color: TEXT },
  sub:  { fontSize: 11, color: MUTED, marginTop: 2 },
});

/* ─────────────── SectionCard ───────── */
function SectionCard({ title, Icon, children, showLine = true }: { title: string; Icon: any; children: React.ReactNode; showLine?: boolean }) {
  return (
    <View style={[sc.section, showLine && sc.sectionBorder]}>
      <View style={sc.headRow}>
        <View style={sc.iconBadge}>
          <Icon size={14} color={PRIMARY} strokeWidth={2.2} />
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View>{children}</View>
    </View>
  );
}

const sc = StyleSheet.create({
  section: {
    paddingBottom: 20,
    marginBottom: 20,
  },
  sectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: PRIMARY_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

/* ─────────────── WheelerCard ────────── */
function WheelerCard({ label, subtitle, checked, onPress }: { label: string; subtitle: string; checked: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[wc.card, checked && wc.cardActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[wc.checkCircle, checked && wc.checkCircleActive]}>
        {checked && <Check size={11} color="#FFFFFF" strokeWidth={3.5} />}
      </View>
      <Text style={[wc.label, checked && wc.labelActive]}>{label}</Text>
      <Text style={wc.sub}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const wc = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  cardActive: {
    backgroundColor: PRIMARY_BG,
    borderColor: PRIMARY,
  },
  checkCircle: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: MUTED,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  checkCircleActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  label: { fontSize: 14, fontWeight: '700', color: TEXT },
  labelActive: { color: PRIMARY },
  sub: { fontSize: 11, color: MUTED, marginTop: 2 },
});

/* ════════════════════ Main Screen ══════════════════ */
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, clearError } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [snackbar,    setSnackbar]    = useState<string | null>(null);
  const [phoneExists, setPhoneExists] = useState(false);

  useEffect(() => {
    clearError();
    setPhoneExists(false);
    setSnackbar(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    phone:        '',
    phone2:       '',
    wheelers:     [] as string[],
    acceptTerms:  true,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (key === 'phone') setPhoneExists(false);
    clearError();
  }
  function touch(key: string) { setTouched(t => ({ ...t, [key]: true })); }

  function toggleWheeler(id: string) {
    setForm(f => ({ ...f, wheelers: f.wheelers.includes(id) ? f.wheelers.filter(w => w !== id) : [...f.wheelers, id] }));
  }

  /* ── Validation errors ── */
  const emailTrim     = form.email.trim();
  const firstNameTrim = form.firstName.trim();
  const workshopTrim  = form.workshopName.trim();
  const phoneTrim     = cleanMobileNumber(form.phone);
  const zipcodeTrim   = form.zipcode.trim();

  const errors = {
    firstName: touched.firstName
      ? !firstNameTrim ? 'First name is required.' : ''
      : '',
    workshopName: touched.workshopName
      ? !workshopTrim          ? 'Workshop name is required.'
      : workshopTrim.length < 3 ? 'Workshop name is too short (min. 3 characters).'
      : ''
      : '',
    phone: touched.phone
      ? !phoneTrim            ? 'Primary mobile number is required.'
      : phoneTrim.length < 10 ? 'Please enter a valid 10-digit mobile number.'
      : ''
      : '',
    email: touched.email
      ? !emailTrim              ? 'Email address is required.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim) ? 'Please enter a valid email address.'
      : ''
      : '',
    zipcode: touched.zipcode && zipcodeTrim.length > 0 && zipcodeTrim.length !== 6
      ? 'PIN code must contain 6 digits.'
      : '',
  };

  const isValid = !!(
    firstNameTrim.length > 0 &&
    workshopTrim.length >= 3 &&
    phoneTrim.length >= 10 &&
    emailTrim.length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim) &&
    form.acceptTerms &&
    (zipcodeTrim.length === 0 || zipcodeTrim.length === 6)
  );

  const handleSubmit = useCallback(async () => {
    setTouched({
      firstName: true,
      workshopName: true,
      phone: true,
      email: true,
      zipcode: true,
    });

    if (!isValid) {
      if (!firstNameTrim) {
        setSnackbar('Please enter your First Name.');
      } else if (!workshopTrim) {
        setSnackbar('Please enter your Workshop Name.');
      } else if (workshopTrim.length < 3) {
        setSnackbar('Workshop Name must be at least 3 characters.');
      } else if (!phoneTrim || phoneTrim.length < 10) {
        setSnackbar('Please enter a valid 10-digit mobile number.');
      } else if (!emailTrim) {
        setSnackbar('Please enter your email address.');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        setSnackbar('Please enter a valid email address.');
      } else if (!form.acceptTerms) {
        setSnackbar('Please accept the Terms and Conditions.');
      } else if (zipcodeTrim.length > 0 && zipcodeTrim.length !== 6) {
        setSnackbar('PIN code must contain 6 digits.');
      }
      return;
    }

    const payload: SignUpPayload = {
      first_name:     form.firstName.trim(),
      workshop_name:  form.workshopName.trim(),
      mobile:         cleanMobileNumber(form.phone),
      email:          form.email.trim(),
      terms_accepted: true,
    };

    if (form.lastName.trim())     payload.last_name = form.lastName.trim();
    if (form.address.trim())      payload.address   = form.address.trim();
    if (form.city.trim())         payload.city      = form.city.trim();
    if (form.state.trim())        payload.state     = form.state.trim();
    if (form.zipcode.trim())      payload.zipcode   = form.zipcode.trim();
    if (form.country.trim())      payload.country   = form.country.trim();
    if (form.phone2.trim())       payload.mobile_2  = cleanMobileNumber(form.phone2);
    if (form.wheelers.length > 0) payload.wheelers  = form.wheelers;

    try {
      await signUp(payload);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        const msg: string =
          err.response?.data?.message ??
          err.response?.data?.error ??
          err.response?.data?.detail ?? '';

        const msgLower = msg.toLowerCase();
        const isDuplicatePhone =
          status === 409 ||
          (msgLower.includes('mobile') && (msgLower.includes('already') || msgLower.includes('exist') || msgLower.includes('registered') || msgLower.includes('duplicate'))) ||
          (msgLower.includes('phone') && (msgLower.includes('already') || msgLower.includes('exist') || msgLower.includes('registered') || msgLower.includes('duplicate')));

        if (isDuplicatePhone) {
          setPhoneExists(true);
          return;
        } else if (!err.response || err.code === 'ECONNABORTED') {
          setSnackbar('Something went wrong. Please check your connection and retry.');
        } else {
          setSnackbar(msg || 'Registration failed. Please try again.');
        }
      } else {
        const errMsg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
        const errMsgLower = errMsg.toLowerCase();
        const isDuplicatePhone =
          (errMsgLower.includes('mobile') || errMsgLower.includes('phone') || errMsgLower.includes('account')) &&
          (errMsgLower.includes('already') || errMsgLower.includes('duplicate'));

        if (isDuplicatePhone) {
          setPhoneExists(true);
        } else {
          setSnackbar(errMsg);
        }
      }
    }
  }, [emailTrim, firstNameTrim, form, isValid, phoneTrim, signUp, workshopTrim, zipcodeTrim]);

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY_DARK} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? undefined : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >
          {/* ── Executive Hero Header ── */}
          <LinearGradient
            colors={[PRIMARY_DARK, PRIMARY]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.heroHeader, { paddingTop: topPad + 12 }]}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <Image
              source={require('../../assets/images/logo_clean.png')}
              style={s.logoImg}
              resizeMode="contain"
            />

            <View style={s.badgePill}>
              <ShieldCheck size={12} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={s.badgePillText}>PARTNER ONBOARDING</Text>
            </View>

            <Text style={s.heroTitle}>Create Partner Account</Text>
            <Text style={s.heroSubtitle}>Register your workshop &amp; join GoFixCarz partner network</Text>
          </LinearGradient>

          {/* ── Form Body Cards ── */}
          <View style={s.formContainer}>

            {/* Section 1: Personal Information */}
            <SectionCard title="Personal Information" Icon={User}>
              <View style={s.twoCol}>
                <RoundedInput
                  label="First Name" required
                  value={form.firstName}
                  onChange={v => set('firstName', v)}
                  onBlur={() => touch('firstName')}
                  capitalize="words"
                  placeholder="First name"
                  half
                  error={touched.firstName ? errors.firstName : undefined}
                />
                <RoundedInput
                  label="Last Name"
                  value={form.lastName}
                  onChange={v => set('lastName', v)}
                  onBlur={() => touch('lastName')}
                  capitalize="words"
                  placeholder="Last name"
                  half
                />
              </View>
            </SectionCard>

            {/* Section 2: Workshop & Location */}
            <SectionCard title="Workshop & Location" Icon={Wrench}>
              <RoundedInput
                label="Workshop Name" required
                value={form.workshopName}
                onChange={v => set('workshopName', v)}
                onBlur={() => touch('workshopName')}
                capitalize="words"
                error={errors.workshopName}
              />

              <RoundedInput
                label="Email Address" required
                value={form.email}
                onChange={v => set('email', v)}
                onBlur={() => touch('email')}
                keyboard="email-address" capitalize="none"
                Icon={Mail}
                hint="OTP will be sent to your primary mobile number"
                error={errors.email}
              />

              <AddressInput
                value={form.address}
                onChange={v => set('address', v)}
                onSelect={({ address, city, state, pincode, country }) => {
                  setForm(f => ({
                    ...f,
                    address,
                    city: city || f.city,
                    state: state || f.state,
                    zipcode: pincode || f.zipcode,
                    country: country || f.country,
                  }));
                }}
              />

              <View style={s.twoCol}>
                <RoundedInput label="City" value={form.city} onChange={v => set('city', v)} capitalize="words" half />
                <RoundedInput label="State" value={form.state} onChange={v => set('state', v)} capitalize="words" half />
              </View>

              <View style={s.twoCol}>
                <RoundedInput
                  label="PIN Code"
                  value={form.zipcode}
                  onChange={v => set('zipcode', v.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => { if (form.zipcode) touch('zipcode'); }}
                  keyboard="number-pad"
                  maxLength={6}
                  half
                  error={errors.zipcode}
                />
                <RoundedInput label="Country" value={form.country} onChange={v => set('country', v)} capitalize="words" half />
              </View>
            </SectionCard>

            {/* Section 3: Contact Information */}
            <SectionCard title="Contact Details" Icon={Phone}>
              <RoundedInput
                label="Primary Mobile Number" required
                value={form.phone}
                onChange={v => set('phone', cleanMobileNumber(v))}
                onBlur={() => touch('phone')}
                keyboard="number-pad"
                maxLength={15}
                placeholder="10-digit mobile number"
                prefix={
                  <View style={s.flagBox}>
                    <IndiaFlag />
                    <Text style={s.countryCode}>+91</Text>
                  </View>
                }
                textContentType="telephoneNumber"
                autoComplete="tel"
                error={errors.phone}
              />

              {phoneExists && (
                <View style={s.phoneExistsBanner}>
                  <AlertTriangle size={14} color={DANGER} strokeWidth={2} />
                  <Text style={s.phoneExistsTxt}>
                    This mobile number is already registered.
                  </Text>
                </View>
              )}

              <RoundedInput
                label="Alternate Mobile Number (Optional)"
                value={form.phone2}
                onChange={v => set('phone2', cleanMobileNumber(v))}
                keyboard="number-pad"
                maxLength={15}
                placeholder="10-digit mobile number"
                prefix={
                  <View style={s.flagBox}>
                    <IndiaFlag />
                    <Text style={s.countryCode}>+91</Text>
                  </View>
                }
                textContentType="telephoneNumber"
                autoComplete="tel"
              />
            </SectionCard>

            {/* Section 4: Vehicle Types Supported */}
            <SectionCard title="Vehicle Types Serviced" Icon={Hash} showLine={false}>
              <View style={s.wheelerGrid}>
                {[
                  { id: '2W', label: '2-Wheeler', sub: 'Bikes & Scooters' },
                  { id: '3W', label: '3-Wheeler', sub: 'Autos & Commercial' },
                  { id: '4W', label: '4-Wheeler', sub: 'Cars & SUVs' },
                  { id: '6W', label: '6-Wheeler+', sub: 'Heavy Commercial' },
                ].map(item => (
                  <WheelerCard
                    key={item.id}
                    label={item.label}
                    subtitle={item.sub}
                    checked={form.wheelers.includes(item.id)}
                    onPress={() => { toggleWheeler(item.id); touch('wheelers'); }}
                  />
                ))}
              </View>
            </SectionCard>

            {/* Terms Acceptance */}
            <TouchableOpacity
              style={s.termsCard}
              onPress={() => set('acceptTerms', !form.acceptTerms)}
              activeOpacity={0.8}
            >
              <View style={[s.termsCheckbox, form.acceptTerms && s.termsCheckboxChecked]}>
                {form.acceptTerms && <Check size={12} color="#FFFFFF" strokeWidth={3.5} />}
              </View>
              <Text style={s.termsText}>
                {'I accept the '}
                <Text style={s.termsLink} onPress={() => router.push('/(auth)/privacy' as never)}>
                  Terms & Conditions & Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Submit Action */}
            <TouchableOpacity
              style={[
                s.submitBtnWrap,
                !isLoading && SHADOW_BTN,
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {!isLoading ? (
                <LinearGradient
                  colors={[PRIMARY_DARK, PRIMARY]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.submitBtn}
                >
                  <Text style={s.submitTxt}>Send OTP</Text>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              ) : (
                <View style={[s.submitBtn, s.submitBtnDisabled]}>
                  <ActivityIndicator size="small" color="#94A3B8" />
                </View>
              )}
            </TouchableOpacity>

            {/* Sign In Redirection */}
            <TouchableOpacity
              style={s.loginRedirect}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={s.loginRedirectTxt}>
                Already have a partner account? <Text style={s.loginRedirectLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar */}
      {snackbar && <Snackbar msg={snackbar} onDismiss={() => setSnackbar(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  /* Header */
  heroHeader: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: Platform.OS === 'web' ? 76 : 54,
    padding: 6,
    zIndex: 10,
  },
  logoImg: { width: 180, height: 72, marginBottom: 8 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgePillText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },

  /* Form Container */
  formContainer: {
    paddingHorizontal: 16,
    marginTop: 18,
  },

  twoCol: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },

  flagBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countryCode: { fontSize: 13, fontWeight: '700', color: TEXT },

  phoneExistsBanner: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
    backgroundColor: '#FEF2F2', borderColor: '#FECDD3', borderWidth: 1,
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  phoneExistsTxt:  { fontSize: 12, color: DANGER, fontWeight: '500' },
  phoneExistsLink: { fontSize: 12, color: PRIMARY, fontWeight: '700', textDecorationLine: 'underline' },

  wheelerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  /* Terms Card */
  termsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  termsCheckbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: MUTED,
    alignItems: 'center', justifyContent: 'center',
  },
  termsCheckboxChecked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  termsText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
  termsLink: { color: PRIMARY, fontWeight: '700' },

  /* Submit Button */
  submitBtnWrap: { borderRadius: 14, marginBottom: 16 },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  submitTxt: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.2 },
  submitTxtDisabled: { fontSize: 16, fontWeight: '700', color: '#94A3B8', letterSpacing: -0.2 },

  /* Login Redirect */
  loginRedirect: { alignItems: 'center', paddingVertical: 8 },
  loginRedirectTxt: { fontSize: 14, color: MUTED },
  loginRedirectLink: { color: PRIMARY, fontWeight: '700' },
});
