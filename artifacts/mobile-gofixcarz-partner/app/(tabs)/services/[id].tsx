import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Package, Clock, DollarSign, Eye, Trash2, Check } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import InputField from '@/src/components/ui/InputField';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import type { ServicePackageUpdate } from '@/src/types';

/* ── Tokens ── */
const BG      = '#F8FAFC';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
const SUCCESS = '#10B981';
const DANGER  = '#EF4444';
const SOFT_BG = '#EFF6FF';

type FormData = {
  name: string;
  description: string;
  price: string;
  duration_minutes: string;
  is_active: boolean;
};

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const [showDelete, setShowDelete] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGE(id),
    queryFn:  () => ServicePackageService.getById(id),
  });

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: '', description: '', price: '', duration_minutes: '', is_active: true },
  });
  const isActive = watch('is_active');

  useEffect(() => {
    if (data) {
      reset({
        name:             data.name,
        description:      data.description ?? '',
        price:            String(data.price),
        duration_minutes: data.duration_minutes ? String(data.duration_minutes) : '',
        is_active:        data.is_active,
      });
    }
  }, [data, reset]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGES() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGE(id) });
  };

  const updateMut = useMutation({
    mutationFn: (p: ServicePackageUpdate) => ServicePackageService.update(id, p),
    onSuccess:  () => { invalidate(); router.push('/(tabs)/services' as never); },
  });

  const deleteMut = useMutation({
    mutationFn: () => ServicePackageService.delete(id),
    onSuccess:  () => { invalidate(); router.push('/(tabs)/services' as never); },
  });

  function onSubmit(d: FormData) {
    updateMut.mutate({
      name:             d.name,
      description:      d.description || null,
      price:            parseFloat(d.price) || 0,
      duration_minutes: d.duration_minutes ? parseInt(d.duration_minutes) : null,
      is_active:        d.is_active,
    });
  }

  const isPending = updateMut.isPending || deleteMut.isPending;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/(tabs)/services' as never)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Service</Text>
          <Text style={styles.headerSub}>Update package details &amp; pricing</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteHeaderBtn}
          onPress={() => setShowDelete(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={20} color={DANGER} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Service Details Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: SOFT_BG }]}>
                <Package size={16} color={PRIMARY} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardTitle}>Service Details</Text>
            </View>

            <View style={styles.cardBody}>
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

              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange } }) => (
                  <View style={{ marginTop: 12 }}>
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
                  </View>
                )}
              />
            </View>
          </View>

          {/* ── Pricing & Duration Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
                <DollarSign size={16} color={SUCCESS} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardTitle}>Pricing &amp; Duration</Text>
            </View>

            <View style={styles.cardBody}>
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

              {/* Quick Durations */}
              <Text style={styles.suggestLabel}>Common Durations</Text>
              <View style={styles.durationRow}>
                {['30', '45', '60', '90', '120'].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={styles.durationChip}
                    onPress={() => setValue('duration_minutes', d)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.durationChipText}>{d} mins</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── Visibility / Status Card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: SOFT_BG }]}>
                <Eye size={16} color={PRIMARY} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardTitle}>Visibility Status</Text>
            </View>

            <View style={styles.cardBody}>
              <TouchableOpacity
                style={[
                  styles.statusToggle,
                  { backgroundColor: isActive ? '#ECFDF5' : '#F8FAFC', borderColor: isActive ? '#A7F3D0' : BORDER },
                ]}
                onPress={() => setValue('is_active', !isActive)}
                activeOpacity={0.8}
              >
                <View style={[styles.trackOuter, { backgroundColor: isActive ? SUCCESS : '#CBD5E1' }]}>
                  <View style={[styles.trackKnob, { alignSelf: isActive ? 'flex-end' : 'flex-start' }]} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: isActive ? SUCCESS : TEXT }]}>
                    {isActive ? 'Active Package' : 'Inactive Package'}
                  </Text>
                  <Text style={styles.toggleSub}>
                    {isActive
                      ? 'Visible and attachable to customer job cards'
                      : 'Hidden — will not appear in job card flow'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Delete Button Section ── */}
          <TouchableOpacity
            style={styles.deleteCardBtn}
            onPress={() => setShowDelete(true)}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color={DANGER} strokeWidth={2.2} />
            <Text style={styles.deleteCardBtnText}>Delete This Package</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Fixed Footer Bar ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.footerCancel}
          onPress={() => router.push('/(tabs)/services' as never)}
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
          {updateMut.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Check size={16} color="#fff" strokeWidth={2.5} />
              <Text style={styles.footerSaveText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Delete Confirmation Warning Modal */}
      <ConfirmDialog
        visible={showDelete}
        title="Delete Service Package"
        message={`Are you sure you want to delete "${data?.name ?? 'this package'}"? This action cannot be undone.`}
        destructive
        confirmLabel={deleteMut.isPending ? 'Deleting...' : 'Delete Package'}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setShowDelete(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center' },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 1, textAlign: 'center' },
  deleteHeaderBtn: { padding: 4 },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  cardBody:  { padding: 16 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: TEXT, marginBottom: 6 },
  textAreaWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  textArea: { padding: 12, fontSize: 14, color: TEXT, minHeight: 74, textAlignVertical: 'top' },

  twoCol: { flexDirection: 'row', gap: 10 },

  suggestLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 14,
  },
  durationRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: SOFT_BG,
  },
  durationChipText: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  trackOuter: { width: 42, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  trackKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  toggleLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  toggleSub:   { fontSize: 11.5, color: MUTED, lineHeight: 16 },

  deleteCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  deleteCardBtnText: { fontSize: 14, fontWeight: '700', color: DANGER },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerCancel: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCancelText: { fontSize: 14, fontWeight: '600', color: TEXT },
  footerSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 13,
  },
  footerSaveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
