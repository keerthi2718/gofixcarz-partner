import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import JobCard from '@/src/components/jobs/JobCard';
import SearchBar from '@/src/components/ui/SearchBar';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { JobStatus } from '@/src/types';

const STATUS_FILTERS: { label: string; value: JobStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Waiting', value: 'WAITING_FOR_PARTS' },
  { label: 'QC', value: 'QUALITY_CHECK' },
  { label: 'Ready', value: 'READY' },
  { label: 'Done', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.JOBS({ search: search || undefined, status: statusFilter || undefined }),
    queryFn: () => JobService.list({ search: search || undefined, status: statusFilter || undefined, page_size: 25 }),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Jobs</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/(tabs)/jobs/create')}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.createBtnText}>New Job</Text>
          </TouchableOpacity>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, job #, vehicle..." />
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, statusFilter === f.value && { backgroundColor: colors.primary }]}
            onPress={() => setStatusFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, { color: statusFilter === f.value ? '#fff' : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.list}><SkeletonList count={6} /></ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <JobCard job={item} onPress={() => router.push(`/(tabs)/jobs/${item.id}`)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="tool" title="No Jobs Found" description={search ? 'Try a different search term.' : 'Create your first job card.'} actionLabel="Create Job" onAction={() => router.push('/(tabs)/jobs/create')} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  filters: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F1F5F9' },
  chipText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 16 },
});
