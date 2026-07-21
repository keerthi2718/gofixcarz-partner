import React from 'react';
import {
  FlatList, Platform, Pressable, RefreshControl,
  ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import DashboardService from '@/src/services/dashboard.service';
import BookingService from '@/src/services/booking.service';
import { formatCurrency } from '@/src/utils/helpers';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/src/components/ui/Avatar';
import SectionHeader from '@/src/components/ui/SectionHeader';
import Card from '@/src/components/ui/Card';
import { radius, shadow, spacing, typography } from '@/constants/theme';

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB' },
  ACCEPTED:  { label: 'Confirmed', color: '#22C55E', bg: '#DCFCE7' },
  REJECTED:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2' },
  CONVERTED: { label: 'Converted', color: '#8B5CF6', bg: '#F5F3FF' },
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: DashboardService.get,
  });
  const { data: bookingsData } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ page_size: 5 }),
    queryFn: () => BookingService.list({ page_size: 5 }),
  });

  const bookings = bookingsData?.items ?? [];

  const stats = [
    { label: 'Active Jobs',  value: data?.open_jobs ?? 0,        icon: 'tool' as const,       color: colors.primary,  bg: colors.primaryLight },
    { label: 'Pending',      value: data?.pending_bookings ?? 0,  icon: 'clock' as const,      color: '#F59E0B',        bg: '#FFFBEB' },
    { label: 'Completed',    value: data?.completed_jobs ?? 0,    icon: 'check-circle' as const, color: '#22C55E',      bg: '#DCFCE7' },
  ];

  const quickActions = [
    { label: 'New Job',      icon: 'plus-circle' as const, bg: colors.primary,   route: '/(tabs)/jobs/create' },
    { label: 'Bookings',     icon: 'calendar' as const,   bg: '#3B82F6',         route: '/(tabs)/bookings' },
    { label: 'Services',     icon: 'settings' as const,   bg: '#8B5CF6',         route: '/(tabs)/services' },
    { label: 'Analytics',    icon: 'bar-chart-2' as const,bg: '#22C55E',         route: '/(tabs)/analytics' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, backgroundColor: colors.primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF', lineHeight: 36 }}>GoFixAuto</Text>
          <Text style={{ fontSize: 20, fontWeight: '600', color: 'rgba(255,255,255,0.90)', lineHeight: 26 }}>Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/(tabs)/more/notifications')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="bell" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={{ padding: spacing.base, gap: spacing.base }}>
            {/* Revenue cards */}
            <View style={styles.revenueRow}>
              {[
                { label: "Today's Revenue", value: data?.revenue_today ?? 0,      icon: 'dollar-sign' as const, accent: colors.primary },
                { label: 'This Month',       value: data?.revenue_this_month ?? 0, icon: 'trending-up' as const, accent: '#8B5CF6' },
              ].map(c => (
                <View key={c.label} style={[styles.revenueCard, { backgroundColor: c.accent }, shadow.md]}>
                  <View style={styles.revenueIconWrap}>
                    <Feather name={c.icon} size={16} color="rgba(255,255,255,0.85)" />
                  </View>
                  <Text style={[typography.caption, { color: 'rgba(255,255,255,0.8)', marginTop: 8 }]}>{c.label}</Text>
                  <Text style={[typography.headline, { color: '#fff' }]}>{formatCurrency(c.value)}</Text>
                </View>
              ))}
            </View>

            {/* Stats row */}
            <Card padding={0} style={{ overflow: 'hidden' }}>
              <View style={styles.statsRow}>
                {stats.map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 && <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />}
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                        <Feather name={s.icon} size={16} color={s.color} />
                      </View>
                      <Text style={[typography.headline, { color: colors.text }]}>{s.value}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>{s.label}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </Card>

            {/* Quick actions */}
            <SectionHeader title="Quick Actions" />
            <View style={styles.actionsRow}>
              {quickActions.map(a => (
                <Pressable
                  key={a.label}
                  style={styles.actionBtn}
                  onPress={() => router.push(a.route as any)}
                  android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
                >
                  <View style={[styles.actionIcon, { backgroundColor: a.bg }, shadow.sm]}>
                    <Feather name={a.icon} size={22} color="#fff" />
                  </View>
                  <Text style={[typography.caption, { color: colors.text, textAlign: 'center', marginTop: 6, fontWeight: '600' }]}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Bookings header */}
            <SectionHeader
              title="Today's Bookings"
              actionLabel="View All →"
              onAction={() => router.push('/(tabs)/bookings')}
            />
          </View>
        )}
        renderItem={({ item }) => {
          const st = BOOKING_STATUS[item.status] ?? { label: item.status, color: '#6B7280', bg: '#F3F4F6' };
          return (
            <TouchableOpacity
              style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.sm]}
              onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
              activeOpacity={0.85}
            >
              <Avatar name={item.customer_name} size={42} />
              <View style={styles.bookingInfo}>
                <Text style={[typography.titleSm, { color: colors.text }]} numberOfLines={1}>
                  {item.customer_name ?? '—'}
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.service_requested ?? '—'}
                </Text>
              </View>
              <View style={styles.bookingRight}>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[typography.labelSm, { color: st.color }]}>{st.label}</Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                  {item.booking_date ? new Date(item.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <Feather name="calendar" size={32} color={colors.textDisabled} />
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: 8 }]}>No bookings today</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.base, paddingBottom: spacing.base,
  },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  revenueRow: { flexDirection: 'row', gap: spacing.sm },
  revenueCard: { flex: 1, borderRadius: radius.lg, padding: spacing.base },
  revenueIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  statsRow: { flexDirection: 'row', paddingVertical: spacing.base },
  statItem: { flex: 1, alignItems: 'center', gap: 6 },
  statsDivider: { width: 1, marginVertical: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 0 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bookingCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.base, marginBottom: spacing.sm,
    borderRadius: radius.lg, padding: spacing.md, borderWidth: 1,
  },
  bookingInfo: { flex: 1, gap: 3 },
  bookingRight: { alignItems: 'flex-end' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
});
