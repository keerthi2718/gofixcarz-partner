import React, { useState } from 'react';
import {
  FlatList, Platform, Pressable, RefreshControl,
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import { formatCurrency } from '@/src/utils/helpers';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/src/components/ui/Avatar';
import { radius, shadow, spacing, typography } from '@/constants/theme';
import type { JobStatus } from '@/src/types';

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
  READY:             { label: 'Ready',       color: '#22C55E', bg: '#DCFCE7' },
  COMPLETED:         { label: 'Completed',   color: '#16A34A', bg: '#D1FAE5' },
  CANCELLED:         { label: 'Cancelled',   color: '#EF4444', bg: '#FEF2F2' },
};

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [filter, setFilter] = useState<JobStatus | ''>('');
  const [search, setSearch] = useState('');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOBS({ status: filter || undefined }),
    queryFn: () => JobService.list({ status: filter || undefined, page_size: 30 }),
  });

  const jobs = data?.items ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, backgroundColor: colors.primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: '#fff' }]}>Job Cards</Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)', marginTop: 2 }]}>
            {data?.total ?? 0} total
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Feather name="search" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Feather name="sliders" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.value}
              style={[
                styles.chip,
                { borderColor: filter === f.value ? colors.primary : colors.border },
                filter === f.value && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilter(f.value)}
              android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
            >
              <Text style={[
                typography.label,
                { color: filter === f.value ? '#fff' : colors.textSecondary },
              ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const st = JOB_STATUS[item.status] ?? { label: item.status, color: '#6B7280', bg: '#F3F4F6' };
          return (
            <TouchableOpacity
              style={[styles.jobCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.sm]}
              onPress={() => router.push(`/(tabs)/jobs/${item.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={styles.jobTop}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  JC-{String(index + 1).padStart(3, '0')}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                  <Text style={[typography.labelSm, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              <View style={styles.jobMain}>
                <Avatar name={item.customer_name} size={44} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[typography.titleSm, { color: colors.text }]}>
                    {item.customer_name ?? '—'}
                  </Text>
                  {(item.brand || item.registration_number) ? (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {[item.brand, item.vehicle_model].filter(Boolean).join(' ')}
                      {item.registration_number ? ` · ${item.registration_number}` : ''}
                    </Text>
                  ) : null}
                  {item.services && item.services.length > 0 ? (
                    <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.services.map(s => s.name).join(', ')}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.jobAmount}>
                  <Text style={[typography.titleSm, { color: colors.text }]}>
                    {formatCurrency(item.final_amount ?? item.estimated_amount ?? 0)}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
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
              <Feather name="briefcase" size={40} color={colors.textDisabled} />
              <Text style={[typography.title, { color: colors.textSecondary, marginTop: 12 }]}>No Job Cards</Text>
              <Text style={[typography.bodySm, { color: colors.textDisabled, marginTop: 4 }]}>
                Tap + to create your first job card
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 84 }, shadow.lg]}
        onPress={() => router.push('/(tabs)/jobs/create')}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={[typography.label, { color: '#fff' }]}>New Job</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.base, paddingBottom: spacing.base,
  },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  filterBar: { borderBottomWidth: 1 },
  chipRow: { paddingHorizontal: spacing.base, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  list: { padding: spacing.base, gap: spacing.sm },
  jobCard: { borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, gap: spacing.sm },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  jobMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  jobAmount: { alignItems: 'flex-end', gap: 3 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  fab: {
    position: 'absolute', right: spacing.base,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.base, paddingVertical: 14,
    borderRadius: 28,
  },
});
