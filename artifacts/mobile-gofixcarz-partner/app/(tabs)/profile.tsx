import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import { useAuth } from '@/src/context/AuthContext';
import Avatar from '@/src/components/ui/Avatar';
import InputField from '@/src/components/ui/InputField';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import Card from '@/src/components/ui/Card';
import SectionHeader from '@/src/components/ui/SectionHeader';
import LoadingState from '@/src/components/ui/LoadingState';
import { radius, shadow, spacing, typography } from '@/constants/theme';
import type { ProfileUpdate } from '@/src/types';

type FormData = { name: string; email: string; mobile: string };

const MENU_ITEMS = [
  { icon: 'bell' as const,     label: 'Notifications',  route: '/(tabs)/more/notifications' },
  { icon: 'map-pin' as const,  label: 'My Garage',       route: '/(tabs)/more/garage' },
  { icon: 'help-circle' as const, label: 'Help & Support', route: null },
  { icon: 'shield' as const,   label: 'Privacy Policy',  route: null },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const { logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: ProfileService.get,
  });

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { name: '', email: '', mobile: '' },
  });

  useEffect(() => {
    if (data) reset({ name: data.name ?? '', email: data.email ?? '', mobile: data.mobile ?? '' });
  }, [data, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: ProfileUpdate) => ProfileService.update(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }); setEditMode(false); },
  });

  function onSubmit(d: FormData) {
    mutate({ name: d.name || null, email: d.email || null, mobile: d.mobile || null });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Hero header */}
      <View style={[styles.hero, { paddingTop: topPad + 16, backgroundColor: colors.primary }]}>
        <Avatar name={data?.name ?? data?.mobile} size={72} color={colors.primary} style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' }} />
        <View style={{ alignItems: 'center', gap: 3, marginTop: 12 }}>
          <Text style={[typography.title, { color: '#fff' }]}>{data?.name ?? 'Garage Owner'}</Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)' }]}>{data?.mobile}</Text>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setEditMode(v => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name={editMode ? 'x' : 'edit-2'} size={15} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? <LoadingState /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {editMode ? (
            <Card>
              <SectionHeader title="Edit Profile" style={{ marginBottom: spacing.base }} />
              <Controller control={control} name="name" render={({ field: { value, onChange } }) => (
                <InputField label="Full Name" value={value} onChangeText={onChange} placeholder="Your name" leadingIcon="user" />
              )} />
              <Controller control={control} name="email" render={({ field: { value, onChange } }) => (
                <InputField label="Email" value={value} onChangeText={onChange} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" leadingIcon="mail" />
              )} />
              <Controller control={control} name="mobile" render={({ field: { value, onChange } }) => (
                <InputField label="Mobile" value={value} onChangeText={onChange} placeholder="10-digit" keyboardType="phone-pad" leadingIcon="phone" />
              )} />
              <View style={styles.formActions}>
                <PrimaryButton label="Cancel" onPress={() => { setEditMode(false); if (data) reset(); }} variant="outline" />
                <PrimaryButton label="Save" onPress={handleSubmit(onSubmit)} loading={isPending} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : (
            <>
              {/* Info card */}
              <Card>
                {[
                  { icon: 'user' as const,     label: 'Name',    value: data?.name },
                  { icon: 'mail' as const,     label: 'Email',   value: data?.email },
                  { icon: 'phone' as const,    label: 'Mobile',  value: data?.mobile },
                  { icon: 'clock' as const,    label: 'Member since', value: data?.created_at ? new Date(data.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null },
                ].map(row => (
                  <View key={row.label} style={[styles.infoRow, { borderBottomColor: colors.divider }]}>
                    <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
                      <Feather name={row.icon} size={14} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{row.label}</Text>
                      <Text style={[typography.bodySm, { color: colors.text, fontWeight: '500' }]}>{row.value || '—'}</Text>
                    </View>
                  </View>
                ))}
              </Card>

              {/* Menu */}
              <Card padding={0} style={{ overflow: 'hidden' }}>
                {MENU_ITEMS.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.menuRow,
                      { borderBottomColor: colors.divider },
                      i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1 },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.menuIcon, { backgroundColor: colors.background }]}>
                      <Feather name={item.icon} size={16} color={colors.textSecondary} />
                    </View>
                    <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{item.label}</Text>
                    <Feather name="chevron-right" size={16} color={colors.textDisabled} />
                  </TouchableOpacity>
                ))}
              </Card>

              {/* Sign out */}
              <TouchableOpacity
                style={[styles.logoutBtn, { borderColor: colors.danger + '50', backgroundColor: colors.dangerLight }]}
                onPress={logout}
                activeOpacity={0.8}
              >
                <Feather name="log-out" size={16} color={colors.danger} />
                <Text style={[typography.body, { color: colors.danger, fontWeight: '600' }]}>Sign Out</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center', paddingBottom: spacing.xl,
    paddingHorizontal: spacing.base, position: 'relative',
  },
  editBtn: {
    position: 'absolute', top: 16, right: spacing.base,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing.base, gap: spacing.sm },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12, borderBottomWidth: 1 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, borderRadius: radius.lg, paddingVertical: 16,
    borderWidth: 1,
  },
});
