import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import InputField from '@/src/components/ui/InputField';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { ProfileUpdate } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const INDIGO  = '#921527';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

type FormData = { name: string; email: string; mobile: string };

function SectionCard({ icon, title, iconBg = '#FEE2E2', iconFg = PRIMARY, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  iconBg?: string;
  iconFg?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={cardSt.card}>
      <View style={cardSt.header}>
        <View style={[cardSt.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={cardSt.title}>{title}</Text>
      </View>
      <View style={cardSt.body}>{children}</View>
    </View>
  );
}
const cardSt = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 14, fontWeight: '700', color: TEXT },
  body:     { padding: 18 },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn:  ProfileService.get,
  });

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { name: '', email: '', mobile: '' },
  });

  useEffect(() => {
    if (data) reset({ name: data.name ?? '', email: data.email ?? '', mobile: data.mobile ?? '' });
  }, [data, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: ProfileUpdate) => ProfileService.update(p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }); setEditMode(false); },
  });

  function onSubmit(d: FormData) {
    mutate({ name: d.name || null, email: d.email || null, mobile: d.mobile || null });
  }

  const initials = (data?.name ?? data?.mobile ?? 'U').charAt(0).toUpperCase();
  const memberSince = data?.created_at
    ? new Date(data.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />

      {/* ── Gradient hero header ── */}
      <LinearGradient
        colors={[INDIGO, PRIMARY, '#E11D48']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 16 }]}
      >
        {/* Back + Edit buttons */}
        <View style={styles.heroNav}>
          <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.heroBtn, editMode && styles.heroBtnCancel]}
            onPress={() => { setEditMode(v => !v); if (editMode && data) reset(); }}
          >
            <Feather name={editMode ? 'x' : 'edit-2'} size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        {!isLoading && !error && (
          <>
            <Text style={styles.heroName}>{data?.name ?? 'Garage Owner'}</Text>
            <Text style={styles.heroMobile}>{data?.mobile ?? '—'}</Text>

            {memberSince && (
              <View style={styles.memberChip}>
                <Feather name="calendar" size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.memberChipText}>Member since {memberSince}</Text>
              </View>
            )}
          </>
        )}
      </LinearGradient>

      {isLoading ? <LoadingState /> : error ? <ErrorState /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 130 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Personal Info ── */}
          <SectionCard icon="user" title="Personal Information">
            <Controller
              control={control} name="name"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Full Name"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="Your full name"
                  leadingIcon="user"
                />
              )}
            />
            <Controller
              control={control} name="email"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Email Address"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leadingIcon="mail"
                />
              )}
            />
            <Controller
              control={control} name="mobile"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Mobile Number"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  leadingIcon="phone"
                />
              )}
            />
          </SectionCard>

          {/* ── Account info ── */}
          {!editMode && (
            <View style={styles.infoChip}>
              <Feather name="info" size={13} color={PRIMARY} />
              <Text style={styles.infoChipText}>
                Tap the edit icon in the header to update your profile details.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Footer (edit mode only) ── */}
      {editMode && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={styles.footerCancel}
            onPress={() => { setEditMode(false); if (data) reset(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.footerCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerSave, isPending && { opacity: 0.6 }]}
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <><Feather name="check" size={16} color="#fff" /><Text style={styles.footerSaveText}>Save Changes</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Hero */
  hero: {
    paddingHorizontal: 20, paddingBottom: 30,
    alignItems: 'center',
  },
  heroNav: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', marginBottom: 20,
  },
  heroBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBtnCancel: { backgroundColor: 'rgba(239,68,68,0.3)' },

  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:   { fontSize: 30, fontWeight: '800', color: '#fff' },
  heroName:     { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
  heroMobile:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 10 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  memberChipText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  body: { paddingHorizontal: 20, paddingTop: 20 },

  infoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
    padding: 14, marginBottom: 14,
  },
  infoChipText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },

  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  footerCancel: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: BG, alignItems: 'center',
  },
  footerCancelText: { fontSize: 14, fontWeight: '600', color: TEXT },
  footerSave: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
