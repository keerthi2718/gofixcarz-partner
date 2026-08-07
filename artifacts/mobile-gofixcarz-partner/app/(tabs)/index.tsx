import React, { useMemo } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Wrench,
  PlusCircle,
} from 'lucide-react-native';

import { QUERY_KEYS } from '@/src/constants/api';
import DashboardService from '@/src/services/dashboard.service';
import BookingService from '@/src/services/booking.service';
import GarageService from '@/src/services/garage.service';
import JobService from '@/src/services/job.service';
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


/* ─── Quick actions ─────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Create Job',  Icon: Wrench,     route: '/jobs/create'     as const },
  { label: 'Add Service', Icon: PlusCircle, route: '/services/create' as const },
];

/* ─── Helpers ───────────────────────────────────────────────────────────── */
/** Check if a date string falls on today (local time) */
function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth() &&
    d.getDate()     === now.getDate()
  );
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  /* ── Queries ── */
  const {
    data: dashData,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn:  DashboardService.get,
    retry: 1, // API may not exist — don't hammer
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ page_size: 50 }),
    queryFn:  () => BookingService.list({ page_size: 50 }),
  });

  // Fetch jobs using shared query key so cache is shared with Analytics.
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: QUERY_KEYS.JOBS({}),
    queryFn:  () => JobService.list({}),
  });

  const { data: garage } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn:  GarageService.get,
  });

  const { unreadCount } = useNotificationContext();

  const garageName = garage?.name ?? '';

  /* ── Derive KPIs from real job + booking data (matching Analytics tab logic) ── */
  const allJobs = jobsData?.items ?? [];
  const allBookings = bookingsData?.items ?? [];

  const kpis = useMemo(() => {
    // 1. Revenue Today — match Analytics jobRevenue calculation
    let revenueToday = dashData?.revenue_today ?? 0;
    if (!revenueToday) {
      revenueToday = allJobs.reduce((sum, job) => {
        const jobDate = job.completed_at ?? job.created_at ?? job.updated_at;
        if (!isToday(jobDate)) return sum;
        const amt = job.billing?.grand_total ?? job.final_amount ?? job.estimated_amount ?? (job as any).price ?? 0;
        const numAmt = typeof amt === 'number' ? (isNaN(amt) ? 0 : amt) : parseFloat(amt) || 0;
        return sum + numAmt;
      }, 0);
    }

    // 2. Active Jobs — OPEN, IN_PROGRESS, WAITING_FOR_PARTS, QUALITY_CHECK, READY
    const activeStatuses = new Set(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'QUALITY_CHECK', 'READY']);
    const calculatedActive = allJobs.filter(j => activeStatuses.has(j.status)).length;
    const activeJobs = (dashData?.open_jobs && dashData.open_jobs > 0) ? dashData.open_jobs : calculatedActive;

    // 3. In Progress Jobs — IN_PROGRESS, WAITING_FOR_PARTS, QUALITY_CHECK
    const calculatedInProgress = allJobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'WAITING_FOR_PARTS' || j.status === 'QUALITY_CHECK').length;
    const inProgressJobs = (dashData?.in_progress_jobs && dashData.in_progress_jobs > 0) ? dashData.in_progress_jobs : calculatedInProgress;

    // 4. Pending Bookings — PENDING status
    const calculatedPending = allBookings.filter(b => b.status === 'PENDING').length;
    const pendingBookings = (dashData?.pending_bookings && dashData.pending_bookings > 0) ? dashData.pending_bookings : calculatedPending;

    // 5. Completed Jobs — COMPLETED or DELIVERED status (matching Analytics tab logic)
    const completedJobs = allJobs.filter(j => j.status === 'COMPLETED' || (j.status as string) === 'DELIVERED').length;
    const completedTodayJobs = allJobs.filter(j => {
      if (j.status !== 'COMPLETED' && (j.status as string) !== 'DELIVERED') return false;
      const d = j.completed_at ?? j.updated_at ?? j.created_at;
      return isToday(d);
    }).length;

    return { revenueToday, activeJobs, inProgressJobs, pendingBookings, completedJobs, completedTodayJobs };
  }, [dashData, allJobs, allBookings]);

  const kpiLoading = jobsLoading;

  /* Filter to only today's bookings for the dashboard section */
  const bookings = allBookings.filter(b => isToday(b.booking_date));

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
            tintColor="#2563EB"
          />
        }
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 20 : 12) + insets.top }]}>
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
            <Text style={[styles.kpiValue, { color: '#2563EB' }]}>
              {kpiLoading ? '—' : formatCurrency(kpis.revenueToday)}
            </Text>
          </View>

          {/* Active Jobs */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Active Jobs</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
              {kpiLoading ? '—' : kpis.activeJobs}
            </Text>
            {!kpiLoading && kpis.inProgressJobs > 0 && (
              <View style={styles.kpiSubRow}>
                <View style={styles.urgentDot} />
                <Text style={[styles.kpiSubText, { color: '#D97706' }]}>{kpis.inProgressJobs} in progress</Text>
              </View>
            )}
          </View>

          {/* Bookings */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Bookings</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
              {kpiLoading ? '—' : kpis.pendingBookings}
            </Text>
            <Text style={[styles.kpiSubText, { color: '#64748B', marginTop: 6 }]}>
              {kpiLoading ? '' : `${kpis.pendingBookings} pending`}
            </Text>
          </View>

          {/* Completed Jobs */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Completed Jobs</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>
              {kpiLoading ? '—' : kpis.completedJobs}
            </Text>
            {!kpiLoading && (
              <View style={styles.kpiSubRow}>
                <View style={[styles.urgentDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.kpiSubText, { color: '#059669' }]}>
                  {kpis.completedTodayJobs > 0 ? `${kpis.completedTodayJobs} done today` : 'Delivered & Done'}
                </Text>
              </View>
            )}
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
            <Text style={styles.emptyText}>No bookings scheduled for today</Text>
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
                  activeOpacity={0.6}
                  style={styles.jobCard}
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
    fontSize: 24,
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
    color: '#2563EB',
  },

  /* Job list */
  jobsList: {
    marginHorizontal: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
