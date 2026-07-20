import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useAuth } from '@/src/context/AuthContext';
import type { SignUpPayload } from '@/src/types';
import { emailValidator, nameValidator, phoneValidator } from '@/src/utils/validators';

const NAVY = '#1B3A6B';
const ORANGE = '#FF6B2B';

type FormData = {
  first_name: string;
  workshop_name: string;
  email: string;
  mobile: string;
  city: string;
  state: string;
};

function Field({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6, marginBottom: 16 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600' as const, color: NAVY },
  error: { fontSize: 12, color: '#EF4444' },
});

function StyledInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      style={regStyles.input}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
}
const regStyles = StyleSheet.create({
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 13, fontSize: 15, color: '#111827',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
});

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, isLoading, error, clearError } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { first_name: '', workshop_name: '', email: '', mobile: '', city: '', state: '' },
  });

  async function onSubmit(data: FormData) {
    if (!termsAccepted) return;
    const payload: SignUpPayload = {
      first_name: data.first_name,
      workshop_name: data.workshop_name,
      email: data.email,
      mobile: data.mobile,
      city: data.city || null,
      state: data.state || null,
      terms_accepted: true,
    };
    await signUp(payload);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={[styles.scroll, {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
        }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={NAVY} />
        </TouchableOpacity>

        <View style={styles.top}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your garage partner profile</Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Feather name="x" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Form */}
        <Controller
          control={control} name="workshop_name"
          rules={{ required: 'Workshop name is required.' }}
          render={({ field: { value, onChange } }) => (
            <Field label="Workshop / Garage Name *" error={errors.workshop_name?.message}>
              <StyledInput value={value} onChangeText={onChange} placeholder="e.g. Sharma Auto Works" />
            </Field>
          )}
        />
        <Controller
          control={control} name="first_name" rules={nameValidator}
          render={({ field: { value, onChange } }) => (
            <Field label="Your Name *" error={errors.first_name?.message}>
              <StyledInput value={value} onChangeText={onChange} placeholder="Owner's full name" />
            </Field>
          )}
        />
        <Controller
          control={control} name="mobile" rules={phoneValidator}
          render={({ field: { value, onChange } }) => (
            <Field label="Mobile Number *" error={errors.mobile?.message}>
              <StyledInput
                value={value} onChangeText={onChange}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad" maxLength={10}
              />
            </Field>
          )}
        />
        <Controller
          control={control} name="email" rules={emailValidator}
          render={({ field: { value, onChange } }) => (
            <Field label="Email Address *" error={errors.email?.message}>
              <StyledInput
                value={value} onChangeText={onChange}
                placeholder="your@email.com" keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>
          )}
        />
        <Controller
          control={control} name="city"
          render={({ field: { value, onChange } }) => (
            <Field label="City">
              <StyledInput value={value} onChangeText={onChange} placeholder="e.g. Mumbai" />
            </Field>
          )}
        />
        <Controller
          control={control} name="state"
          render={({ field: { value, onChange } }) => (
            <Field label="State">
              <StyledInput value={value} onChangeText={onChange} placeholder="e.g. Maharashtra" />
            </Field>
          )}
        />

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setTermsAccepted(v => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, termsAccepted && { backgroundColor: ORANGE, borderColor: ORANGE }]}>
            {termsAccepted && <Feather name="check" size={12} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={{ color: ORANGE, fontWeight: '600' as const }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: ORANGE, fontWeight: '600' as const }}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { opacity: termsAccepted && !isLoading ? 1 : 0.55 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={!termsAccepted || isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create Account</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.8}>
          <Text style={styles.loginLink}>
            Already have an account?{' '}
            <Text style={{ color: ORANGE, fontWeight: '700' as const }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: { marginBottom: 24, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  top: { gap: 6, marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800' as const, color: NAVY },
  subtitle: { fontSize: 14, color: '#6B7280' },
  errorBox: {
    flexDirection: 'row' as const, alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444' },
  termsRow: { flexDirection: 'row' as const, alignItems: 'flex-start', gap: 10, marginBottom: 24 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  termsText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },
  btn: {
    backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  loginLink: { textAlign: 'center' as const, fontSize: 14, color: '#6B7280' },
});
