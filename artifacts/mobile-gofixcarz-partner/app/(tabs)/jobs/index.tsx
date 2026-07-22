import React, { useState } from 'react';
import {
  FlatList, Platform, Pressable, RefreshControl,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import { formatCurrency } from '@/src/utils/helpers';
import Avatar from '@/src/components/ui/Avatar';
import type { JobStatus } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

const FILTERS: { label: string; value: JobStatus | '' }[] = [
  { label: 'All',         value: '' },
  { label: 'Open',        value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'QC',          value: 'QUALITY_CHECK' },
  { label: 'Ready',       value: 'READY' },
  { label: 'Done',        value: 'COMPLETED' },
];

const JOB_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:              { label: 'Open',        color: '#3B82F6', bg: '#EFF6FF' },
  IN_PROGRESS:       { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF' },
  WAITING_FOR_PARTS: { label: 'Waiting',     color: '#F59E0B', bg: '#FFFBEB' },
  QUALITY_CHECK:     { label: 'QC Check',    color: '#6366F1', bg: '#EEF2FF' },
  READY:             { label: 'Ready',       color: '#10B981', bg: '#ECFDF5' },
  COMPLETED:         { label: 'Completed',   color: '#059669', bg: '#D1FAE5' },
  CANCELLED:         { label: 'Cancelled',   color: '#EF4444', bg: '#FEF2F2' },
};

export default function JobsScreen() {
  const insets  = useSafeAreaInsets();
  const [filter, setFilter] = useState<JobStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOBS({ status: filter || undefined }),
    queryFn:  () => JobService.list({ status: filter || undefined, page_size: 30 }),
  });

  const jobs = (data?.items ?? []).filter(j =>
    !search ||
    (j.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (j.registration_number ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Page header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.pageTitle}>Job Cards</Text>
          <Text style={styles.pageSubtitle}>{data?.total ?? 0} total</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchOpen(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name={searchOpen ? 'x' : 'search'} size={18} color={TEXT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search ── */}
      {searchOpen && (
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Feather name="search" size={15} color={MUTED} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or plate…"
              placeholderTextColor="#94A3B8"
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x-circle" size={15} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipBar}
      >
        {FILTERS.map(f => (
          <Pressable
            key={f.value}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 130 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const st = JOB_STATUS[item.status] ?? { label: item.status, color: MUTED, bg: '#F3F4F6' };
          const amount = item.final_amount ?? item.estimated_amount ?? 0;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/jobs/${item.id}` as any)}
              activeOpacity={0.86}
            >
              {/* Top row: job number + status */}
              <View style={styles.cardTop}>
                <Text style={styles.jobNumber}>JC-{String(index + 1).padStart(3, '0')}</Text>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <View style={[styles.dot, { backgroundColor: st.color }]} />
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {/* Main row */}
              <View style={styles.cardMain}>
                <Avatar name={item.customer_name} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.customer_name ?? '—'}
                  </Text>
                  {(item.brand || item.registration_number) ? (
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {[item.brand, item.vehicle_model].filter(Boolean).join(' ')}
                      {item.registration_number ? ` · ${item.registration_number}` : ''}
                    </Text>
                  ) : null}
                  {item.services && item.services.length > 0 ? (
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {item.services.map(s => s.name).join(', ')}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardAmount}>{formatCurrency(amount)}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="briefcase" size={28} color={PRIMARY} />
              </View>
              <Text style={styles.emptyTitle}>No job cards</Text>
              <Text style={styles.emptySubtitle}>Tap + New Job to create your first</Text>
            </View>
          ) : null
        }
      />

      {/* ── FAB ── */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => router.push('/(tabs)/jobs/create')}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.fabText}>New Job</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },

  searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, height: 46,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  searchInput: { flex: 1, fontSize: 15, color: TEXT },

  chipBar: { flexGrow: 0 },
  chipRow: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD,
  },
  chipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff' },

  list: { paddingHorizontal: 20, gap: 10 },

  card: {
    backgroundColor: CARD,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  jobNumber: { fontSize: 11, color: MUTED, fontWeight: '600', letterSpacing: 0.3 },

  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName:  { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 2 },
  cardSub:   { fontSize: 12, color: MUTED, lineHeight: 17 },
  cardRight: { alignItems: 'flex-end', gap: 3 },
  cardAmount:{ fontSize: 15, fontWeight: '700', color: PRIMARY },
  cardDate:  { fontSize: 11, color: MUTED },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  dot:        { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: MUTED },

  fab: {
    position: 'absolute', right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 28,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
