import React, { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

const RED = '#C62828';

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
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
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

        {/* Title */}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your garage account</Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearError}>
              <Text style={[styles.errorText, { fontWeight: '700' }]}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Mobile Input */}
        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <View style={styles.dividerLine} />
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={t => { clearError(); setMobile(t); }}
            placeholder="Enter 10-digit number"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
            autoFocus
          />
        </View>

        {/* Send OTP */}
        <TouchableOpacity
          style={[styles.btn, { opacity: isValid && !isLoading ? 1 : 0.6 }]}
          onPress={handleSendOtp}
          disabled={!isValid || isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Send OTP</Text>
          }
        </TouchableOpacity>

        {/* Sign Up link */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.8}
          style={styles.linkRow}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={[styles.linkText, { color: RED, fontWeight: '700' }]}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 28, alignItems: 'center' },
  logoContainer: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#111',
  },
  logo: { width: '100%', height: '100%' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 28, textAlign: 'center' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16,
    width: '100%',
  },
  errorText: { fontSize: 13, color: '#EF4444', flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, alignSelf: 'flex-start', width: '100%' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#fff', marginBottom: 20, width: '100%', height: 50,
  },
  prefix: { paddingHorizontal: 14, justifyContent: 'center' },
  prefixText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  dividerLine: { width: 1, height: 24, backgroundColor: '#E5E7EB' },
  input: { flex: 1, paddingHorizontal: 14, fontSize: 15, color: '#111827' },
  btn: {
    width: '100%', backgroundColor: RED, borderRadius: 10,
    paddingVertical: 15, alignItems: 'center', marginBottom: 20,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  linkRow: { marginTop: 4 },
  linkText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
});
