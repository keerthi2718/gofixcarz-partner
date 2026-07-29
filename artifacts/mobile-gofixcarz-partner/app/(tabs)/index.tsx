import React from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {
  Bell,
  ArrowUp,
  Star,
  Calendar,
  FileText,
  Wrench,
  BarChart2,
} from 'lucide-react-native';

import { QUERY_KEYS } from '@/src/constants/api';
import DashboardService from '@/src/services/dashboard.service';
import BookingService from '@/src/services/booking.service';
import GarageService from '@/src/services/garage.service';
import { formatCurrency } from '@/src/utils/helpers';
import { useNotificationContext } from '@/src/context/NotificationContext';

/* ─── Shadow token ─────────────────────────────────────────────────────── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

/* ─── Status mapping ────────────────────────────────────────────────────── */
const BOOKING_STATUS: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  PENDING:   { label: 'Pending',   color: '#D97706', bg: '#FFFBEB', bar: '#D97706' },
  ACCEPTED:  { label: 'Confirmed', color: '#2563EB', bg: '#EFF6FF', bar: '#2563EB' },
  CONVERTED: { label: 'Completed', color: '#059669', bg: '#ECFDF5', bar: '#059669' },
  REJECTED:  { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2', bar: '#DC2626' },
};

/* ─── Sparkline data (static representative 7-day points) ──────────────── */
// viewBox: 0 0 280 100  →  y=100 is bottom (₹0), y=0 is top (₹15k)
const SPARKLINE_POINTS = [
  { x: 0,     y: 80 },  // Mon  ~₹3k
  { x: 46.6,  y: 60 },  // Tue  ~₹6k
  { x: 93.3,  y: 75 },  // Wed  ~₹3.75k
  { x: 140,   y: 40 },  // Thu  ~₹9k
  { x: 186.6, y: 50 },  // Fri  ~₹7.5k
  { x: 233.3, y: 20 },  // Sat  ~₹12k
  { x: 280,   y: 30 },  // Sun  ~₹10.5k
];

function buildLinePath(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
}
function buildAreaPath(pts: { x: number; y: number }[]) {
  const line = buildLinePath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  return `${line} L ${last.x},100 L ${first.x},100 Z`;
}

const SPARKLINE_LINE = buildLinePath(SPARKLINE_POINTS);
const SPARKLINE_AREA = buildAreaPath(SPARKLINE_POINTS);
const SPARKLINE_LAST = SPARKLINE_POINTS[SPARKLINE_POINTS.length - 1];

