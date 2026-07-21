import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency } from '@/src/utils/helpers';
import type { JobStatus } from '@/src/types';

const RED = '#C62828';

const FILTERS: { label: string; value: JobStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'QC', value: 'QUALITY_CHECK' },
  { label: 'Ready', value: 'READY' },
  { label: 'Done', value: 'COMPLETED' },
];

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_PARTS: 'Waiting',
  QUALITY_CHECK: 'QC Check',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: '#3B82F6',
  IN_PROGRESS: '#8B5CF6',
  WAITING_FOR_PARTS: '#F59E0B',
  QUALITY_CHECK: '#6366F1',
  READY: '#10B981',
  COMPLETED: '#059669',
  CANCELLED: '#EF4444',
};

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.JOBS({ search: search || undefined, status: statusFilter || undefined }),
    queryFn: () => JobService.list({ search: search || undefined, status: statusFilter || undefined, page_size: 25 }),
  });

  const jobs = data?.items ?? [];
  const activeCount = jobs.filter(j => !['COMPLETED', 'CANCELLED'].includes(j.status)).length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Red Header */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Job Cards</Text>
          <Text style={styles.headerSub}>
            {data?.total ?? 0} total{activeCount > 0 ? `, ${activeCount} active` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Feather name="search" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Feather name="sliders" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, job #, vehicle..."
          placeholderTextColor="#9CA3AF"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, statusFilter === f.value && styles.chipActive]}
            onPress={() => setStatusFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, statusFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}><SkeletonList count={6} /></ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => {
            const statusColor = STATUS_COLOR[item.status] ?? '#6B7280';
            return (
              <TouchableOpacity
                style={styles.jobCard}
                onPress={() => router.push(`/(tabs)/jobs/${item.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.jobCardTop}>
                  <View style={styles.jobCardLeft}>
                    <Text style={styles.jobNumber}>JC-{String(index + 1).padStart(3, '0')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.jobAmount}>{formatCurrency(item.final_amount ?? item.estimated_amount ?? 0)}</Text>
                </View>
                <Text style={styles.jobCustomer}>{item.customer_name ?? '—'}</Text>
                {(item.brand || item.registration_number) && (
                  <Text style={styles.jobMeta}>
                    {item.brand ?? ''} {item.vehicle_model ?? ''}{item.registration_number ? ` • ${item.registration_number}` : ''}
                  </Text>
                )}
                {item.services && item.services.length > 0 && (
                  <Text style={styles.jobServices} numberOfLines={1}>
                    {item.services.map(s => s.name).join(', ')}
                  </Text>
                )}
                <View style={styles.jobFooter}>
                  {item.labour?.description ? (
                    <View style={styles.techRow}>
                      <View style={[styles.techAvatar, { backgroundColor: RED + '20' }]}>
                        <Text style={[styles.techAvatarText, { color: RED }]}>T</Text>
                      </View>
                      <Text style={styles.techName} numberOfLines={1}>{item.labour.description}</Text>
                    </View>
                  ) : <View />}
                  <Text style={styles.jobTime}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={RED} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase"
              title="No Job Cards"
              description={search ? 'Try a different search.' : 'Tap + to create your first job card.'}
              actionLabel="Create Job"
              onAction={() => router.push('/(tabs)/jobs/create')}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => router.push('/(tabs)/jobs/create')}
        activeOpacity={0.9}
      >
        <Feather name="plus" size={20} color="#fff" />
        <Text style={styles.fabText}>New Job Card</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: RED, paddingHorizontal: 16, paddingBottom: 16, gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filtersRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: RED, borderColor: RED },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },
  list: { padding: 12, gap: 0 },
  jobCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 1, gap: 4,
  },
  jobCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  jobCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobNumber: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  jobAmount: { fontSize: 15, fontWeight: '800', color: '#111827' },
  jobCustomer: { fontSize: 15, fontWeight: '700', color: '#111827' },
  jobMeta: { fontSize: 12, color: '#6B7280' },
  jobServices: { fontSize: 12, color: '#6B7280' },
  jobFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  techRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  techAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  techAvatarText: { fontSize: 10, fontWeight: '700' },
  techName: { fontSize: 12, color: '#6B7280' },
  jobTime: { fontSize: 12, color: '#9CA3AF' },
  fab: {
    position: 'absolute', right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: RED, borderRadius: 28,
    paddingHorizontal: 18, paddingVertical: 14,
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
