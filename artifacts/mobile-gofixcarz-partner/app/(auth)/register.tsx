import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import InputField from '@/src/components/ui/InputField';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import { radius, shadow, spacing, typography } from '@/constants/theme';

const PRIMARY = '#C62839';
const PRIMARY_LIGHT = '#FEF2F2';
const TEXT_COLOR = '#111827';
const BG = '#F4F5F7';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const BORDER_FOCUS = PRIMARY;
const LABEL = '#374151';
const MUTED = '#6B7280';
const DANGER = '#EF4444';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

/* ─────────────────────────────────────────────────── */
/*  Vehicle Service Type options (maps to `wheelers`)  */
/* ─────────────────────────────────────────────────── */
const WHEELER_OPTIONS = [
  { id: '2W', label: '2 Wheeler',           sub: 'Bikes & Scooters' },
  { id: '3W', label: '3 Wheeler',           sub: 'Auto Rickshaws'   },
  { id: '4W', label: '4 Wheeler',           sub: 'Cars & SUVs'      },
  { id: '6W', label: '6W / Heavy Vehicles', sub: 'Trucks & Buses'   },
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
/*  Debounce hook                                       */
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
/*  Address autocomplete component                      */
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

  // Fetch autocomplete suggestions
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
  const borderWidth = focused ? 1.5 : 1;

  return (
    <View>
      {/* Label */}
      <Text style={styles.fieldLabel}>Address</Text>

      {/* Input */}
      <View style={[styles.addressInputWrap, { borderColor, borderWidth }]}>
        <Feather name="map-pin" size={16} color={focused ? PRIMARY : MUTED} style={{ marginRight: 10 }} />
        <TextInput
          style={styles.addressInput}
          value={value}
          onChangeText={t => { onChangeText(t); setShowSuggestions(t.length >= 3); }}
          placeholder="Search your workshop address…"
          placeholderTextColor="#9CA3AF"
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 200); }}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {loadingSuggestions && <ActivityIndicator size="small" color={PRIMARY} />}
      </View>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionList}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={s.place_id}
              style={[
                styles.suggestionItem,
                i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
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

      {/* No API key fallback hint */}
      {!GOOGLE_KEY && (
        <Text style={styles.hintText}>💡 Add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY to enable address suggestions</Text>
      )}

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Section card wrapper                               */
/* ─────────────────────────────────────────────────── */
function SectionCard({
  icon, title, children,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, shadow.sm]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBadge}>
          <Feather name={icon} size={14} color={PRIMARY} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Main screen                                        */
/* ─────────────────────────────────────────────────── */
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, error, clearError } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

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

  // Track touched fields for inline validation
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

  // Validation helpers
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
    // Touch all required fields to show validation
    setTouched(t => ({ ...t, firstName: true, workshopName: true, phone: true, wheelers: true }));
    if (!isValid) return;

    await signUp({
      first_name:    form.firstName,
      last_name:     form.lastName   || null,
      mobile:        form.phone,
      email:         form.email      || '',
      workshop_name: form.workshopName,
      address:       form.address    || null,
      city:          form.city       || null,
      state:         form.state      || null,
      zipcode:       form.zipcode    || null,
      country:       form.country    || null,
      mobile_2:      form.phone2     || null,
      wheelers:      form.wheelers.length > 0 ? form.wheelers : null,
      terms_accepted: true,
    });
  }, [form, isValid, signUp]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 48 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + header */}
        <View style={[styles.logoCard, shadow.md]}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={[typography.headline, styles.pageTitle]}>Create Account</Text>
        <Text style={[typography.bodySm, styles.pageSubtitle]}>
          Register your garage to start receiving jobs
        </Text>

        {/* API Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={15} color={DANGER} />
            <Text style={[typography.bodySm, { color: DANGER, flex: 1 }]}>{error}</Text>
          </View>
        ) : null}

        {/* ── Personal Details ── */}
        <SectionCard icon="user" title="Personal Details">
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="First Name *"
                value={form.firstName}
                onChangeText={v => set('firstName', v)}
                onBlur={() => touch('firstName')}
                placeholder="First name"
                autoCapitalize="words"
                leadingIcon="user"
                error={errors.firstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Last Name"
                value={form.lastName}
                onChangeText={v => set('lastName', v)}
                placeholder="Last name"
                autoCapitalize="words"
              />
            </View>
          </View>
        </SectionCard>

        {/* ── Workshop Details ── */}
        <SectionCard icon="tool" title="Workshop Details">
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

          {/* Google Places address */}
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

          <View style={[styles.row, { marginTop: 4 }]}>
            <View style={{ flex: 1 }}>
              <InputField
                label="City"
                value={form.city}
                onChangeText={v => set('city', v)}
                placeholder="City"
                leadingIcon="map"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="State"
                value={form.state}
                onChangeText={v => set('state', v)}
                placeholder="State"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Pincode"
                value={form.zipcode}
                onChangeText={v => set('zipcode', v)}
                placeholder="Pincode"
                keyboardType="number-pad"
                leadingIcon="hash"
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Country"
                value={form.country}
                onChangeText={v => set('country', v)}
                placeholder="India"
              />
            </View>
          </View>
        </SectionCard>

        {/* ── Contact ── */}
        <SectionCard icon="phone" title="Contact">
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label="Primary Phone *"
                value={form.phone}
                onChangeText={v => { set('phone', v.replace(/\D/g, '')); }}
                onBlur={() => touch('phone')}
                placeholder="10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                prefix="+91"
                leadingIcon="phone"
                error={errors.phone}
              />
            </View>
            <View style={{ flex: 1 }}>
              <InputField
                label="Phone 2 (Optional)"
                value={form.phone2}
                onChangeText={v => set('phone2', v.replace(/\D/g, ''))}
                placeholder="Alternate number"
                keyboardType="phone-pad"
                maxLength={10}
                prefix="+91"
              />
            </View>
          </View>
        </SectionCard>

        {/* ── Vehicle Service Type ── */}
        <SectionCard icon="truck" title="Vehicle Service Type *">
          <Text style={styles.wheelerHint}>Select all types your workshop services</Text>
          <View style={styles.wheelerGrid}>
            {WHEELER_OPTIONS.map(opt => {
              const selected = form.wheelers.includes(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.wheelerChip, selected && styles.wheelerChipSelected]}
                  onPress={() => { toggleWheeler(opt.id); touch('wheelers'); }}
                  activeOpacity={0.75}
                >
                  <View style={styles.wheelerCheckbox}>
                    {selected ? (
                      <Feather name="check" size={11} color="#fff" />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.wheelerLabel, selected && styles.wheelerLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.wheelerSub, selected && { color: PRIMARY }]}>
                      {opt.sub}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.wheelers ? (
            <Text style={styles.fieldError}>{errors.wheelers}</Text>
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
        <PrimaryButton
          label="Create Account"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!isValid || isLoading}
          style={styles.submitBtn}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────────── */
/*  Styles                                             */
/* ─────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
  },

  /* Header */
  logoCard: {
    width: 120, height: 80, borderRadius: radius.lg,
    backgroundColor: '#111', overflow: 'hidden',
    alignSelf: 'center', marginBottom: spacing.md,
  },
  logo: { width: '100%', height: '100%' },
  pageTitle: { color: TEXT_COLOR, textAlign: 'center', marginBottom: 4 },
  pageSubtitle: { color: MUTED, textAlign: 'center', marginBottom: spacing.lg },

  /* Error banner */
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    borderWidth: 1, borderColor: '#FECACA',
    padding: spacing.md, marginBottom: spacing.md,
  },

  /* Section card */
  card: {
    backgroundColor: CARD,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.base, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  cardIconBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    ...typography.titleSm,
    color: TEXT_COLOR,
  },
  cardBody: { padding: spacing.base },

  /* Row layout */
  row: { flexDirection: 'row', gap: 10 },

  /* Address autocomplete */
  fieldLabel: {
    ...typography.label,
    color: LABEL,
    marginBottom: 6,
  },
  addressInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: radius.md,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: 4,
  },
  addressInput: {
    flex: 1,
    fontSize: 15, color: TEXT_COLOR,
    padding: 0, margin: 0,
  },
  suggestionList: {
    backgroundColor: CARD,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    // elevate above other inputs
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
  hintText: { ...typography.caption, color: MUTED, marginBottom: spacing.sm, fontStyle: 'italic' },
  fieldError: { ...typography.caption, color: DANGER, marginTop: 4, marginBottom: 4 },

  /* Wheeler chips */
  wheelerHint: { ...typography.caption, color: MUTED, marginBottom: spacing.sm },
  wheelerGrid: { gap: 8 },
  wheelerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: BORDER,
    borderRadius: radius.md,
    backgroundColor: '#FAFAFA',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  wheelerChipSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#FFF5F5',
  },
  wheelerCheckbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  wheelerLabel:         { ...typography.bodySm, fontWeight: '600', color: LABEL },
  wheelerLabelSelected: { color: PRIMARY },
  wheelerSub:           { ...typography.caption, color: MUTED, marginTop: 1 },

  /* Terms */
  termsCard: {
    backgroundColor: CARD,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: PRIMARY, borderColor: PRIMARY,
  },
  termsText: { ...typography.bodySm, color: LABEL, flex: 1, lineHeight: 20 },
  termsLink: { color: PRIMARY, fontWeight: '700' },

  /* Submit */
  submitBtn: { marginBottom: spacing.md },
  signInRow: { alignItems: 'center', paddingVertical: 4 },
});

