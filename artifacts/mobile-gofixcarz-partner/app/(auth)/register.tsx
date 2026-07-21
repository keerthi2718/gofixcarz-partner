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
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import { radius, shadow, spacing, typography } from '@/constants/theme';

/* ── Design tokens ─────────────────────────────────── */
const PRIMARY       = '#2563EB';
const PRIMARY_D     = '#1D4ED8';
const PRIMARY_LIGHT = '#DBEAFE';
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
  { id: '2W', emoji: '🏍️', label: '2W', full: '2 Wheeler' },
  { id: '3W', emoji: '🛺',  label: '3W', full: '3 Wheeler' },
  { id: '4W', emoji: '🚗',  label: '4W', full: '4 Wheeler' },
  { id: '6W', emoji: '🚚',  label: '6W', full: '6W / Heavy' },
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
      <View style={[styles.addressInputWrap, { borderColor, borderWidth }]}>
        <Feather name="map-pin" size={16} color={focused ? PRIMARY : '#94A3B8'} style={{ marginRight: 10 }} />
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
        {loadingSuggestions && <ActivityIndicator size="small" color={PRIMARY} />}
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
  emoji, label, selected, onPress,
}: { emoji: string; label: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.06 : 1,
      useNativeDriver: true,
      friction: 6,
      tension: 200,
    }).start();
  }, [selected]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.hChip,
          selected ? styles.hChipSelected : styles.hChipIdle,
          { transform: [{ scale }] },
        ]}
      >
        {selected && (
          <View style={styles.hChipCheck}>
            <Feather name="check" size={9} color="#fff" />
          </View>
        )}
        <Text style={styles.hChipEmoji}>{emoji}</Text>
        <Text style={[styles.hChipLabel, selected && styles.hChipLabelSelected]}>
          {label}
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
      style={[styles.card, shadow.md]}
      onLayout={e => {
        if (sectionKey && onSectionLayout) onSectionLayout(sectionKey, e.nativeEvent.layout.y);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBadge}>
          <Feather name={icon} size={15} color={PRIMARY} />
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
          style={[styles.headerGradient, { paddingTop: insets.top + 28 }]}
        >
          {/* Logo */}
          <View style={[styles.logoCard, shadow.md]}>
            <Image
              source={require('../../assets/images/logo.jpg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Page title & subtitle inside gradient */}
          <Text style={styles.pageTitle}>Join GoFixAuto</Text>
          <Text style={styles.pageSubtitle}>
            Create your garage partner account to receive bookings, manage services, and grow your business with GoFixAuto.
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
          <SectionCard
            icon="tool" title="Workshop Details"
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hChipRow}
              keyboardShouldPersistTaps="handled"
            >
              {WHEELER_OPTIONS.map(opt => (
                <WheelerChip
                  key={opt.id}
                  emoji={opt.emoji}
                  label={opt.label}
                  selected={form.wheelers.includes(opt.id)}
                  onPress={() => { toggleWheeler(opt.id); touch('wheelers'); }}
                />
              ))}
            </ScrollView>
            {errors.wheelers ? (
              <Text style={[styles.fieldError, { marginTop: 6 }]}>{errors.wheelers}</Text>
            ) : null}
          </SectionCard>

          {/* ── Terms & Conditions ── */}
          <View style={[styles.termsCard, shadow.sm]}>
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
          <View style={[shadow.md, { borderRadius: 16, marginBottom: spacing.md }]}>
            <PrimaryButton
              label="Create Account"
              onPress={handleSubmit}
              loading={isLoading}
              disabled={!isValid || isLoading}
            />
          </View>

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
    paddingBottom: 32,
  },

  logoCard: {
    width: 120, height: 80, borderRadius: 18,
    backgroundColor: '#fff', overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  logo: { width: '100%', height: '100%' },

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
    padding: spacing.base,
    paddingTop: spacing.xl,
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
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.lg, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardIconBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    letterSpacing: -0.1,
  },
  cardBody: { padding: spacing.lg },

  /* Row layout */
  row: { flexDirection: 'row', gap: 10 },

  /* ── Address autocomplete ── */
  fieldLabel: {
    ...typography.label,
    color: LABEL,
    marginBottom: 6,
  },
  addressInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 52,
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

  /* ── Wheeler chips ── */
  wheelerHint: { ...typography.caption, color: MUTED, marginBottom: spacing.sm },
  hChipRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  hChip: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: 18,
    minWidth: 76,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  hChipIdle: {
    backgroundColor: '#F8FAFC',
    borderColor: BORDER,
  },
  hChipSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  hChipEmoji:         { fontSize: 26, marginBottom: 6 },
  hChipLabel:         { ...typography.label, color: LABEL, textAlign: 'center' },
  hChipLabelSelected: { color: PRIMARY, fontWeight: '700' as const },
  hChipCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── Terms ── */
  termsCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: BORDER,
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
