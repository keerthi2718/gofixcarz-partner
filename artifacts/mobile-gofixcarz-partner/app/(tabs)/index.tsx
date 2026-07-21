import React from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import DashboardService from '@/src/services/dashboard.service';
import BookingService from '@/src/services/booking.service';
import { formatCurrency } from '@/src/utils/helpers';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import ErrorState from '@/src/components/ui/ErrorState';

const RED = '#C62828';
const RED_DARK = '#B71C1C';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Confirmed',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#10B981',
  REJECTED: '#EF4444',
  CONVERTED: '#8B5CF6',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: DashboardService.get,
  });

  const { data: bookingsData } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ page_size: 5 }),
    queryFn: () => BookingService.list({ page_size: 5 }),
  });

  const todayBookings = bookingsData?.items ?? [];

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={RED} />
        <View style={[styles.header, { paddingTop: topPad + 14 }]}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSub}>Loading…</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SkeletonList count={4} />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={RED} />
        <View style={[styles.header, { paddingTop: topPad + 14 }]}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <FlatList
        data={todayBookings}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={RED} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            {/* Red Header */}
            <View style={[styles.header, { paddingTop: topPad + 14 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSub}>AutoCare Garage</Text>
              </View>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => router.push('/(tabs)/more/notifications')}
              >
                <Feather name="bell" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              {/* Revenue Cards */}
              <View style={styles.revenueRow}>
                <View style={[styles.revenueCard, { backgroundColor: RED }]}>
                  <View style={styles.revenueIconRow}>
                    <Feather name="dollar-sign" size={14} color="rgba(255,255,255,0.8)" />
                  </View>
                  <Text style={styles.revenueLabel}>Today's Revenue</Text>
                  <Text style={styles.revenueValue}>{formatCurrency(data?.revenue_today ?? 0)}</Text>
                </View>
                <View style={[styles.revenueCard, { backgroundColor: RED_DARK }]}>
                  <View style={styles.revenueIconRow}>
                    <Feather name="trending-up" size={14} color="rgba(255,255,255,0.8)" />
                  </View>
                  <Text style={styles.revenueLabel}>This Week</Text>
                  <Text style={styles.revenueValue}>{formatCurrency(data?.revenue_this_month ?? 0)}</Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={[styles.statsCard, { backgroundColor: '#fff' }]}>
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: '#FFF5F5' }]}>
                    <Feather name="tool" size={18} color={RED} />
                  </View>
                  <Text style={styles.statValue}>{data?.open_jobs ?? 0}</Text>
                  <Text style={styles.statLabel}>Active Jobs</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
                    <Feather name="clock" size={18} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValue}>{data?.pending_bookings ?? 0}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: '#F0FFF4' }]}>
                    <Feather name="check-circle" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.statValue}>{data?.completed_jobs ?? 0}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </View>

              {/* Quick Actions */}
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                {[
                  { label: 'New\nBooking', icon: 'calendar', bg: RED, onPress: () => router.push('/(tabs)/bookings') },
                  { label: 'Add\nService', icon: 'settings', bg: '#212121', onPress: () => router.push('/(tabs)/services') },
                  { label: 'Analytics', icon: 'bar-chart-2', bg: '#2E7D32', onPress: () => router.push('/(tabs)/analytics') },
                  { label: 'New\nJob', icon: 'plus-circle', bg: '#E65100', onPress: () => router.push('/(tabs)/jobs/create') },
                ].map(({ label, icon, bg, onPress }) => (
                  <TouchableOpacity key={label} style={styles.actionBtn} onPress={onPress} activeOpacity={0.8}>
                    <View style={[styles.actionIcon, { backgroundColor: bg }]}>
                      <Feather name={icon as never} size={20} color="#fff" />
                    </View>
                    <Text style={styles.actionLabel} numberOfLines={2}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Today's Bookings header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's Bookings</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')}>
                  <Text style={[styles.viewAll, { color: RED }]}>View All →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookingRow}
            onPress={() => router.push(`/(tabs)/bookings/${item.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.bookingLeft}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {(item.customer_name ?? 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingCustomer}>{item.customer_name ?? '—'}</Text>
                <Text style={styles.bookingService} numberOfLines={1}>
                  {item.service_requested ?? '—'}
                </Text>
              </View>
            </View>
            <View style={styles.bookingRight}>
              <Text style={styles.bookingTime}>
                {item.booking_date ? new Date(item.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[item.status] ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] ?? '#9CA3AF' }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
            <Text style={{ color: '#9CA3AF', textAlign: 'center', fontSize: 13 }}>No bookings today</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    backgroundColor: RED, paddingHorizontal: 20, paddingBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: 16, gap: 0 },
  revenueRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  revenueCard: {
    flex: 1, borderRadius: 14, padding: 16, gap: 4,
  },
  revenueIconRow: { marginBottom: 4 },
  revenueLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  revenueValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  revenueChange: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  statsCard: {
    flexDirection: 'row', borderRadius: 14, paddingVertical: 16,
    marginBottom: 20, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 6 },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  viewAll: { fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
  bookingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    elevation: 1,
  },
  bookingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: RED },
  bookingInfo: { flex: 1, gap: 2 },
  bookingCustomer: { fontSize: 14, fontWeight: '700', color: '#111827' },
  bookingService: { fontSize: 12, color: '#6B7280' },
  bookingRight: { alignItems: 'flex-end', gap: 4 },
  bookingTime: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  statusPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
});
