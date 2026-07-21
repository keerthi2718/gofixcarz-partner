import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import InputField from '@/src/components/ui/InputField';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import { radius, shadow, spacing, typography } from '@/constants/theme';

const PRIMARY = '#C62839';
const BG = '#F7F8FA';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, error, clearError } = useAuth();

  const [form, setForm] = useState({
    firstName: '', lastName: '', workshopName: '',
    email: '', address: '', city: '', state: '',
    zipcode: '', country: 'India',
    phone: '', phone2: '',
    acceptTerms: false,
  });

  function set(key: keyof typeof form, val: string | boolean) {
    setForm(f => ({ ...f, [key]: val }));
    clearError();
  }

  async function handleSubmit() {
    if (!form.acceptTerms) return;
    await signUp({
      first_name: form.firstName,
      last_name: form.lastName || null,
      mobile: form.phone,
      email: form.email || '',
      workshop_name: form.workshopName,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      zipcode: form.zipcode || null,
      country: form.country || null,
      mobile_2: form.phone2 || null,
      terms_accepted: true,
    });
  }

  const isValid = !!(form.firstName && form.workshopName && form.phone.length >= 10 && form.acceptTerms);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={[styles.logoCard, shadow.md]}>
          <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={[typography.headline, styles.title]}>Create Account</Text>
        <Text style={[typography.bodySm, styles.subtitle]}>Register your garage to get started</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={[typography.bodySm, { color: '#EF4444', flex: 1 }]}>{error}</Text>
          </View>
        ) : null}

        {/* Section: Personal */}
        <Text style={styles.sectionLabel}>PERSONAL DETAILS</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField
              label="First Name *"
              value={form.firstName}
              onChangeText={v => set('firstName', v)}
              placeholder="First name"
              autoCapitalize="words"
              leadingIcon="user"
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

        {/* Section: Workshop */}
        <Text style={styles.sectionLabel}>WORKSHOP DETAILS</Text>
        <InputField
          label="Workshop Name *"
          value={form.workshopName}
          onChangeText={v => set('workshopName', v)}
          placeholder="e.g. Sharma Auto Works"
          leadingIcon="tool"
        />
        <InputField
          label="Email"
          value={form.email}
          onChangeText={v => set('email', v)}
          placeholder="email@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          leadingIcon="mail"
        />
        <InputField
          label="Address"
          value={form.address}
          onChangeText={v => set('address', v)}
          placeholder="Street address"
          leadingIcon="map-pin"
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField label="City" value={form.city} onChangeText={v => set('city', v)} placeholder="City" />
          </View>
          <View style={{ flex: 1 }}>
            <InputField label="State" value={form.state} onChangeText={v => set('state', v)} placeholder="State" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField label="Zipcode" value={form.zipcode} onChangeText={v => set('zipcode', v)} placeholder="Zipcode" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <InputField label="Country" value={form.country} onChangeText={v => set('country', v)} placeholder="India" />
          </View>
        </View>

        {/* Section: Contact */}
        <Text style={styles.sectionLabel}>CONTACT</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <InputField
              label="Phone *"
              value={form.phone}
              onChangeText={v => set('phone', v)}
              placeholder="10-digit"
              keyboardType="phone-pad"
              maxLength={10}
              prefix="+91"
              leadingIcon="phone"
            />
          </View>
          <View style={{ flex: 1 }}>
            <InputField
              label="Phone 2"
              value={form.phone2}
              onChangeText={v => set('phone2', v)}
              placeholder="Optional"
              keyboardType="phone-pad"
              maxLength={10}
              prefix="+91"
            />
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => set('acceptTerms', !form.acceptTerms)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, form.acceptTerms && { backgroundColor: PRIMARY, borderColor: PRIMARY }]}>
            {form.acceptTerms && <Feather name="check" size={12} color="#fff" />}
          </View>
          <Text style={[typography.bodySm, { color: '#374151', flex: 1 }]}>
            I accept the{' '}
            <Text style={{ color: PRIMARY, fontWeight: '700' }}>Terms and Conditions</Text>
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <PrimaryButton
          label="Create Account"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={!isValid}
          style={{ marginTop: 8 }}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={styles.linkRow}
          activeOpacity={0.7}
        >
          <Text style={[typography.bodySm, { color: '#6B7280' }]}>
            Already have an account?{' '}
            <Text style={{ color: PRIMARY, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.base },
  logoCard: {
    width: 140, height: 96, borderRadius: radius.lg,
    backgroundColor: '#111', overflow: 'hidden',
    marginBottom: spacing.base, alignSelf: 'center',
  },
  logo: { width: '100%', height: '100%' },
  title: { color: '#111827', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: '#6B7280', textAlign: 'center', marginBottom: spacing.xl },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#FECACA',
    padding: spacing.md, marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 1.5, marginBottom: spacing.sm, marginTop: 4,
  },
  row: { flexDirection: 'row', gap: 10 },
  termsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: spacing.base, marginTop: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  linkRow: { alignItems: 'center', marginTop: spacing.base },
});
