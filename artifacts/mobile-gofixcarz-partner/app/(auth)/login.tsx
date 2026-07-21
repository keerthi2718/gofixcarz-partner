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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, isLoading, error, clearError } = useAuth();
  const [mobile, setMobile] = useState('');

  const isValid = mobile.replace(/\s/g, '').length >= 10;

  async function handleSendOtp() {
    await signIn(mobile.replace(/\s/g, ''));
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo card */}
        <View style={[styles.logoCard, shadow.md]}>
          <Image
            source={require('../../assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Headings */}
        <Text style={[typography.headline, styles.title]}>Welcome Back</Text>
        <Text style={[typography.body, styles.subtitle]}>Sign in to your garage account</Text>

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#EF4444" />
            <Text style={[typography.bodySm, { color: '#EF4444', flex: 1 }]}>{error}</Text>
            <TouchableOpacity onPress={clearError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Phone input */}
        <InputField
          label="Mobile Number"
          leadingIcon="smartphone"
          prefix="+91"
          value={mobile}
          onChangeText={t => { clearError(); setMobile(t); }}
          placeholder="10-digit number"
          keyboardType="phone-pad"
          maxLength={10}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSendOtp}
        />

        {/* CTA */}
        <PrimaryButton
          label="Send OTP"
          onPress={handleSendOtp}
          loading={isLoading}
          disabled={!isValid}
          style={{ marginTop: 8 }}
        />

        {/* Sign up link */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.linkRow}
          activeOpacity={0.7}
        >
          <Text style={[typography.bodySm, { color: '#6B7280' }]}>
            Don't have an account?{' '}
            <Text style={{ color: PRIMARY, fontWeight: '700' }}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, alignItems: 'center' },
  logoCard: {
    width: 140, height: 96, borderRadius: radius.lg,
    backgroundColor: '#111', overflow: 'hidden', marginBottom: spacing.xl,
  },
  logo: { width: '100%', height: '100%' },
  title: { color: '#111827', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: radius.md,
    borderWidth: 1, borderColor: '#FECACA',
    padding: spacing.md, marginBottom: spacing.base,
    width: '100%',
  },
  linkRow: { marginTop: spacing.lg, alignItems: 'center' },
});
