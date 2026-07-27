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
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import InputField from '@/src/components/ui/InputField';
import { radius, shadow, spacing, typography } from '@/constants/theme';

/* ── Design tokens ─────────────────────────────────── */
const PRIMARY       = '#C41E3A';
const PRIMARY_D     = '#921527';
const PRIMARY_LIGHT = '#FDECEA';
const TEXT_COLOR    = '#1E293B';
const BG            = '#F8FAFC';
const CARD          = '#FFFFFF';
const BORDER        = '#E2E8F0';
const BORDER_FOCUS  = PRIMARY;
const LABEL         = '#374151';
const MUTED         = '#64748B';
const DANGER        = '#EF4444';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

/* ─────────────────────────────────────────────────── */
/*  Vehicle Service Type options (maps to `wheelers`)  */
/* ─────────────────────────────────────────────────── */
const WHEELER_OPTIONS = [
  { id: '2W', emoji: '🏍️', full: '2 Wheeler',  sub: 'Bikes & Scooters' },
  { id: '3W', emoji: '🛺',  full: '3 Wheeler',  sub: 'Auto & Tuk-tuk'  },
  { id: '4W', emoji: '🚗',  full: '4 Wheeler',  sub: 'Cars & SUVs'      },
];

/* ─────────────────────────────────────────────────── */
/*  Google Places autocomplete suggestion type         */
/* ─────────────────────────────────────────────────── */
interface Suggestion {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

/* ─────────────────────────────────────────────────── */
/*  Debounce hook                                      */
/* ─────────────────────────────────────────────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─────────────────────────────────────────────────── */
/*  Address autocomplete component                     */
/* ─────────────────────────────────────────────────── */
interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (components: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }) => void;
  error?: string;
}

function AddressAutocomplete({ value, onChangeText, onSelect, error }: AddressAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedValue = useDebounce(value, 400);

  useEffect(() => {
    if (!GOOGLE_KEY || debouncedValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        debouncedValue
      )}&types=address&components=country:in&key=${GOOGLE_KEY}`
    )
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setSuggestions(data.predictions ?? []);
        setShowSuggestions((data.predictions ?? []).length > 0);
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoadingSuggestions(false); });
    return () => { cancelled = true; };
  }, [debouncedValue]);

  async function pickSuggestion(s: Suggestion) {
    setShowSuggestions(false);
    onChangeText(s.description);
    if (!GOOGLE_KEY) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${s.place_id}&fields=address_components,formatted_address&key=${GOOGLE_KEY}`
      );
      const data = await res.json();
      const comps: { types: string[]; long_name: string }[] =
        data.result?.address_components ?? [];
      const get = (type: string) =>
        comps.find(c => c.types.includes(type))?.long_name ?? '';
      onSelect({
        address: data.result?.formatted_address ?? s.description,
        city:    get('locality') || get('administrative_area_level_2'),
        state:   get('administrative_area_level_1'),
        pincode: get('postal_code'),
        country: get('country'),
      });
    } catch {}
  }

  const borderColor = error ? DANGER : focused ? BORDER_FOCUS : BORDER;
  const borderWidth = focused || !!error ? 1.5 : 1;

  return (
    <View>
      <Text style={styles.fieldLabel}>Address</Text>
      <View
        style={[
          styles.addressInputWrap,
          { borderColor, borderWidth },
          Platform.select({
            ios: {
              shadowColor: focused ? PRIMARY : '#000',
              shadowOffset: { width: 0, height: focused ? 0 : 2 },
              shadowOpacity: focused ? 0.18 : 0.06,
              shadowRadius: focused ? 8 : 4,
            },
            android: { elevation: focused ? 4 : 2 },
            default: {},
          }),
        ]}
      >
        <View style={styles.addressIconBadge}>
          <Feather name="map-pin" size={20} color={PRIMARY} />
        </View>
        <TextInput
          style={styles.addressInput}
          value={value}
          onChangeText={t => { onChangeText(t); setShowSuggestions(t.length >= 3); }}
          placeholder="Search your workshop address…"
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {loadingSuggestions && <ActivityIndicator size="small" color={PRIMARY} style={{ marginRight: 12 }} />}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s.place_id}
              style={[
                styles.suggestionItem,
                i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: BORDER },
              ]}
              onPress={() => pickSuggestion(s)}
              activeOpacity={0.7}
            >
              <Feather name="navigation" size={13} color={PRIMARY} style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestionMain} numberOfLines={1}>
                  {s.structured_formatting.main_text}
                </Text>
                <Text style={styles.suggestionSub} numberOfLines={1}>
                  {s.structured_formatting.secondary_text}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!GOOGLE_KEY && (
        <Text style={styles.hintText}>💡 Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to enable address suggestions</Text>
      )}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Animated horizontal wheeler chip                   */
