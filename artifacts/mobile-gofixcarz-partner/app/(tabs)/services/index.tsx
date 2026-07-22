import React, { useState } from 'react';
import {
  FlatList, Platform, Pressable, RefreshControl,
  StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import ServicePackageCard from '@/src/components/services/ServicePackageCard';
import ErrorState from '@/src/components/ui/ErrorState';
import LoadingState from '@/src/components/ui/LoadingState';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch]         = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGES({ search: search || undefined, active_only: activeOnly || undefined }),
    queryFn:  () => ServicePackageService.list({ search: search || undefined, active_only: activeOnly || undefined, page_size: 50 }),
  });

  const items     = data?.items ?? [];
  const totalAmt  = items.reduce((s, p) => s + p.price, 0);
  const activeCount = items.filter(p => p.is_active).length;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Page header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.pageTitle}>Services</Text>
          <Text style={styles.pageSubtitle}>{items.length} packages • {activeCount} active</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setSearchOpen(v => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name={searchOpen ? 'x' : 'search'} size={18} color={TEXT} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      {searchOpen && (
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Feather name="search" size={15} color={MUTED} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search service packages…"
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

      {/* ── Filter row ── */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, activeOnly && styles.filterChipActive]}
          onPress={() => setActiveOnly(v => !v)}
        >
          <View style={[styles.filterDot, { backgroundColor: activeOnly ? '#fff' : '#CBD5E1' }]} />
          <Text style={[styles.filterText, activeOnly && styles.filterTextActive]}>
            {activeOnly ? 'Active Only' : 'All Packages'}
          </Text>
        </Pressable>

        {/* Summary chip */}
        <View style={styles.summaryChip}>
          <Feather name="trending-up" size={11} color={PRIMARY} />
          <Text style={styles.summaryText}>
            ₹{totalAmt.toLocaleString('en-IN')} avg pool
          </Text>
        </View>
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 130 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ServicePackageCard
              pkg={item}
              onPress={() => router.push(`/(tabs)/services/${item.id}` as any)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Feather name="package" size={28} color={PRIMARY} />
              </View>
              <Text style={styles.emptyTitle}>No service packages</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try a different search term.' : 'Tap + Add to create your first package.'}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => router.push('/(tabs)/services/create')}
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.emptyActionText}>Add Package</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── FAB ── */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => router.push('/(tabs)/services/create')}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.fabText}>Add Service</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  topBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
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

  /* Search */
  searchWrap: { paddingHorizontal: 20, paddingBottom: 10 },
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

  /* Filters */
  filterRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, gap: 10,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD,
  },
  filterChipActive: { backgroundColor: SUCCESS, borderColor: SUCCESS },
  filterDot:        { width: 7, height: 7, borderRadius: 4 },
  filterText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  filterTextActive: { color: '#fff' },

  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#EEF2FF',
    borderWidth: 1.5, borderColor: '#93C5FD',
  },
  summaryText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  /* List */
  list: { paddingHorizontal: 20 },

  /* Empty */
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: MUTED, marginBottom: 20, textAlign: 'center' },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: PRIMARY, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 14,
  },
  emptyActionText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* FAB */
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
