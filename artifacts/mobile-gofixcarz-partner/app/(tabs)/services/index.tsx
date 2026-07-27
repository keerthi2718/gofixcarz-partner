import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  RefreshControl, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const DANGER  = '#EF4444';

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const qc = useQueryClient();

  /* Add service form state */
  const [name,        setName]        = useState('');
  const [price,       setPrice]       = useState('');
  const [duration,    setDuration]    = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGES({}),
    queryFn:  () => ServicePackageService.list({ page_size: 50 }),
  });

  const addMut = useMutation({
    mutationFn: () => ServicePackageService.create({
      name:             name.trim(),
      price:            parseFloat(price) || 0,
      duration_minutes: parseInt(duration) || null,
      description:      description.trim() || null,
      is_active:        true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGES({}) });
      setName(''); setPrice(''); setDuration(''); setDescription('');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ServicePackageService.delete(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGES({}) }),
  });

  const items = data?.items ?? [];
  const canAdd = name.trim().length > 0 && parseFloat(price) > 0;

  function durationLabel(mins: number | null | undefined) {
    if (!mins) return '';
    if (mins < 60) return `${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#921527" />

      {/* ── Gradient header ── */}
      <LinearGradient
        colors={['#921527', '#C41E3A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradHeader, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Service Packages</Text>
            <Text style={styles.headerSub}>Manage your service offerings</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
      >
        {/* ── Add New Service form card ── */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add New Service</Text>

          {/* Service Name */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Service Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Full Service, Oil Change…"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
            />
          </View>

          {/* Price | Duration row */}
          <View style={styles.row}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Price (₹)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Duration (mins)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="30"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of the service…"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Add button */}
          <TouchableOpacity
            style={[styles.addBtn, !canAdd && { opacity: 0.5 }]}
            onPress={() => canAdd && addMut.mutate()}
            disabled={!canAdd || addMut.isPending}
            activeOpacity={0.85}
          >
            {addMut.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.addBtnText}>Add Service</Text>
                </>
              )
            }
          </TouchableOpacity>
        </View>

        {/* ── Current Services ── */}
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.loadingText}>Loading services…</Text>
          </View>
        ) : items.length > 0 ? (
          <View style={styles.servicesCard}>
            <Text style={styles.sectionTitle}>Current Services</Text>
            {items.map((item, i) => (
              <View
                key={item.id}
                style={[styles.serviceRow, i < items.length - 1 && styles.serviceRowBorder]}
              >
                <View style={styles.serviceDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <Text style={styles.serviceMeta}>
                    ₹{item.price.toLocaleString('en-IN')}
                    {item.duration_minutes ? ` • ${durationLabel(item.duration_minutes)}` : ''}
                    {!item.is_active ? ' • Inactive' : ''}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <TouchableOpacity
                    style={styles.serviceEditBtn}
                    onPress={() => router.push(`/(tabs)/services/${item.id}` as any)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="edit-2" size={13} color={PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.serviceDeleteBtn}
                    onPress={() => deleteMut.mutate(item.id)}
                    disabled={deleteMut.isPending}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {deleteMut.isPending && deleteMut.variables === item.id
                      ? <ActivityIndicator size="small" color={DANGER} />
                      : <Feather name="x" size={15} color={DANGER} />
                    }
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Feather name="package" size={32} color="#CBD5E1" />
            <Text style={styles.emptyText}>No services added yet</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  gradHeader: {
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  content: { padding: 20, gap: 16 },

  /* Form card */
  formCard: {
    backgroundColor: CARD,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 18, gap: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 16 },

  row: { flexDirection: 'row', gap: 10 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 48,
    fontSize: 15, color: TEXT,
  },
  textArea: { height: 80, paddingTop: 12 },

  addBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14, height: 50,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    marginTop: 4,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Services list card */
  servicesCard: {
    backgroundColor: CARD,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 14 },

  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13,
  },
  serviceRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  serviceDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: PRIMARY, flexShrink: 0,
  },
  serviceName: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  serviceMeta: { fontSize: 12, color: MUTED },
  serviceActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serviceEditBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  serviceDeleteBtn: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Loading */
  loadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 30,
  },
  loadingText: { fontSize: 14, color: MUTED },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: MUTED },
});
