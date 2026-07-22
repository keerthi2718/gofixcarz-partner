import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import InputField from '@/src/components/ui/InputField';
import type { ServicePackageCreate } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';
const DANGER  = '#EF4444';

type FormData = {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

/* Quick-pick category suggestions */
const SUGGESTIONS = [
  'Oil Change', 'Brake Service', 'AC Service', 'Wheel Alignment',
  'Battery Check', 'Tyre Rotation', 'Full Car Wash', 'Engine Tune-up',
];

function SectionCard({ icon, title, iconBg = '#EEF2FF', iconFg = PRIMARY, children }: {
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
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    marginBottom: 14,
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

export default function CreateServiceScreen() {
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: '', description: '', price: '', duration_minutes: '', is_active: true },
  });
  const isActive = watch('is_active');
  const nameVal  = watch('name');

  const { mutate, isPending, error: mutError } = useMutation({
    mutationFn: (p: ServicePackageCreate) => ServicePackageService.create(p),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGES() }); router.back(); },
  });

  function onSubmit(data: FormData) {
    mutate({
      name:             data.name,
      description:      data.description || null,
      price:            parseFloat(data.price) || 0,
      duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null,
      is_active:        data.is_active,
    });
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>New Service</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* API error */}
        {mutError ? (
          <View style={styles.errBanner}>
            <Feather name="alert-circle" size={14} color={DANGER} />
            <Text style={styles.errText}>{(mutError as Error).message}</Text>
          </View>
        ) : null}

        {/* ── Service Info ── */}
        <SectionCard icon="package" title="Service Details">
          <Controller
            control={control}
            name="name"
            rules={{ required: 'Service name is required.' }}
            render={({ field: { value, onChange } }) => (
              <InputField
                label="Service Name *"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Full Car Service"
                autoCapitalize="words"
                leadingIcon="tool"
                error={errors.name?.message}
              />
            )}
          />

          {/* Quick suggestions */}
          {!nameVal && (
            <>
              <Text style={styles.suggestLabel}>Quick pick</Text>
              <View style={styles.suggestWrap}>
                {SUGGESTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestChip}
                    onPress={() => setValue('name', s)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.suggestChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange } }) => (
              <>
                <Text style={styles.fieldLabel}>Description</Text>
                <View style={styles.textAreaWrap}>
                  <TextInput
                    style={styles.textArea}
                    value={value}
                    onChangeText={onChange}
                    placeholder="What's included in this package?"
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          />
        </SectionCard>

        {/* ── Pricing ── */}
        <SectionCard icon="dollar-sign" title="Pricing & Duration" iconBg="#F0FDF4" iconFg={SUCCESS}>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="price"
                rules={{ required: 'Price is required.' }}
                render={({ field: { value, onChange } }) => (
                  <InputField
                    label="Price (₹) *"
                    value={value}
                    onChangeText={onChange}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    leadingIcon="credit-card"
                    prefix="₹"
                    error={errors.price?.message}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="duration_minutes"
                render={({ field: { value, onChange } }) => (
                  <InputField
                    label="Duration (min)"
                    value={value}
                    onChangeText={onChange}
                    placeholder="60"
                    keyboardType="number-pad"
                    leadingIcon="clock"
                  />
                )}
              />
            </View>
          </View>

          {/* Duration quick picks */}
          <Text style={[styles.suggestLabel, { marginTop: 0 }]}>Common durations</Text>
          <View style={styles.durationRow}>
            {['30', '45', '60', '90', '120'].map(d => (
              <TouchableOpacity
                key={d}
                style={styles.durationChip}
                onPress={() => setValue('duration_minutes', d)}
                activeOpacity={0.8}
              >
                <Text style={styles.durationChipText}>{d}m</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ── Status ── */}
        <SectionCard icon="toggle-right" title="Visibility" iconBg="#F5F3FF" iconFg="#2563EB">
          <TouchableOpacity
            style={[styles.statusToggle, { backgroundColor: isActive ? '#ECFDF5' : '#F1F5F9', borderColor: isActive ? SUCCESS : BORDER }]}
            onPress={() => setValue('is_active', !isActive)}
            activeOpacity={0.8}
          >
            {/* Track */}
            <View style={[styles.trackOuter, { backgroundColor: isActive ? SUCCESS : '#CBD5E1' }]}>
              <View style={[styles.trackKnob, { alignSelf: isActive ? 'flex-end' : 'flex-start' }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: isActive ? SUCCESS : MUTED }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
              <Text style={styles.toggleSub}>
                {isActive
                  ? 'Visible and attachable to job cards'
                  : 'Hidden — will not appear in job card flow'}
              </Text>
            </View>
          </TouchableOpacity>
        </SectionCard>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.footerCancel} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.footerCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerCreate, isPending && { opacity: 0.6 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : <><Feather name="plus" size={16} color="#fff" /><Text style={styles.footerCreateText}>Create Package</Text></>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pageTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '700', color: TEXT,
  },

  body: { paddingHorizontal: 20 },

  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 14, borderWidth: 1, borderColor: '#FECACA',
    padding: 14, marginBottom: 14,
  },
  errText: { flex: 1, fontSize: 13, color: DANGER },

  /* Suggestions */
  suggestLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 4,
  },
  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  suggestChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(37,99,235,0.3)',
    backgroundColor: '#EEF2FF',
  },
  suggestChipText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  /* Description */
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  textAreaWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    marginBottom: 0,
  },
  textArea: { padding: 14, fontSize: 15, color: TEXT, minHeight: 80, textAlignVertical: 'top' },

  /* Layout */
  twoCol: { flexDirection: 'row', gap: 10 },

  /* Duration chips */
  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: '#F0FDF4',
  },
  durationChipText: { fontSize: 12, fontWeight: '700', color: SUCCESS },

  /* Status toggle */
  statusToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: 1.5,
    padding: 16,
  },
  trackOuter: {
    width: 44, height: 24, borderRadius: 12,
    padding: 2, justifyContent: 'center',
  },
  trackKnob: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  toggleLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  toggleSub:   { fontSize: 12, color: MUTED, lineHeight: 17 },

  /* Footer */
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: CARD,
    borderTopWidth: 1, borderTopColor: BORDER,
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
  footerCreate: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerCreateText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
