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
import { formatCurrency } from '@/src/utils/helpers';
import { useAuthStore } from '@/src/store/auth.store';
import Avatar from '@/src/components/ui/Avatar';
import { radius, spacing, typography } from '@/constants/theme';

/* ── Design tokens ─────────────────────────────────────────── */
const BG        = '#EEEEF6';   // soft lavender-white (reference bg)
const CARD      = '#FFFFFF';
const PRIMARY   = '#2563EB';
const INDIGO    = '#6366F1';
const PURPLE    = '#7C3AED';
const TEXT      = '#1E293B';
const MUTED     = '#64748B';
const BORDER    = 'rgba(226,232,240,0.7)';

const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB' },
  ACCEPTED:  { label: 'Confirmed', color: '#10B981', bg: '#ECFDF5' },
  REJECTED:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2' },
  CONVERTED: { label: 'Converted', color: '#8B5CF6', bg: '#F5F3FF' },
};

const QUICK_ACTIONS = [
  { label: 'New Job',   icon: 'plus'        as const, bg: '#EEF2FF', fg: INDIGO,   route: '/(tabs)/jobs/create' },
  { label: 'Bookings',  icon: 'calendar'    as const, bg: '#FFF7ED', fg: '#F97316', route: '/(tabs)/bookings' },
  { label: 'Services',  icon: 'settings'    as const, bg: '#F0FDF4', fg: '#10B981', route: '/(tabs)/services' },
  { label: 'Analytics', icon: 'bar-chart-2' as const, bg: '#FDF4FF', fg: PURPLE,    route: '/(tabs)/analytics' },
];