/* ─────────────────────────────────────────────────── */
function WheelerChip({
  emoji, full, sub, selected, onPress,
}: { emoji: string; full: string; sub: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.04 : 1,
      useNativeDriver: true,
      friction: 7,
      tension: 180,
    }).start();
  }, [selected]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ flex: 1 }}>
      <Animated.View
        style={[
          styles.vChip,
          selected ? styles.vChipSelected : styles.vChipIdle,
          { transform: [{ scale }] },
        ]}
      >
        {selected && (
          <View style={styles.vChipCheck}>
            <Feather name="check" size={9} color="#fff" />
          </View>
        )}
        <Text style={styles.vChipEmoji}>{emoji}</Text>
        <Text style={[styles.vChipFull, selected && styles.vChipFullSelected]}>
          {full}
        </Text>
        <Text style={[styles.vChipSub, selected && styles.vChipSubSelected]}>
          {sub}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Section card wrapper                               */
/* ─────────────────────────────────────────────────── */
function SectionCard({
  icon, title, children, sectionKey, onSectionLayout,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  children: React.ReactNode;
  sectionKey?: string;
  onSectionLayout?: (key: string, y: number) => void;
}) {
  return (
    <View
      style={styles.card}
      onLayout={e => {
        if (sectionKey && onSectionLayout) onSectionLayout(sectionKey, e.nativeEvent.layout.y);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBadge}>
          <Feather name={icon} size={20} color={PRIMARY} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Gradient submit button with scale animation        */
/* ─────────────────────────────────────────────────── */
function SubmitButton({
  label, onPress, loading, disabled,
}: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, friction: 6, tension: 200 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
  }

  return (
    <Animated.View
      style={[
        styles.submitWrap,
        { transform: [{ scale }], opacity: disabled && !loading ? 0.55 : 1 },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        <LinearGradient
          colors={['#C41E3A', '#921527']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitGradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>{label}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Main screen                                        */
/* ─────────────────────────────────────────────────── */
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, error, clearError } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const sectionY = useRef<Record<string, number>>({});

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
    acceptTerms:  false,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
    clearError();
  }

  function touch(key: string) {
    setTouched(t => ({ ...t, [key]: true }));
  }

  function toggleWheeler(id: string) {
    setForm(f => ({
      ...f,
      wheelers: f.wheelers.includes(id)
        ? f.wheelers.filter(w => w !== id)
        : [...f.wheelers, id],
    }));
  }

  const errors = {
    firstName:    touched.firstName    && !form.firstName    ? 'First name is required' : '',
    workshopName: touched.workshopName && !form.workshopName ? 'Workshop name is required' : '',
    phone:        touched.phone        && form.phone.length < 10 ? 'Enter a valid 10-digit number' : '',
    email:        touched.email        && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
                    ? 'Enter a valid email address' : '',
    wheelers:     touched.wheelers     && form.wheelers.length === 0 ? 'Select at least one vehicle type' : '',
  };

  const isValid = !!(
    form.firstName &&
    form.workshopName &&
    form.phone.length >= 10 &&
    form.wheelers.length > 0 &&
    form.acceptTerms
  );

  const handleSubmit = useCallback(async () => {
    setTouched(t => ({ ...t, firstName: true, workshopName: true, phone: true, wheelers: true }));
    if (!isValid) {
      const order = ['personal', 'workshop', 'contact', 'wheelers'];
      const errs: Record<string, boolean> = {
        personal: !form.firstName,
        workshop: !form.workshopName,
        contact:  form.phone.length < 10,
        wheelers: form.wheelers.length === 0,
      };
      const first = order.find(k => errs[k]);
      if (first && sectionY.current[first] != null) {
        scrollRef.current?.scrollTo({ y: sectionY.current[first] - 16, animated: true });
      }
      return;
    }
    await signUp({
      first_name:     form.firstName,
      last_name:      form.lastName   || null,
      mobile:         form.phone,
      email:          form.email      || '',
      workshop_name:  form.workshopName,
      address:        form.address    || null,
      city:           form.city       || null,
      state:          form.state      || null,
      zipcode:        form.zipcode    || null,
      country:        form.country    || null,
      mobile_2:       form.phone2     || null,
      wheelers:       form.wheelers.length > 0 ? form.wheelers : null,
      terms_accepted: true,
    });
  }, [form, isValid, signUp]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient header ── */}
        <LinearGradient
          colors={[PRIMARY, PRIMARY_D]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 24 }]}
        >
          {/* Logo — clean transparent PNG on gradient */}
          <Image
            source={require('../../assets/images/logo_clean.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />

          {/* Page title & subtitle inside gradient */}
          <Text style={styles.pageTitle}>Create Your Garage Owner Account</Text>
          <Text style={styles.pageSubtitle}>
            Register your garage to receive bookings, manage services, and grow your business with GoFixAuto.
          </Text>
        </LinearGradient>

        {/* ── Form body ── */}
        <View style={styles.formBody}>
          {/* API Error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={15} color={DANGER} />
              <Text style={[typography.bodySm, { color: DANGER, flex: 1 }]}>{error}</Text>
            </View>
          ) : null}

          {/* ── Personal Details ── */}
          <SectionCard
            icon="user" title="Personal Details"
            sectionKey="personal"
            onSectionLayout={(k, y) => { sectionY.current[k] = y; }}
          >
            {/* ── Live name preview — appears as the user types ── */}
            {(form.firstName || form.lastName) ? (
              <View style={styles.namePreviewRow}>
                <LinearGradient
                  colors={['#C41E3A', '#E11D48']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.nameAvatarGradient}
                >
                  <Text style={styles.nameAvatarText}>
                    {`${(form.firstName[0] ?? '').toUpperCase()}${(form.lastName[0] ?? '').toUpperCase()}`}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.namePreviewCaption}>Garage Owner</Text>
                  <Text style={styles.namePreviewFull} numberOfLines={1}>
                    {[form.firstName, form.lastName].filter(Boolean).join(' ')}
                  </Text>
                </View>
                <View style={styles.namePreviewBadge}>
                  <Feather name="check" size={11} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={styles.nameHintRow}>
                <Feather name="info" size={13} color="#94A3B8" />
                <Text style={styles.nameHintText}>
                  Your name appears on customer invoices &amp; job cards
                </Text>
              </View>
            )}

            {/* ── First Name — full width ── */}
            <InputField
              label="First Name *"
              value={form.firstName}
              onChangeText={v => set('firstName', v)}
              onBlur={() => touch('firstName')}
              placeholder="Enter your first name"
              autoCapitalize="words"
              leadingIcon="user"
              error={errors.firstName}
              returnKeyType="next"
            />

            {/* ── Last Name — full width, optional ── */}
            <View>
              <View style={styles.lastNameLabelRow}>
                <Text style={styles.lastNameLabel}>Last Name</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText}>Optional</Text>
                </View>
              </View>
              <InputField
                value={form.lastName}
                onChangeText={v => set('lastName', v)}
                placeholder="Enter your last name"
                autoCapitalize="words"
                leadingIcon="user"
                containerStyle={{ marginBottom: 0 }}
                returnKeyType="next"
              />
            </View>
          </SectionCard>

          {/* ── Workshop Details ── */}
          <SectionCard
            icon="home" title="Workshop Details"
            sectionKey="workshop"
            onSectionLayout={(k, y) => { sectionY.current[k] = y; }}
          >
            <InputField
              label="Workshop Name *"
              value={form.workshopName}
              onChangeText={v => set('workshopName', v)}
              onBlur={() => touch('workshopName')}
              placeholder="e.g. Sharma Auto Works"
              leadingIcon="briefcase"
              error={errors.workshopName}
            />
            <InputField
              label="Email Address"
              value={form.email}
              onChangeText={v => set('email', v)}
              onBlur={() => touch('email')}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leadingIcon="mail"
              error={errors.email}
            />

            <AddressAutocomplete
              value={form.address}
              onChangeText={v => set('address', v)}
              onSelect={({ address, city, state, pincode, country }) => {
                setForm(f => ({
                  ...f,
                  address,
                  city:    city    || f.city,
                  state:   state   || f.state,
                  zipcode: pincode || f.zipcode,
                  country: country || f.country,
                }));
              }}
            />

            {/* ── Location preview chip ── */}
            {(form.city || form.state) ? (
              <View style={styles.locationPreviewRow}>
                <View style={styles.locationIconCircle}>
                  <Feather name="map-pin" size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.locationPreviewCaption}>Workshop Location</Text>
                  <Text style={styles.locationPreviewFull} numberOfLines={1}>
                    {[form.city, form.state].filter(Boolean).join(', ')}
                    {form.zipcode ? ` – ${form.zipcode}` : ''}
                  </Text>
                </View>
                <View style={styles.locationPreviewBadge}>
                  <Feather name="map-pin" size={11} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={styles.locationHintRow}>
                <Feather name="navigation" size={13} color="#94A3B8" />
                <Text style={styles.locationHintText}>
                  Helps customers discover your workshop nearby
                </Text>
              </View>
            )}

            {/* City — full width */}
            <InputField
              label="City"
              value={form.city}
              onChangeText={v => set('city', v)}
              placeholder="Enter your city"
              leadingIcon="map-pin"
              returnKeyType="next"
            />

            {/* State — full width */}
            <InputField
              label="State"
              value={form.state}
              onChangeText={v => set('state', v)}
              placeholder="Enter your state"
              leadingIcon="flag"
              returnKeyType="next"
            />

            {/* Pincode + Country — side by side (short values, intentional) */}
            <View style={styles.locationShortRow}>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Pincode"
                  value={form.zipcode}
                  onChangeText={v => set('zipcode', v)}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  leadingIcon="hash"
                  returnKeyType="next"
                />
              </View>
              <View style={{ flex: 1 }}>
                <InputField
                  label="Country"
                  value={form.country}
                  onChangeText={v => set('country', v)}
                  placeholder="India"
                  leadingIcon="globe"
                />
              </View>
            </View>
          </SectionCard>

          {/* ── Contact ── */}
          <SectionCard
            icon="phone" title="Contact"
            sectionKey="contact"
            onSectionLayout={(k, y) => { sectionY.current[k] = y; }}
          >
            <InputField
              label="Primary Phone *"
              value={form.phone}
              onChangeText={v => set('phone', v.replace(/\D/g, ''))}
              onBlur={() => touch('phone')}
              placeholder="Enter 10-digit mobile number"
              keyboardType="number-pad"
              maxLength={10}
              prefix="+91"
              leadingIcon="phone"
              error={errors.phone}
            />
            <InputField
              label="Alternate Phone (Optional)"
              value={form.phone2}
              onChangeText={v => set('phone2', v.replace(/\D/g, ''))}
              placeholder="Enter 10-digit mobile number"
              keyboardType="number-pad"
              maxLength={10}
              prefix="+91"
              leadingIcon="phone"
            />
          </SectionCard>

          {/* ── Vehicle Service Type ── */}
          <SectionCard
            icon="truck" title="Vehicle Service Type *"
            sectionKey="wheelers"
            onSectionLayout={(k, y) => { sectionY.current[k] = y; }}
          >
            <Text style={styles.wheelerHint}>Select all vehicle types your workshop services</Text>
            <View style={styles.vChipRow}>
              {WHEELER_OPTIONS.map(opt => (
                <WheelerChip
                  key={opt.id}
                  emoji={opt.emoji}
                  full={opt.full}
                  sub={opt.sub}
                  selected={form.wheelers.includes(opt.id)}
                  onPress={() => { toggleWheeler(opt.id); touch('wheelers'); }}
                />
              ))}
            </View>
            {errors.wheelers ? (
              <Text style={[styles.fieldError, { marginTop: 6 }]}>{errors.wheelers}</Text>
            ) : null}
          </SectionCard>

          {/* ── Terms & Conditions ── */}
          <View style={styles.termsCard}>
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => set('acceptTerms', !form.acceptTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, form.acceptTerms && styles.checkboxChecked]}>
                {form.acceptTerms && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL('https://gofixcarz.com/terms')}
                >
                  Terms and Conditions
                </Text>
                {' '}and{' '}
                <Text
                  style={styles.termsLink}
                  onPress={() => Linking.openURL('https://gofixcarz.com/privacy')}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Submit ── */}
          <SubmitButton
            label="Create Account"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!isValid || isLoading}
          />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.signInRow}
            activeOpacity={0.7}
          >
            <Text style={[typography.bodySm, { color: MUTED }]}>
              Already have an account?{' '}
              <Text style={{ color: PRIMARY, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Styles                                             */
/* ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },

  /* ── Gradient header ── */
  headerGradient: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 36,
  },

  logoImg: {
    width: 200,
    height: 120,
    marginBottom: 24,
  },

  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  pageSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  /* ── Form body ── */
  formBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  /* Error banner */
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    borderWidth: 1, borderColor: '#FECACA',
    padding: spacing.md, marginBottom: spacing.md,
  },

  /* ── Section card ── */
  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardIconBadge: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_COLOR,
    letterSpacing: -0.2,
  },
  cardBody: { padding: 24 },

  /* Row layout */
  row: { flexDirection: 'row', gap: 10 },

  /* ── Name preview chip ── */
  namePreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 22,
    borderWidth: 1, borderColor: '#BFDBFE',
    ...Platform.select({
      ios: { shadowColor: '#C41E3A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 10 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  nameAvatarGradient: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  nameAvatarText: {
    fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.5,
  },
  namePreviewCaption: {
    fontSize: 10, fontWeight: '700', color: '#3B82F6',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  namePreviewFull: {
    fontSize: 16, fontWeight: '700', color: '#1E293B', letterSpacing: -0.2,
  },
  namePreviewBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.30, shadowRadius: 4 },
      android: { elevation: 3 },
      default: {},
    }),
  },

  /* ── Name hint (empty state) ── */
  nameHintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  nameHintText: {
    fontSize: 12, color: '#94A3B8', flex: 1, lineHeight: 17,
  },

  /* ── Last name label row with Optional badge ── */
  lastNameLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  lastNameLabel: {
    fontSize: 15, fontWeight: '600', color: '#475569',
  },
  optionalBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  optionalBadgeText: {
    fontSize: 10, fontWeight: '600', color: '#94A3B8', letterSpacing: 0.3,
  },

  /* ── Address autocomplete ── */
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  addressInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    height: 58,
    marginBottom: 4,
    overflow: 'hidden',
  },
  addressIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 4,
  },
  addressInput: {
    flex: 1,
    fontSize: 15, color: TEXT_COLOR,
    padding: 0, margin: 0,
    paddingRight: 18,
  },
  suggestionList: {
    backgroundColor: CARD,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  suggestionMain: { ...typography.bodySm, color: TEXT_COLOR, fontWeight: '600' },
  suggestionSub:  { ...typography.caption, color: MUTED },
  hintText:       { ...typography.caption, color: MUTED, marginBottom: spacing.sm, fontStyle: 'italic' },
  fieldError:     { ...typography.caption, color: DANGER, marginTop: 4, marginBottom: 4 },

  /* ── Wheeler chips (3-column grid) ── */
  wheelerHint: { ...typography.caption, color: MUTED, marginBottom: 14 },
  vChipRow: { flexDirection: 'row', gap: 10 },
  vChip: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 20,
    paddingVertical: 20, paddingHorizontal: 6,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  vChipIdle:     { backgroundColor: '#F8FAFC', borderColor: BORDER },
  vChipSelected: { backgroundColor: PRIMARY_LIGHT, borderColor: PRIMARY },
  vChipEmoji:    { fontSize: 30, marginBottom: 10 },
  vChipFull: {
    fontSize: 12, fontWeight: '700', color: LABEL,
    textAlign: 'center', letterSpacing: 0.1, marginBottom: 3,
  },
  vChipFullSelected: { color: PRIMARY },
  vChipSub: {
    fontSize: 10, fontWeight: '500', color: MUTED,
    textAlign: 'center', lineHeight: 13,
  },
  vChipSubSelected: { color: '#3B82F6' },
  vChipCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4 },
      android: { elevation: 3 },
      default: {},
    }),
  },

  /* ── Location preview chip ── */
  locationPreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 18, padding: 14, marginBottom: 22,
    borderWidth: 1, borderColor: '#BBF7D0',
    ...Platform.select({
      ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.10, shadowRadius: 10 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  locationIconCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  locationPreviewCaption: {
    fontSize: 10, fontWeight: '700', color: '#059669',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  locationPreviewFull: {
    fontSize: 15, fontWeight: '700', color: '#1E293B', letterSpacing: -0.2,
  },
  locationPreviewBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.30, shadowRadius: 4 },
      android: { elevation: 3 },
      default: {},
    }),
  },

  /* ── Location hint (empty state) ── */
  locationHintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 20,
    borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  locationHintText: { fontSize: 12, color: '#94A3B8', flex: 1, lineHeight: 17 },

  /* ── Pincode + Country short row ── */
  locationShortRow: { flexDirection: 'row', gap: 10 },

  /* ── Gradient submit button ── */
  submitWrap: {
    borderRadius: 16,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  submitGradient: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  /* ── Terms ── */
  termsCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  termsRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#CBD5E1',
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  termsText:       { ...typography.bodySm, color: LABEL, flex: 1, lineHeight: 20 },
  termsLink:       { color: PRIMARY, fontWeight: '700' },

  /* ── Footer ── */
  signInRow: { alignItems: 'center', paddingVertical: 4 },
});