/* ─── Quick actions ─────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'New Booking', Icon: Calendar,  route: '/(tabs)/bookings' as const },
  { label: 'Create Job',  Icon: Wrench,    route: '/jobs/create'     as const },

  { label: 'Reports',     Icon: BarChart2, route: '/(tabs)/analytics'as const },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Chart width: full screen minus horizontal card padding (mx-4 = 16 each side)
  // but the sparkline lives inside a card that has px-4 (16) so inner available ≈ width - 32 - 32 (outer mx) - left y-axis (~28)
  const chartOuterWidth = width - 32; // card width (mx-4 on each side)

  /* ── Queries ── */
  const {
    data,
    isLoading: dashLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn:  DashboardService.get,
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ page_size: 5 }),
    queryFn:  () => BookingService.list({ page_size: 5 }),
  });

  const { data: garage } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn:  GarageService.get,
  });

  const { unreadCount } = useNotificationContext();

  const garageName = garage?.name ?? 'Krishna Motors';
  const bookings   = bookingsData?.items ?? [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#C41E3A"
          />
        }
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
          <Text style={styles.headerGreeting}>Dashboard</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/more' as any)}
            style={styles.bellWrap}
          >
            <Bell size={24} color="#0F172A" strokeWidth={2} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── KPI 2×2 grid ── */}
        <View style={styles.kpiGrid}>
          {/* Today's Revenue */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Today's Revenue</Text>
            <Text style={[styles.kpiValue, { color: '#C41E3A' }]}>
              {dashLoading ? '—' : formatCurrency(data?.revenue_today ?? 12480)}
            </Text>
            <View style={styles.kpiSubRow}>
              <ArrowUp size={12} color="#059669" strokeWidth={2.5} />
              <Text style={[styles.kpiSubText, { color: '#059669' }]}>18% vs yesterday</Text>
            </View>
          </View>

          {/* Active Jobs */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Active Jobs</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
              {dashLoading ? '—' : (data?.open_jobs ?? 0)}
            </Text>
            <View style={styles.kpiSubRow}>
              <View style={styles.urgentDot} />
              <Text style={[styles.kpiSubText, { color: '#D97706' }]}>2 urgent</Text>
            </View>
          </View>

          {/* Bookings */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Bookings</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
              {dashLoading ? '—' : (data?.pending_bookings ?? 0)}
            </Text>
            <Text style={[styles.kpiSubText, { color: '#64748B', marginTop: 6 }]}>
              {dashLoading ? '' : `${data?.pending_bookings ?? 0} pending`}
            </Text>
          </View>


        </View>

        {/* ── Sparkline ── */}
        <View style={[styles.sparkCard, SHADOW_CARD]}>
          <View style={styles.sparkHeader}>
            <Text style={styles.sparkTitle}>Revenue this week</Text>
          </View>

          {/* Chart body: y-axis + SVG + x-labels */}
          <View style={styles.sparkBody}>
            {/* Y-axis labels */}
            <View style={styles.yAxis}>
              <Text style={styles.axisLabel}>15k</Text>
              <Text style={styles.axisLabel}>10k</Text>
              <Text style={styles.axisLabel}>5k</Text>
              <Text style={styles.axisLabel}>0</Text>
            </View>

            {/* SVG + x-labels */}
            <View style={styles.sparkChartArea}>
              {/* SVG sparkline */}
              <View style={styles.sparkSvgWrap}>
                <Svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 280 100"
                  preserveAspectRatio="none"
                >
                  <Defs>
                    <SvgLinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0%" stopColor="#C41E3A" stopOpacity={0.12} />
                      <Stop offset="100%" stopColor="#C41E3A" stopOpacity={0.01} />
                    </SvgLinearGradient>
                  </Defs>
                  {/* Area fill */}
                  <Path d={SPARKLINE_AREA} fill="url(#sparkGrad)" />
                  {/* Line */}
                  <Path
                    d={SPARKLINE_LINE}
                    fill="none"
                    stroke="#C41E3A"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Current day dot */}
                  <Circle
                    cx={SPARKLINE_LAST.x}
                    cy={SPARKLINE_LAST.y}
                    r={4.5}
                    fill="#C41E3A"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                </Svg>
              </View>

              {/* X-axis labels */}
              <View style={styles.xAxis}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => (
                  <Text
                    key={day}
                    style={[
                      styles.axisLabel,
                      i === 6 && styles.axisLabelActive,
                    ]}
                  >
                    {day}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsScroll}
          >
            {QUICK_ACTIONS.map(({ label, Icon, route }) => (
              <TouchableOpacity
                key={label}
                activeOpacity={0.7}
                style={[styles.quickActionChip, SHADOW_CARD]}
                onPress={() => router.push(route as any)}
              >
                <Icon size={16} color="#64748B" strokeWidth={2} />
                <Text style={styles.quickActionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Today's Jobs header ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today's Jobs</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/bookings')}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* ── Booking cards / skeletons ── */}
        {bookingsLoading ? (
          <View style={styles.jobsList}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {bookings.slice(0, 5).map(item => {
              const st = BOOKING_STATUS[item.status] ?? {
                label: item.status,
                color: '#64748B',
                bg: '#F3F4F6',
                bar: '#94A3B8',
              };
              const scheduledAt = (item as any).scheduled_at;
              const timeStr = scheduledAt
                ? new Date(scheduledAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={[styles.jobCard, SHADOW_CARD]}
                  onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
                >
                  {/* Left colored bar */}
                  <View style={[styles.jobBar, { backgroundColor: st.bar }]} />

                  {/* Content */}
                  <View style={styles.jobContent}>
                    <View style={styles.jobTopRow}>
                      <View style={styles.jobLeft}>
                        {timeStr && (
                          <Text style={styles.jobId}>{timeStr}</Text>
                        )}
                        <Text style={styles.jobTitle} numberOfLines={1}>
                          {item.customer_name ?? '—'}
                          {(item as any).service_type
                            ? <Text style={styles.jobTitleMuted}>{' · '}{(item as any).service_type}</Text>
                            : null
                          }
                        </Text>
                        <Text style={styles.jobSub} numberOfLines={1}>
                          {(item as any).service_requested ?? (item as any).service_type ?? '—'}
                        </Text>
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>
                          {st.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    // paddingBottom set dynamically
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexShrink: 0,
  },
  headerGreeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerGarage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  bellWrap: {
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#C41E3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 2,
  },
  bellBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
  },

  /* KPI grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  kpiCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexShrink: 0,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  kpiSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#D97706',
  },
  kpiSubText: {
    fontSize: 11,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  /* Sparkline card */
  sparkCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  sparkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sparkTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  sparkBody: {
    flexDirection: 'row',
    height: 120,
  },
  yAxis: {
    width: 28,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  sparkChartArea: {
    flex: 1,
    position: 'relative',
  },
  sparkSvgWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
  },
  xAxis: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  axisLabelActive: {
    fontWeight: '600',
    color: '#0F172A',
  },

  /* Quick actions */
  quickActionsSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  quickActionsScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexShrink: 0,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },

  /* Section header */
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C41E3A',
  },

  /* Job cards */
  jobsList: {
    marginHorizontal: 16,
    gap: 10,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  jobBar: {
    width: 3,
  },
  jobContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 12,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobLeft: {
    flex: 1,
    marginRight: 8,
  },
  jobId: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  jobTitleMuted: {
    fontWeight: '400',
    color: '#94A3B8',
  },
  jobSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  /* Skeleton */
  skeletonCard: {
    backgroundColor: '#F1F5F9',
    height: 72,
    borderRadius: 16,
    marginBottom: 2,
  },

  /* Empty */
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
  },
});