/* ── Greeting helper ────────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const insets  = useSafeAreaInsets();
  const user    = useAuthStore(s => s.user);
  const topPad  = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn:  DashboardService.get,
  });
  const { data: bookingsData } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ page_size: 5 }),
    queryFn:  () => BookingService.list({ page_size: 5 }),
  });

  const bookings = bookingsData?.items ?? [];

  const firstName = (user as any)?.first_name ?? (user as any)?.name?.split(' ')[0] ?? 'Partner';

  const stats = [
    { label: 'Active Jobs',  value: data?.open_jobs         ?? 0, icon: 'tool'         as const, color: PRIMARY, bg: '#EEF2FF' },
    { label: 'Pending',      value: data?.pending_bookings  ?? 0, icon: 'clock'        as const, color: '#F97316', bg: '#FFF7ED' },
    { label: 'Completed',    value: data?.completed_jobs    ?? 0, icon: 'check-circle' as const, color: '#10B981', bg: '#ECFDF5' },
    { label: 'This Month',   value: data?.revenue_this_month ?? 0, icon: 'trending-up' as const, color: PURPLE,  bg: '#F5F3FF', isCurrency: true },
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
            {/* ── Top bar ───────────────────────────────────── */}
            <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
              {/* Avatar + greeting */}
              <View style={styles.greetRow}>
                <Avatar name={firstName} size={44} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.greetLabel}>{greeting()},</Text>
                  <Text style={styles.greetName}>{firstName} 👋</Text>
                </View>
              </View>

              {/* Bell */}
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => router.push('/(tabs)/more/notifications')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="bell" size={20} color={TEXT} />
                {/* Unread dot */}
                <View style={styles.bellDot} />
              </TouchableOpacity>
            </View>

            {/* ── Hero revenue card ─────────────────────────── */}
            <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
              <LinearGradient
                colors={['#4F46E5', '#2563EB', '#06B6D4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                {/* Decorative circles */}
                <View style={styles.heroCircle1} />
                <View style={styles.heroCircle2} />

                <View style={{ zIndex: 1 }}>
                  <Text style={styles.heroLabel}>Today's Revenue</Text>
                  <Text style={styles.heroValue}>
                    {formatCurrency(data?.revenue_today ?? 0)}
                  </Text>

                  <View style={styles.heroFooter}>
                    <View style={styles.heroChip}>
                      <Feather name="trending-up" size={11} color="#fff" />
                      <Text style={styles.heroChipText}>This month: {formatCurrency(data?.revenue_this_month ?? 0)}</Text>
                    </View>
                    <View style={[styles.heroChip, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <Feather name="briefcase" size={11} color="#fff" />
                      <Text style={styles.heroChipText}>{data?.completed_jobs ?? 0} jobs done</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* ── Stat chips (horizontal scroll) ───────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScroll}
              style={{ marginTop: 20 }}
            >
              {stats.map(s => (
                <View key={s.label} style={styles.statChip}>
                  <View style={[styles.statChipIcon, { backgroundColor: s.bg }]}>
                    <Feather name={s.icon} size={16} color={s.color} />
                  </View>
                  <Text style={styles.statChipValue}>
                    {s.isCurrency ? formatCurrency(s.value) : s.value}
                  </Text>
                  <Text style={styles.statChipLabel}>{s.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* ── Quick actions ─────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
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
                    <Text style={[styles.actionLabel, { color: a.fg }]}>{a.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Bookings section title ────────────────────── */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Today's Bookings</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')} activeOpacity={0.7}>
                <Text style={styles.sectionLink}>See all →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        renderItem={({ item }) => {
          const st = BOOKING_STATUS[item.status] ?? { label: item.status, color: MUTED, bg: '#F3F4F6' };
          return (
            <TouchableOpacity
              style={styles.bookingRow}
              onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
              activeOpacity={0.86}
            >
              {/* Avatar */}
              <Avatar name={item.customer_name} size={46} />

              {/* Info */}
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingName} numberOfLines={1}>
                  {item.customer_name ?? '—'}
                </Text>
                <Text style={styles.bookingService} numberOfLines={1}>
                  {item.service_requested ?? '—'}
                </Text>
              </View>

              {/* Right — status + date */}
              <View style={styles.bookingRight}>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
                <Text style={styles.bookingDate}>
                  {item.booking_date
                    ? new Date(item.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : '—'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}

        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Feather name="calendar" size={28} color={INDIGO} />
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

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  greetRow:    { flexDirection: 'row', alignItems: 'center' },
  greetLabel:  { fontSize: 12, color: MUTED, fontWeight: '400', letterSpacing: 0.2 },
  greetName:   { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
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

  /* ── Hero card ── */
  heroCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    minHeight: 160,
    justifyContent: 'flex-end',
    ...Platform.select({
      ios: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 },
      android: { elevation: 10 },
      default: {},
    }),
  },
  heroCircle1: {
    position: 'absolute', top: -40, right: -30,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroCircle2: {
    position: 'absolute', top: 20, right: 60,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroLabel: {
    fontSize: 13, color: 'rgba(255,255,255,0.75)',
    fontWeight: '500', letterSpacing: 0.4, marginBottom: 6,
  },
  heroValue: {
    fontSize: 38, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -1, lineHeight: 46, marginBottom: 20,
  },
  heroFooter: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  heroChipText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  /* ── Stat chips ── */
  statsScroll: { paddingHorizontal: 20, gap: 12 },
  statChip: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statChipIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  statChipValue: {
    fontSize: 18, fontWeight: '700', color: TEXT,
    letterSpacing: -0.4, marginBottom: 2,
  },
  statChipLabel: { fontSize: 11, color: MUTED, fontWeight: '500' },

  /* ── Quick actions ── */
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: TEXT,
    letterSpacing: -0.3, marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionItem: { alignItems: 'center', flex: 1 },
  actionCircle: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  /* ── Section row ── */
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, marginTop: 28, marginBottom: 14,
  },
  sectionLink: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  /* ── Booking rows ── */
  bookingRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD,
    marginHorizontal: 20, marginBottom: 10,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: BORDER,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  bookingInfo:   { flex: 1 },
  bookingName:   { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 3 },
  bookingService: { fontSize: 12, color: MUTED, fontWeight: '400' },
  bookingRight:  { alignItems: 'flex-end', gap: 5 },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  statusText:   { fontSize: 11, fontWeight: '600' },
  bookingDate:  { fontSize: 11, color: MUTED },

  /* ── Empty ── */
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
