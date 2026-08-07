import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import InputField from '@/src/components/ui/InputField';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import { radius, shadow, spacing, typography } from '@/constants/theme';

const PRIMARY = '#C62839';
const BG = '#F7F8FA';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [mobile, setMobile] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isValid = mobile.replace(/\s/g, '').length >= 10;

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
        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={[styles.logoCard, shadow.md]}>
          <Image
            source={require('../../assets/images/logo_clean.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {!submitted ? (
          <>
            <Text style={[typography.headline, styles.title]}>Forgot Password?</Text>
            <Text style={[typography.body, styles.subtitle]}>
              Enter your registered mobile number and we'll send you a reset OTP.
            </Text>

            <InputField
              label="Mobile Number"
              leadingIcon="smartphone"
              prefix="+91"
              value={mobile}
              onChangeText={setMobile}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />

            <PrimaryButton
              label="Send Reset OTP"
              onPress={() => setSubmitted(true)}
              disabled={!isValid}
              style={{ marginTop: 8 }}
            />
          </>
        ) : (
          <View style={styles.successWrap}>
            <View style={[styles.successIcon, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="check-circle" size={36} color="#16A34A" />
            </View>
            <Text style={[typography.headline, { color: '#111827', textAlign: 'center' }]}>OTP Sent!</Text>
            <Text style={[typography.body, { color: '#6B7280', textAlign: 'center', marginTop: 6 }]}>
              A reset OTP has been sent to +91 {mobile}
            </Text>
            <PrimaryButton
              label="Back to Login"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: 24 }}
            />
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.linkRow}
          activeOpacity={0.7}
        >
          <Text style={[typography.bodySm, { color: '#6B7280' }]}>
            Remember your password?{' '}
            <Text style={{ color: PRIMARY, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, alignItems: 'center' },
  backBtn: {
    alignSelf: 'flex-start', width: 40, height: 40,
    borderRadius: 12, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  logoCard: {
    width: 140, height: 96, borderRadius: radius.lg,
    backgroundColor: '#111', overflow: 'hidden', marginBottom: spacing.xl,
  },
  logo: { width: '100%', height: '100%' },
  title: { color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#6B7280', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  successWrap: { alignItems: 'center', gap: 8, width: '100%' },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  linkRow: { marginTop: spacing.xl, alignItems: 'center' },
});
