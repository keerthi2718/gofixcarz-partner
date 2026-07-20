import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';

const NAVY = '#1B3A6B';
const ORANGE = '#FF6B2B';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();
  const [mobile, setMobile] = useState('');

  const isValid = mobile.replace(/\s/g, '').length >= 10;

  async function handleSendOtp() {
    const cleaned = mobile.replace(/\s/g, '');
    await signIn(cleaned);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={NAVY} />
        </TouchableOpacity>

        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: ORANGE + '15' }]}>
            <Feather name="smartphone" size={26} color={ORANGE} />
          </View>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Enter your registered mobile number to receive an OTP</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Feather name="x" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Mobile Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={t => { clearError(); setMobile(t); }}
              placeholder="Enter mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, { opacity: isValid && !isLoading ? 1 : 0.55 }]}
          onPress={handleSendOtp}
          disabled={!isValid || isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Send OTP</Text>
          }
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
          <Text style={styles.registerLink}>
            New to GoFixCarz?{' '}
            <Text style={{ color: ORANGE, fontWeight: '700' as const }}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  back: { marginBottom: 32, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  top: { gap: 10, marginBottom: 32 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800' as const, color: NAVY },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  errorBox: {
    flexDirection: 'row' as const, alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444' },
  inputGroup: { gap: 8, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600' as const, color: NAVY },
  inputRow: { flexDirection: 'row' as const, gap: 10 },
  countryCode: {
    backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14,
    justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB',
  },
  countryText: { fontSize: 15, fontWeight: '600' as const, color: NAVY },
  input: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 16, color: '#111827',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  btn: {
    backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 24,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  divider: { flexDirection: 'row' as const, alignItems: 'center', gap: 12, marginBottom: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  orText: { fontSize: 13, color: '#9CA3AF' },
  registerLink: { textAlign: 'center' as const, fontSize: 14, color: '#6B7280' },
});
