import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import { useAuth } from '@/src/context/AuthContext';
import Avatar from '@/src/components/ui/Avatar';
import InputField from '@/src/components/ui/InputField';
import PrimaryButton from '@/src/components/ui/PrimaryButton';
import LoadingState from '@/src/components/ui/LoadingState';
import type { ProfileUpdate } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const INDIGO  = '#6366F1';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const DANGER  = '#EF4444';

type FormData = { name: string; email: string; mobile: string };

const MENU_ITEMS: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  sub: string;
  iconBg: string;
  iconFg: string;
  route?: string;
}[] = [
  { icon: 'bell',        label: 'Notifications', sub: 'Alerts & updates',   iconBg: '#EEF2FF', iconFg: PRIMARY,  route: '/(tabs)/more/notifications' },
  { icon: 'map-pin',     label: 'My Garage',      sub: 'Workshop details',   iconBg: '#FFF7ED', iconFg: '#F97316', route: '/(tabs)/more/garage' },
  { icon: 'bar-chart-2', label: 'Analytics',      sub: 'Revenue reports',    iconBg: '#F0FDF4', iconFg: '#10B981', route: '/(tabs)/more/analytics' },
  { icon: 'help-circle', label: 'Help & Support', sub: 'FAQs & contact',     iconBg: '#FDF4FF', iconFg: INDIGO },
  { icon: 'shield',      label: 'Privacy Policy', sub: 'Terms & conditions', iconBg: '#F1F5F9', iconFg: MUTED },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const { logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading } = useQuery({
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

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1D4ED8" />

      {/* ── Profile hero ── */}
      <LinearGradient
        colors={['#1D4ED8', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 20 }]}
      >
        {/* Decorative circle */}
        <View style={styles.heroCircle} />

        {/* Edit toggle */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setEditMode(v => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name={editMode ? 'x' : 'edit-2'} size={15} color="#fff" />
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarRing}>
          <Avatar name={data?.name ?? data?.mobile} size={72} />
        </View>

        <Text style={styles.heroName}>{data?.name ?? 'Garage Owner'}</Text>
        <Text style={styles.heroMobile}>{data?.mobile ?? ''}</Text>

        {/* Quick stat chips inside hero */}
        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Feather name="briefcase" size={11} color="#fff" />
            <Text style={styles.heroChipText}>Partner</Text>
          </View>
          <View style={styles.heroChip}>
            <Feather name="shield" size={11} color="#fff" />
            <Text style={styles.heroChipText}>Verified</Text>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? <LoadingState /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Edit form ── */}
          {editMode ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Feather name="edit-2" size={15} color={PRIMARY} />
                </View>
                <Text style={styles.sectionTitle}>Edit Profile</Text>
              </View>
              <View style={styles.sectionBody}>
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
                  <PrimaryButton label="Save Changes" onPress={handleSubmit(onSubmit)} loading={isPending} style={{ flex: 1 }} />
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* ── Info card ── */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Feather name="user" size={15} color={PRIMARY} />
                  </View>
                  <Text style={styles.sectionTitle}>Account Info</Text>
                </View>
                <View style={styles.sectionBody}>
                  {[
                    { icon: 'user'  as const, label: 'Name',    value: data?.name },
                    { icon: 'mail'  as const, label: 'Email',   value: data?.email },
                    { icon: 'phone' as const, label: 'Mobile',  value: data?.mobile },
                    { icon: 'clock' as const, label: 'Member since', value: data?.created_at ? new Date(data.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : null },
                  ].map((row, i, arr) => (
                    <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}>
                      <View style={[styles.infoIconWrap, { backgroundColor: '#EEF2FF' }]}>
                        <Feather name={row.icon} size={14} color={PRIMARY} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>{row.label}</Text>
                        <Text style={styles.infoValue}>{row.value || '—'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* ── Menu items ── */}
              <View style={styles.sectionCard}>
                {MENU_ITEMS.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.menuRow,
                      i < MENU_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
                    ]}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.menuIconWrap, { backgroundColor: item.iconBg }]}>
                      <Feather name={item.icon} size={16} color={item.iconFg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      <Text style={styles.menuSub}>{item.sub}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Sign out ── */}
              <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
                <View style={styles.logoutIconWrap}>
                  <Feather name="log-out" size={16} color={DANGER} />
                </View>
                <Text style={styles.logoutText}>Sign Out</Text>
                <Feather name="chevron-right" size={16} color={DANGER + '80'} />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Hero */
  hero: {
    alignItems: 'center', paddingBottom: 32,
    paddingHorizontal: 20, overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute', top: -50, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  editBtn: {
    position: 'absolute', top: 54, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarRing: {
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 42, marginBottom: 14,
  },
  heroName:   { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  heroMobile: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  heroChips: { flexDirection: 'row', gap: 8 },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  heroChipText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  body: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },

  /* Section card */
  sectionCard: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  sectionBody:  { padding: 18 },

  /* Info rows */
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 12,
  },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: 11, color: MUTED, marginBottom: 2 },
  infoValue: { fontSize: 14, color: TEXT, fontWeight: '500' },

  /* Form actions */
  formActions: { flexDirection: 'row', gap: 10, marginTop: 8 },

  /* Menu rows */
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 18, paddingVertical: 14,
  },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  menuSub:   { fontSize: 11, color: MUTED },

  /* Logout */
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18, borderWidth: 1, borderColor: '#FECACA',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16, gap: 14,
  },
  logoutIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { flex: 1, fontSize: 14, fontWeight: '700', color: DANGER },
});
