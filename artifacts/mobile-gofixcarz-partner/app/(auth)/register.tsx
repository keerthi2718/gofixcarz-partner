import React, { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

const RED = '#C62828';
const DURATIONS = ['2W', '3W', '4W', '6W'];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, error, clearError } = useAuth();

  const [form, setForm] = useState({
    firstName: '', lastName: '', workshopName: '',
    email: '', address: '', city: '', state: '',
    zipcode: '', country: 'India',
    phone: '', phone2: '', duration: '2W',
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

  const isValid =
    form.firstName && form.workshopName && form.phone.length >= 10 && form.acceptTerms;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.tagline}>SMART WORKSHOP MANAGER</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Two-column fields */}
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>First name*</Text>
            <TextInput style={styles.input} value={form.firstName} onChangeText={v => set('firstName', v)} placeholder="First name" placeholderTextColor="#9CA3AF" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} value={form.lastName} onChangeText={v => set('lastName', v)} placeholder="Last name" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Workshop Name*</Text>
          <TextInput style={styles.input} value={form.workshopName} onChangeText={v => set('workshopName', v)} placeholder="Your workshop name" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={v => set('email', v)} placeholder="Email" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={form.address} onChangeText={v => set('address', v)} placeholder="Address" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={v => set('city', v)} placeholder="City" placeholderTextColor="#9CA3AF" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>State</Text>
            <TextInput style={styles.input} value={form.state} onChangeText={v => set('state', v)} placeholder="State" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Zipcode</Text>
            <TextInput style={styles.input} value={form.zipcode} onChangeText={v => set('zipcode', v)} placeholder="Zipcode" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Country</Text>
            <TextInput style={styles.input} value={form.country} onChangeText={v => set('country', v)} placeholder="Country" placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Phone Number*</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]} value={form.phone} onChangeText={v => set('phone', v)} placeholder="Mobile" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" maxLength={10} />
            </View>
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Phone Number 2</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput style={[styles.input, { flex: 1, borderWidth: 0 }]} value={form.phone2} onChangeText={v => set('phone2', v)} placeholder="Mobile" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" maxLength={10} />
            </View>
          </View>
        </View>

        {/* Duration */}
        <View style={styles.durationRow}>
          {DURATIONS.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.durationBtn, form.duration === d && styles.durationBtnActive]}
              onPress={() => set('duration', d)}
              activeOpacity={0.8}
            >
              <Text style={[styles.durationText, form.duration === d && styles.durationTextActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Terms */}
        <TouchableOpacity style={styles.termsRow} onPress={() => set('acceptTerms', !form.acceptTerms)} activeOpacity={0.8}>
          <View style={[styles.checkbox, form.acceptTerms && styles.checkboxActive]}>
            {form.acceptTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.termsText}>
            I accept <Text style={{ color: RED }}>Terms and conditions</Text>
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, { opacity: isValid && !isLoading ? 1 : 0.6 }]}
          onPress={handleSubmit}
          disabled={!isValid || isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Send OTP</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.8} style={{ alignSelf: 'flex-end' }}>
          <Text style={[styles.termsText, { color: RED, fontWeight: '600' }]}>Already have an account?</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  logoContainer: {
    width: 120, height: 80, borderRadius: 12,
    overflow: 'hidden', marginBottom: 8, backgroundColor: '#111', alignSelf: 'center',
  },
  logo: { width: '100%', height: '100%' },
  tagline: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  errorText: { fontSize: 13, color: '#EF4444' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  half: { flex: 1, gap: 4 },
  field: { gap: 4, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 10, fontSize: 13, color: '#111827',
    backgroundColor: '#fff',
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    backgroundColor: '#fff', overflow: 'hidden',
  },
  phonePrefix: { paddingHorizontal: 8, fontSize: 13, color: '#374151', fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  durationBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center',
  },
  durationBtnActive: { backgroundColor: RED, borderColor: RED },
  durationText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  durationTextActive: { color: '#fff' },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1.5, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: RED, borderColor: RED },
  checkmark: { fontSize: 11, color: '#fff', fontWeight: '700' },
  termsText: { fontSize: 13, color: '#374151' },
  btn: {
    backgroundColor: RED, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
