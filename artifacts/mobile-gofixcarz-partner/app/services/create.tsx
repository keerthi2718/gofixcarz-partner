import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  Check,
  Clock,
  Hash,
  Plus,
  Tag,
  Trash2,
  Wrench,
  AlertCircle,
  FileText,
} from 'lucide-react-native';

import ServicePackageService from '@/src/services/service-package.service';
import { formatCurrency } from '@/src/utils/helpers';

/* ── Tokens ── */
const PRIMARY = '#2563EB';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
const CARD    = '#FFFFFF';
const SUCCESS = '#059669';
const DANGER  = '#EF4444';

export default function CreateServiceScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Query existing service packages ── */
  const { data: pkgsData, isLoading: pkgsLoading } = useQuery({
    queryKey: ['service-packages'],
    queryFn: () => ServicePackageService.list({ page_size: 50 }),
  });
  const existingPackages = pkgsData?.items ?? [];

  /* ── Delete mutation ── */
  const deleteMut = useMutation({
    mutationFn: (id: string) => ServicePackageService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-packages'] });
    },
  });

  /* ── Create mutation ── */
  const createMut = useMutation({
    mutationFn: async () => {
      return ServicePackageService.create({
        name: name.trim(),
        price: parseFloat(price),
        duration_minutes: duration ? parseInt(duration, 10) : undefined,
        description: description.trim() || undefined,
        is_active: true,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-packages'] });
      Alert.alert('Success', 'New service package created successfully!');
      setName('');
      setPrice('');
      setDuration('');
      setDescription('');
      setErrors({});
    },
    onError: (err: any) => {
      Alert.alert(
        'Error',
        err?.response?.data?.message || err?.message || 'Could not create service. Please try again.'
      );
    },
  });

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Service name is required.';
    if (!price.trim()) {
      errs.price = 'Service price is required.';
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      errs.price = 'Price must be a valid positive amount.';
    }
    if (duration && (isNaN(parseInt(duration, 10)) || parseInt(duration, 10) <= 0)) {
      errs.duration = 'Duration must be a positive number of minutes.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit() {
    if (validate()) {
      createMut.mutate();
    }
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push('/(tabs)' as never)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Add New Service</Text>
          <Text style={s.headerSub}>Manage garage service packages</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[s.scrollBody, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Form Section Header ── */}
          <View style={s.sectionHeader}>
            <View style={[s.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Wrench size={14} color={PRIMARY} strokeWidth={2.2} />
            </View>
            <Text style={s.sectionTitle}>Service Details</Text>
          </View>

          {/* Service Name */}
          <View style={s.inputWrap}>
            <Text style={s.inputLabel}>
              SERVICE NAME <Text style={{ color: DANGER }}>*</Text>
            </Text>
            <View style={[s.inputRow, !!errors.name && s.inputRowError]}>
              <TextInput
                style={[s.field, { paddingLeft: 14 }]}
                value={name}
                onChangeText={v => {
                  setName(v);
                  if (errors.name) setErrors(e => ({ ...e, name: '' }));
                }}
                placeholder="e.g. Full Engine Service, Oil Change"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {!!errors.name && (
              <View style={s.errRow}>
                <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                <Text style={s.errText}>{errors.name}</Text>
              </View>
            )}
          </View>

          {/* Two Column Row: Price & Duration */}
          <View style={s.twoCol}>
            {/* Price */}
            <View style={[s.inputWrap, { flex: 1 }]}>
              <Text style={s.inputLabel}>
                PRICE (₹) <Text style={{ color: DANGER }}>*</Text>
              </Text>
              <View style={[s.inputRow, !!errors.price && s.inputRowError]}>
                <View style={s.iconSlot}>
                  <Hash size={16} color={PRIMARY} strokeWidth={2} />
                </View>
                <TextInput
                  style={s.field}
                  value={price}
                  onChangeText={v => {
                    setPrice(v);
                    if (errors.price) setErrors(e => ({ ...e, price: '' }));
                  }}
                  placeholder="e.g. 1499"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
              </View>
              {!!errors.price && (
                <View style={s.errRow}>
                  <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                  <Text style={s.errText}>{errors.price}</Text>
                </View>
              )}
            </View>

            {/* Duration */}
            <View style={[s.inputWrap, { flex: 1 }]}>
              <Text style={s.inputLabel}>DURATION (MINS)</Text>
              <View style={[s.inputRow, !!errors.duration && s.inputRowError]}>
                <View style={s.iconSlot}>
                  <Clock size={16} color="#7C3AED" strokeWidth={2} />
                </View>
                <TextInput
                  style={s.field}
                  value={duration}
                  onChangeText={v => {
                    setDuration(v);
                    if (errors.duration) setErrors(e => ({ ...e, duration: '' }));
                  }}
                  placeholder="e.g. 60"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                />
              </View>
              {!!errors.duration && (
                <View style={s.errRow}>
                  <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                  <Text style={s.errText}>{errors.duration}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={s.inputWrap}>
            <Text style={s.inputLabel}>DESCRIPTION / DETAILS</Text>
            <View style={[s.inputRow, s.inputRowMulti]}>
              <View style={[s.iconSlot, { paddingTop: 12 }]}>
                <FileText size={16} color="#64748B" strokeWidth={2} />
              </View>
              <TextInput
                style={[s.field, s.fieldMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="Details of what is included in this service package…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[s.submitBtn, createMut.isPending && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={createMut.isPending}
            activeOpacity={0.85}
          >
            {createMut.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={s.submitBtnText}>Save & Add Service</Text>
              </>
            )}
          </TouchableOpacity>

          {/* ── Existing Services List Section ── */}
          <View style={[s.sectionHeader, { marginTop: 24 }]}>
            <View style={[s.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Check size={14} color={SUCCESS} strokeWidth={2.2} />
            </View>
            <Text style={s.sectionTitle}>
              Existing Services ({existingPackages.length})
            </Text>
          </View>

          {pkgsLoading ? (
            <ActivityIndicator size="small" color={PRIMARY} style={{ marginVertical: 20 }} />
          ) : existingPackages.length > 0 ? (
            <View style={s.pkgList}>
              {existingPackages.map(pkg => (
                <View key={pkg.id} style={s.pkgCard}>
                  <View style={s.pkgLeft}>
                    <View style={s.pkgIconWrap}>
                      <Wrench size={14} color={PRIMARY} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pkgName}>{pkg.name}</Text>
                      {pkg.description ? (
                        <Text style={s.pkgDesc} numberOfLines={1}>{pkg.description}</Text>
                      ) : null}
                      {pkg.duration_minutes ? (
                        <Text style={s.pkgMeta}>{pkg.duration_minutes} mins</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={s.pkgRight}>
                    <Text style={s.pkgPrice}>{formatCurrency(pkg.price)}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Delete Service', `Delete "${pkg.name}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteMut.mutate(pkg.id) },
                        ]);
                      }}
                      style={s.pkgDeleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={13} color={DANGER} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.emptyBox}>
              <Wrench size={24} color="#CBD5E1" strokeWidth={1.5} />
              <Text style={s.emptyText}>No custom service packages added yet.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backBtn: {
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll Body */
  scrollBody: { paddingHorizontal: 16, paddingTop: 14 },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },

  /* Form Layout */
  inputWrap: { marginBottom: 10 },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    height: 46,
    overflow: 'hidden',
  },
  inputRowError: { borderColor: DANGER, borderWidth: 1.5 },
  inputRowMulti: { alignItems: 'flex-start', height: 84 },
  iconSlot: { width: 42, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  field: { flex: 1, fontSize: 14, color: TEXT, paddingRight: 14, height: 46 },
  fieldMulti: { height: undefined, paddingTop: 10, paddingBottom: 10, paddingLeft: 4 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errText: { fontSize: 11, color: DANGER, flex: 1 },

  twoCol: { flexDirection: 'row', gap: 10 },

  /* Submit Button */
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  submitBtnText: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.1 },

  /* Existing Packages List */
  pkgList: { gap: 10 },
  pkgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER,
  },
  pkgLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 },
  pkgIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkgName: { fontSize: 13.5, fontWeight: '600', color: TEXT },
  pkgDesc: { fontSize: 11.5, color: MUTED, marginTop: 2 },
  pkgMeta: { fontSize: 10.5, fontWeight: '600', color: '#7C3AED', marginTop: 2 },
  pkgRight: { alignItems: 'flex-end', gap: 6 },
  pkgPrice: { fontSize: 14, fontWeight: '800', color: PRIMARY },
  pkgDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
  },
  emptyText: { fontSize: 12.5, color: MUTED },
});
