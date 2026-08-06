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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Calendar,
  Wrench,
  BarChart2,
} from 'lucide-react-native';

import { QUERY_KEYS } from '@/src/constants/api';
import DashboardService from '@/src/services/dashboard.service';
import JobService from '@/src/services/job.service';
import GarageService from '@/src/services/garage.service';
import { formatCurrency } from '@/src/utils/helpers';
import { useNotificationContext } from '@/src/context/NotificationContext';

/* ─── Shadow token ─────────────────────────────────────────────────────── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

/* ─── Job status display config ─────────────────────────────────────────── */
const JOB_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  OPEN:              { label: 'Open',          color: '#3B5FA0', bg: '#EEF2FB', bar: '#5B8DEF' },
  IN_PROGRESS:       { label: 'In Progress',   color: '#0369A1', bg: '#F0F8FF', bar: '#38A0D4' },
  QUALITY_CHECK:     { label: 'QC Check',      color: '#5B4FA0', bg: '#F2F0FB', bar: '#8B80D4' },
  WAITING_FOR_PARTS: { label: 'Waiting',       color: '#7C3AED', bg: '#F5F3FF', bar: '#8B5CF6' },
  READY:             { label: 'Ready',         color: '#1A6E52', bg: '#EDFAF4', bar: '#34C987' },
  COMPLETED:         { label: 'Done',          color: '#1A6E52', bg: '#EDFAF4', bar: '#34C987' },
  CANCELLED:         { label: 'Cancelled',     color: '#DC2626', bg: '#FEF2F2', bar: '#EF4444' },
};


/* ─── Quick actions ─────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'New Booking', Icon: Calendar,  route: '/(tabs)/bookings'       as const },
  { label: 'Create Job',  Icon: Wrench,    route: '/(tabs)/jobs/create'    as const },

  { label: 'Reports',     Icon: BarChart2, route: '/(tabs)/analytics'as const },
];

/* ─── Component ─────────────────────────────────────────────────────────── */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

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

  /* Recent jobs — most recently created first, capped at 10 for the dashboard */
  const {
    data:        jobsData,
    isLoading:   jobsLoading,
    isRefetching: jobsRefetching,
    refetch:     refetchJobs,
  } = useQuery({
    queryKey: QUERY_KEYS.JOBS({ page_size: 10, sort_by: 'created_at', sort_dir: 'desc' }),
    queryFn:  () => JobService.list({ page_size: 10, sort_by: 'created_at', sort_dir: 'desc' }),
  });

  const { data: garage } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn:  GarageService.get,
  });

  const { unreadCount } = useNotificationContext();

  const garageName  = garage?.name ?? '';
  const recentJobs  = jobsData?.items ?? [];

  /* Combined pull-to-refresh — refreshes dashboard KPIs and jobs list together */
  function onRefresh() {
    refetch();
    refetchJobs();
  }

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
            refreshing={isRefetching || jobsRefetching}
            onRefresh={onRefresh}
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
              {dashLoading ? '—' : formatCurrency(data?.revenue_today ?? 0)}
            </Text>
          </View>

          {/* Active Jobs — open + in-progress combined */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Active Jobs</Text>
            <Text style={[styles.kpiValue, { color: '#0F172A' }]}>
              {dashLoading ? '—' : ((data?.open_jobs ?? 0) + (data?.in_progress_jobs ?? 0))}
            </Text>
            {!dashLoading && !!data?.in_progress_jobs && (
              <View style={styles.kpiSubRow}>
                <View style={styles.urgentDot} />
                <Text style={[styles.kpiSubText, { color: '#D97706' }]}>{data.in_progress_jobs} in progress</Text>
              </View>
            )}
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

        {/* ── Recent Jobs header ── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/jobs')}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {/* ── Jobs list / skeletons / empty ── */}
        {jobsLoading ? (
          <View style={styles.jobsList}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : recentJobs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No jobs yet — tap Create Job to get started</Text>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {recentJobs.slice(0, 5).map(item => {
              const st = JOB_STATUS_CONFIG[item.status] ?? {
                label: item.status,
                color: '#64748B',
                bg: '#F3F4F6',
                bar: '#94A3B8',
              };
              const vehicle = [item.brand, item.vehicle_model].filter(Boolean).join(' ')
                           || item.registration_number
                           || '—';

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.6}
                  style={styles.jobCard}
                  onPress={() => router.push(`/(tabs)/jobs/${item.id}` as any)}
                >
                  {/* Left coloured bar — reflects job status at a glance */}
                  <View style={[styles.jobBar, { backgroundColor: st.bar }]} />

                  {/* Content */}
                  <View style={styles.jobContent}>
                    <View style={styles.jobTopRow}>
                      <View style={styles.jobLeft}>
                        {item.job_number ? (
                          <Text style={styles.jobId}>#{item.job_number}</Text>
                        ) : null}
                        <Text style={styles.jobTitle} numberOfLines={1}>
                          {item.customer_name ?? '—'}
                        </Text>
                        <Text style={styles.jobSub} numberOfLines={1}>{vehicle}</Text>
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
