import React from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import DashboardService from '@/src/services/dashboard.service';
import BookingService from '@/src/services/booking.service';
import GarageService from '@/src/services/garage.service';
import { formatCurrency } from '@/src/utils/helpers';
import Avatar from '@/src/components/ui/Avatar';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const INDIGO  = '#6366F1';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Waiting',   color: '#F59E0B', bg: '#FFFBEB' },
  ACCEPTED:  { label: 'Confirmed', color: '#10B981', bg: '#ECFDF5' },
  REJECTED:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2' },
  CONVERTED: { label: 'Converted', color: '#8B5CF6', bg: '#F5F3FF' },
};

const QUICK_ACTIONS = [
  { label: 'New\nBooking',  icon: 'calendar'    as const, bg: '#EEF2FF', fg: PRIMARY,    route: '/(tabs)/bookings'      },
  { label: 'Add\nService',  icon: 'tool'        as const, bg: '#FFF7ED', fg: '#F97316',   route: '/(tabs)/services'      },
  { label: 'Analytics',     icon: 'bar-chart-2' as const, bg: '#F0FDF4', fg: '#10B981',   route: '/(tabs)/analytics'     },
  { label: 'More',          icon: 'grid'        as const, bg: '#F5F3FF', fg: INDIGO,      route: '/(tabs)/more'          },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn:  DashboardService.get,
  });
  const { data: bookingsData } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ page_size: 5 }),
    queryFn:  () => BookingService.list({ page_size: 5 }),
  });
  const { data: garage } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn:  GarageService.get,
  });

  const bookings   = bookingsData?.items ?? [];
  const garageName = garage?.name ?? 'Your Garage';

  const STATS = [
    { label: 'Active Jobs', value: data?.open_jobs        ?? 0, icon: 'briefcase'   as const, color: PRIMARY,   bg: '#EEF2FF' },
    { label: 'Pending',     value: data?.pending_bookings ?? 0, icon: 'clock'       as const, color: '#F59E0B',  bg: '#FFF7ED' },
    { label: 'Completed',   value: data?.completed_jobs   ?? 0, icon: 'check-circle'as const, color: '#10B981',  bg: '#ECFDF5' },
  ];

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <FlatList
        data={bookings}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={PRIMARY}
            progressViewOffset={topPad}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}

        ListHeaderComponent={() => (
          <>
            {/* ── Header ── */}
            <View style={[styles.header, { paddingTop: topPad + 14 }]}>
              <View>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSub}>{garageName}</Text>
              </View>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => router.push('/(tabs)/more/notifications')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="bell" size={20} color={TEXT} />
                <View style={styles.bellDot} />
              </TouchableOpacity>
            </View>

            {/* ── Revenue cards ── */}
            <View style={styles.revenueRow}>
              {/* Today's Revenue */}
              <LinearGradient
                colors={['#1D4ED8', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.revenueCard}
              >
                <View style={styles.revBubble} />
                <View style={styles.revTopRow}>
                  <View style={styles.revIconWrap}>
                    <Feather name="dollar-sign" size={14} color="#fff" />
                  </View>
                  <View style={styles.revBadge}>
                    <Feather name="trending-up" size={10} color="#4ADE80" />
                    <Text style={styles.revBadgeText}>Today</Text>
                  </View>
                </View>
                <Text style={styles.revValue}>{formatCurrency(data?.revenue_today ?? 0)}</Text>
                <Text style={styles.revLabel}>Today's Revenue</Text>
              </LinearGradient>

              {/* This Month */}
              <LinearGradient
                colors={['#2563EB', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.revenueCard}
              >
                <View style={styles.revBubble} />
                <View style={styles.revTopRow}>
                  <View style={styles.revIconWrap}>
                    <Feather name="trending-up" size={14} color="#fff" />
                  </View>
                  <View style={styles.revBadge}>
                    <Feather name="calendar" size={10} color="#FDE68A" />
                    <Text style={styles.revBadgeText}>Month</Text>
                  </View>
                </View>
                <Text style={styles.revValue}>{formatCurrency(data?.revenue_this_month ?? 0)}</Text>
                <Text style={styles.revLabel}>This Month</Text>
              </LinearGradient>
            </View>

            {/* ── Stats row ── */}
            <View style={styles.statsRow}>
              {STATS.map(s => (
                <View key={s.label} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                    <Feather name={s.icon} size={16} color={s.color} />
                  </View>
                  <Text style={[styles.statValue, { color: s.color }]}>
                    {s.value}
                  </Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Quick Actions ── */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsRow}>
                {QUICK_ACTIONS.map(a => (
                  <Pressable
                    key={a.label}
                    style={styles.actionItem}
                    onPress={() => router.push(a.route as any)}
                    android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: true }}
                  >
                    <View style={[styles.actionCircle, { backgroundColor: a.bg }]}>
                      <Feather name={a.icon} size={22} color={a.fg} />
                    </View>
                    <Text style={[styles.actionLabel, { color: TEXT }]}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Today's Bookings header ── */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Today's Bookings</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')} activeOpacity={0.7}>
                <Text style={styles.sectionLink}>View All →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        renderItem={({ item }) => {
          const st = BOOKING_STATUS[item.status] ?? { label: item.status, color: MUTED, bg: '#F3F4F6' };
          const timeStr = item.booking_date
            ? new Date(item.booking_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : null;
          const dateStr = item.booking_date
            ? new Date(item.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
            : null;

          return (
            <TouchableOpacity
              style={styles.bookingCard}
              onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
              activeOpacity={0.86}
            >
              {/* Avatar */}
              <Avatar name={item.customer_name ?? '?'} size={44} />

              {/* Info */}
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingName} numberOfLines={1}>
                  {item.customer_name ?? '—'}
                </Text>
                <Text style={styles.bookingService} numberOfLines={1}>
                  {item.service_requested ?? 'General Service'}
                </Text>
                {item.customer_mobile ? (
                  <Text style={styles.bookingMeta} numberOfLines={1}>
                    {item.customer_mobile}
                  </Text>
                ) : null}
              </View>

              {/* Right — time + status */}
              <View style={styles.bookingRight}>
                {timeStr ? (
                  <Text style={styles.bookingTime}>{timeStr}</Text>
                ) : dateStr ? (
                  <Text style={styles.bookingTime}>{dateStr}</Text>
                ) : null}
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}

        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Feather name="calendar" size={28} color={PRIMARY} />
              </View>
              <Text style={styles.emptyTitle}>No bookings today</Text>
              <Text style={styles.emptySubtitle}>New bookings will appear here</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: MUTED, marginTop: 2, fontWeight: '500' },
  bellBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  bellDot: {
    position: 'absolute', top: 10, right: 11,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: BG,
  },

  /* ── Revenue cards ── */
  revenueRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  revenueCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'flex-end',
    ...Platform.select({
      ios: { shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  revBubble: {
    position: 'absolute', top: -20, right: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  revTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  revIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  revBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3,
  },
  revBadgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  revValue: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.4, marginBottom: 3 },
  revLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  /* ── Stats row ── */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: MUTED, fontWeight: '600', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

  /* ── Quick actions ── */
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.3, marginBottom: 16 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionItem: { alignItems: 'center', flex: 1, gap: 8 },
  actionCircle: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 15 },

  /* ── Section header row ── */
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionLink: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  /* ── Booking cards ── */
  bookingCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD,
    marginHorizontal: 20, marginBottom: 10,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  bookingInfo:    { flex: 1, gap: 2 },
  bookingName:    { fontSize: 14, fontWeight: '700', color: TEXT },
  bookingService: { fontSize: 12, color: MUTED },
  bookingMeta:    { fontSize: 11, color: '#94A3B8' },
  bookingRight:   { alignItems: 'flex-end', gap: 6 },
  bookingTime:    { fontSize: 12, color: MUTED, fontWeight: '500' },
  statusPill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  /* ── Empty state ── */
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '600', color: TEXT, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: MUTED, textAlign: 'center' },
});
