import React from 'react';
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
import DashboardService from '@/src/services/dashboard.service';
import { formatCurrency, formatDateTime } from '@/src/utils/helpers';
import StatCard from '@/src/components/ui/StatCard';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import ErrorState from '@/src/components/ui/ErrorState';
import StatusBadge from '@/src/components/ui/StatusBadge';
import type { RecentActivity } from '@/src/types';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: DashboardService.get,
  });

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          onPress={() => router.push('/(tabs)/more/notifications')}
        >
          <Feather name="bell" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonList count={4} />
        </ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.recent_activities ?? []}
          keyExtractor={item => item.job_id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View>
              {/* Revenue Banner */}
              <View style={[styles.revenueBanner, { backgroundColor: colors.card }]}>
                <View>
                  <Text style={[styles.revenueLabel, { color: colors.mutedForeground }]}>Today's Revenue</Text>
                  <Text style={[styles.revenueValue, { color: colors.primary }]}>
                    {formatCurrency(data?.revenue_today ?? 0)}
                  </Text>
                </View>
                <View style={styles.revenueDivider} />
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.revenueLabel, { color: colors.mutedForeground }]}>This Month</Text>
                  <Text style={[styles.revenueValue, { color: colors.accent }]}>
                    {formatCurrency(data?.revenue_this_month ?? 0)}
                  </Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsRow}>
                <StatCard
                  label="Jobs Today"
                  value={data?.jobs_today ?? 0}
                  iconBg={colors.accentLight}
                  icon={<Feather name="tool" size={18} color={colors.accent} />}
                />
                <StatCard
                  label="Bookings Today"
                  value={data?.bookings_today ?? 0}
                  iconBg={colors.infoLight}
                  icon={<Feather name="calendar" size={18} color={colors.info} />}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  label="Open Jobs"
                  value={data?.open_jobs ?? 0}
                  iconBg={colors.warningLight}
                  icon={<Feather name="clock" size={18} color={colors.warning} />}
                />
                <StatCard
                  label="Pending Bookings"
                  value={data?.pending_bookings ?? 0}
                  iconBg={colors.infoLight}
                  icon={<Feather name="inbox" size={18} color={colors.info} />}
                />
              </View>
              <View style={styles.statsRow}>
                <StatCard
                  label="In Progress"
                  value={data?.in_progress_jobs ?? 0}
                  iconBg="#F5F3FF"
                  icon={<Feather name="loader" size={18} color={colors.statusInProgress} />}
                />
                <StatCard
                  label="Completed"
                  value={data?.completed_jobs ?? 0}
                  iconBg={colors.successLight}
                  icon={<Feather name="check-circle" size={18} color={colors.success} />}
                />
              </View>

              {/* Quick Actions */}
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                {[
                  { label: 'New Job', icon: 'plus-circle', color: colors.accent, onPress: () => router.push('/(tabs)/jobs/create') },
                  { label: 'Bookings', icon: 'calendar', color: colors.info, onPress: () => router.push('/(tabs)/bookings/') },
                  { label: 'Jobs', icon: 'tool', color: colors.primary, onPress: () => router.push('/(tabs)/jobs/') },
                  { label: 'Analytics', icon: 'bar-chart-2', color: colors.success, onPress: () => router.push('/(tabs)/more/analytics') },
                ].map(({ label, icon, color, onPress }) => (
                  <TouchableOpacity key={label} style={[styles.actionBtn, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.8}>
                    <View style={[styles.actionIcon, { backgroundColor: color + '18' }]}>
                      <Feather name={icon as never} size={20} color={color} />
                    </View>
                    <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {data?.recent_activities?.length ? (
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Activity</Text>
              ) : null}
            </View>
          )}
          renderItem={({ item }: { item: RecentActivity }) => (
            <TouchableOpacity
              style={[styles.activityCard, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/(tabs)/jobs/${item.job_id}`)}
              activeOpacity={0.8}
            >
              <View style={[styles.activityDot, { backgroundColor: colors.accent }]} />
              <View style={styles.activityContent}>
                <View style={styles.activityHeader}>
                  <Text style={[styles.activityJob, { color: colors.foreground }]}>#{item.job_number}</Text>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                {item.customer_name ? (
                  <Text style={[styles.activityCustomer, { color: colors.mutedForeground }]}>{item.customer_name}</Text>
                ) : null}
                <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{formatDateTime(item.timestamp)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            data ? <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No recent activity</Text> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  headerTitle: { fontSize: 22, color: '#fff', fontWeight: '800' },
  notifBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 0 },
  revenueBanner: {
    borderRadius: 16, padding: 18, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  revenueLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  revenueValue: { fontSize: 22, fontWeight: '800' },
  revenueDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, gap: 8, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  activityCard: { borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 12, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  activityContent: { flex: 1, gap: 4 },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityJob: { fontSize: 14, fontWeight: '700' },
  activityCustomer: { fontSize: 13 },
  activityTime: { fontSize: 11 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: 16 },
});
