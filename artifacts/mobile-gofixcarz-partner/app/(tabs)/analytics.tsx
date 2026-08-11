import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, LayoutChangeEvent, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import JobService from '@/src/services/job.service';
import DashboardService from '@/src/services/dashboard.service';
import { QUERY_KEYS } from '@/src/constants/api';
import { formatCurrency, formatDate } from '@/src/utils/helpers';
import type { JobResponse } from '@/src/types';

/* ── Tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const INDIGO  = '#6366F1';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const INFO    = '#3B82F6';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

type UIPeriod = 'all' | 'year' | 'month' | 'week';

const PERIODS: { label: string; value: UIPeriod }[] = [
  { label: 'All',     value: 'all'   },
  { label: 'Yearly',  value: 'year'  },
  { label: 'Monthly', value: 'month' },
  { label: 'Weekly',  value: 'week'  },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN:          '#3B82F6',
  IN_PROGRESS:   '#8B5CF6',
  QUALITY_CHECK: '#6366F1',
  READY:         '#10B981',
  COMPLETED:     '#059669',
  DELIVERED:     '#059669',
  CANCELLED:     '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN:          'Open',
  IN_PROGRESS:   'In Progress',
  QUALITY_CHECK: 'Quality Check',
  READY:         'Ready for Pickup',
  COMPLETED:     'Completed',
  DELIVERED:     'Delivered',
  CANCELLED:     'Cancelled',
};

/* ── Helpers ── */
function getJobDate(job: JobResponse): Date {
  // Revenue recognition date: for completed/delivered/ready jobs, use completed_at or updated_at first.
  // This ensures a job created yesterday but completed today is accounted in TODAY'S revenue, not yesterday's.
  const isDone = job.status === 'COMPLETED' || (job.status as string) === 'DELIVERED' || job.status === 'READY';
  const dateStr = isDone
    ? (job.completed_at || job.updated_at || job.created_at)
    : (job.created_at || job.updated_at);

  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function jobRevenue(job: JobResponse): number {
  // OPEN, IN_PROGRESS, QUALITY_CHECK, and CANCELLED jobs are not realized revenue
  if (
    job.status === 'OPEN' ||
    job.status === 'CANCELLED' ||
    job.status === 'IN_PROGRESS' ||
    job.status === 'QUALITY_CHECK'
  ) {
    return 0;
  }
  const amt = (job as any).billing?.grand_total ?? job.final_amount ?? job.estimated_amount ?? (job as any).price ?? 0;
  return typeof amt === 'number' ? (isNaN(amt) ? 0 : amt) : parseFloat(amt) || 0;
}

function filterByPeriod(allJobs: JobResponse[], period: UIPeriod): JobResponse[] {
  if (period === 'all') return allJobs;
  const now = new Date();
  return allJobs.filter(j => {
    const d = getJobDate(j);
    if (period === 'week') {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 6); cutoff.setHours(0,0,0,0);
      return d >= cutoff;
    }
    if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    return d.getFullYear() === now.getFullYear();
  });
}

interface GraphPoint { label: string; revenue: number; job_count: number; }

function buildGraph(jobs: JobResponse[], period: UIPeriod): GraphPoint[] {
  const now = new Date();
  if (period === 'week' || period === 'all') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now); day.setDate(day.getDate() - (6 - i));
      const dj = jobs.filter(j => {
        const jd = getJobDate(j);
        return jd.getFullYear() === day.getFullYear() &&
               jd.getMonth() === day.getMonth() &&
               jd.getDate() === day.getDate();
      });
      return {
        label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dj.reduce((s, j) => s + jobRevenue(j), 0),
        job_count: dj.length,
      };
    });
  }
  if (period === 'month') {
    const pts: GraphPoint[] = [];
    let ws = new Date(now.getFullYear(), now.getMonth(), 1); let wn = 1;
    while (ws <= now) {
      const we = new Date(ws); we.setDate(we.getDate() + 6); we.setHours(23,59,59,999);
      const wj = jobs.filter(j => { const d = getJobDate(j); return d >= ws && d <= we; });
      pts.push({ label: `W${wn}`, revenue: wj.reduce((s, j) => s + jobRevenue(j), 0), job_count: wj.length });
      ws = new Date(ws); ws.setDate(ws.getDate() + 7); wn++;
    }
    return pts;
  }
  return Array.from({ length: now.getMonth() + 1 }, (_, m) => {
    const mj = jobs.filter(j => { const d = getJobDate(j); return d.getFullYear() === now.getFullYear() && d.getMonth() === m; });
    return { label: new Date(now.getFullYear(), m, 1).toLocaleDateString('en-IN', { month: 'short' }), revenue: mj.reduce((s, j) => s + jobRevenue(j), 0), job_count: mj.length };
  });
}

/* ── UI sub-components ── */
function SkeletonBlock({ height = 16, width = '100%', radius = 8, style }: {
  height?: number; width?: number | string; radius?: number; style?: object;
}) {
  return <View style={[{ height, width: width as any, borderRadius: radius, backgroundColor: '#E2E8F0' }, style]} />;
}

function PeriodSelector({ period, setPeriod }: { period: UIPeriod; setPeriod: (p: UIPeriod) => void }) {
  const [wrapWidth, setWrapWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, PERIODS.findIndex(p => p.value === period));
  const innerWidth = wrapWidth > 0 ? wrapWidth - 8 : 0;
  const btnWidth = innerWidth > 0 ? innerWidth / PERIODS.length : 0;

  useEffect(() => {
    if (btnWidth > 0) {
      Animated.spring(translateX, {
        toValue: activeIndex * btnWidth,
        useNativeDriver: true,
        stiffness: 260,
        damping: 24,
        mass: 0.8,
      }).start();
    }
  }, [activeIndex, btnWidth]);

  return (
    <View
      style={styles.periodWrap}
      onLayout={(e: LayoutChangeEvent) => setWrapWidth(e.nativeEvent.layout.width)}
    >
      {/* ── Animated Sliding Active Pill Background ── */}
      {btnWidth > 0 && (
        <Animated.View
          style={[
            styles.periodActivePill,
            {
              width: btnWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {PERIODS.map(p => {
        const isActive = period === p.value;
        return (
          <TouchableOpacity
            key={p.value}
            style={styles.periodBtn}
            onPress={() => setPeriod(p.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.periodText, isActive && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SectionCard({ icon, title, iconBg = '#EFF6FF', iconFg = PRIMARY, children }: {
  icon: React.ComponentProps<typeof Feather>['name']; title: string;
  iconBg?: string; iconFg?: string; children: React.ReactNode;
}) {
  return (
    <View style={cardSt.card}>
      <View style={cardSt.header}>
        <View style={[cardSt.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={cardSt.title}>{title}</Text>
      </View>
      <View style={cardSt.body}>{children}</View>
    </View>
  );
}

const cardSt = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 }, default: {},
    }),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT },
  body:  { padding: 18 },
});

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<UIPeriod>('all');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  /* Shared Query key so cache invalidation on job creation immediately updates analytics */
  const { data: jobsData, isLoading, isRefetching, refetch: refetchJobs } = useQuery({
    queryKey: QUERY_KEYS.JOBS({}),
    queryFn:  () => JobService.list({}),
    staleTime: 5_000,
  });

  /* Dashboard Query for today/month summary */
  const { data: dashData, refetch: refetchDash } = useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn:  DashboardService.get,
    staleTime: 5_000,
  });

  const refetch = useCallback(() => {
    refetchJobs();
    refetchDash();
  }, [refetchJobs, refetchDash]);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const allJobs   = jobsData?.items ?? [];
  const jobs      = filterByPeriod(allJobs, period);
  const graphData = buildGraph(jobs, period);
  const maxRev    = graphData.length ? Math.max(...graphData.map(p => p.revenue), 1) : 1;

  /* ── Stats Calculations ── */
  const totalRevenue   = jobs.reduce((s, j) => s + jobRevenue(j), 0);
  const totalJobs      = jobs.length;
  const completedJobs  = jobs.filter(j => j.status === 'COMPLETED' || (j.status as string) === 'DELIVERED').length;
  const inProgressJobs = jobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'QUALITY_CHECK').length;
  const openJobs       = jobs.filter(j => j.status === 'OPEN').length;
  const readyJobs      = jobs.filter(j => j.status === 'READY').length;
  const realizedJobsCount = completedJobs + readyJobs;
  const avgJobValue       = realizedJobsCount > 0 ? totalRevenue / realizedJobsCount : (totalJobs > 0 ? totalRevenue / totalJobs : 0);
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  /* Revenue Breakdown (Services vs Labour vs GST) - only for revenue-generating jobs */
  const revenueJobs = jobs.filter(j => jobRevenue(j) > 0);
  const servicesRev = revenueJobs.reduce((s, j) => s + ((j as any).billing?.services_total ?? 0), 0);
  const labourRev   = revenueJobs.reduce((s, j) => s + ((j as any).billing?.labour_total ?? 0), 0);
  const gstRev      = revenueJobs.reduce((s, j) => s + ((j as any).billing?.gst_amount ?? 0), 0);
  const isBillingAvailable = servicesRev > 0 || labourRev > 0 || gstRev > 0;

  /* Status Breakdown */
  const statusCounts: Record<string, number> = {};
  for (const j of jobs) statusCounts[j.status] = (statusCounts[j.status] ?? 0) + 1;
  const statusEntries   = Object.entries(statusCounts).filter(([, v]) => v > 0);
  const totalFromStatus = statusEntries.reduce((a, [, v]) => a + v, 0);

  /* Recent 5 Jobs for quick stats view */
  const recentJobs = [...jobs].sort((a, b) => getJobDate(b).getTime() - getJobDate(a).getTime()).slice(0, 5);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? 20 : 12) + insets.top }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Revenue & Analytics</Text>
          <Text style={styles.pageSubtitle}>
            {isLoading ? 'Loading stats…' : `${allJobs.length} total workshop jobs`}
          </Text>
        </View>
        {(isLoading || isRefetching) && <ActivityIndicator size="small" color={PRIMARY} />}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
      >
        {/* Period selector with sliding pill animation */}
        <PeriodSelector period={period} setPeriod={setPeriod} />

        {/* Primary KPI Row */}
        <View style={styles.kpiRow}>
          <LinearGradient
            colors={['#1E40AF', '#2563EB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.kpiCard, { flex: 1.3 }]}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name="trending-up" size={16} color="#fff" />
            </View>
            {isLoading
              ? <SkeletonBlock height={20} width={80} style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
              : <Text style={styles.kpiValue}>{formatCurrency(totalRevenue)}</Text>}
            <Text style={styles.kpiLabel}>
              {period === 'all' ? 'Total Revenue' : `${PERIODS.find(p => p.value === period)?.label} Revenue`}
            </Text>

            {/* Sub-pills for today */}
            {dashData && (
              <View style={styles.kpiSubRow}>
                <Text style={styles.kpiSubText}>Today: {formatCurrency(dashData.revenue_today ?? 0)}</Text>
              </View>
            )}
          </LinearGradient>

          <View style={styles.kpiCol}>
            <View style={[styles.kpiCardSmall, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Feather name="check-circle" size={15} color={SUCCESS} />
              {isLoading
                ? <SkeletonBlock height={16} width={32} radius={5} style={{ marginTop: 2 }} />
                : <Text style={[styles.kpiValueSmall, { color: SUCCESS }]}>{completedJobs}</Text>}
              <Text style={[styles.kpiLabelSmall, { color: '#065F46' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Completed Jobs</Text>
            </View>

            <View style={[styles.kpiCardSmall, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Feather name="clock" size={15} color={WARNING} />
              {isLoading
                ? <SkeletonBlock height={16} width={36} radius={5} style={{ marginTop: 2 }} />
                : <Text style={[styles.kpiValueSmall, { color: '#B45309' }]}>{inProgressJobs}</Text>}
              <Text style={[styles.kpiLabelSmall, { color: '#92400E' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>In Progress Jobs</Text>
            </View>
          </View>
        </View>

        {/* Revenue Chart */}
        <SectionCard icon="bar-chart-2" title="Revenue Trend">
          {isLoading ? (
            <View style={styles.chartSkeleton}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.chartSkeletonCol}>
                  <SkeletonBlock height={20 + i * 10} width="65%" radius={5} />
                </View>
              ))}
            </View>
          ) : graphData.every(p => p.revenue === 0) ? (
            <View style={styles.emptyChart}>
              <Feather name="bar-chart-2" size={28} color="#CBD5E1" />
              <Text style={styles.emptyChartText}>No revenue recorded for this period</Text>
            </View>
          ) : (
            <View style={styles.chart}>
              {graphData.slice(-10).map((pt, i) => {
                const h = Math.max((pt.revenue / maxRev) * 100, 6);
                const isMax = pt.revenue === maxRev && pt.revenue > 0;
                return (
                  <View key={i} style={styles.barWrap}>
                    {pt.revenue > 0 && (
                      <Text style={styles.barValue}>
                        {pt.revenue >= 1000 ? `${(pt.revenue / 1000).toFixed(0)}k` : String(Math.round(pt.revenue))}
                      </Text>
                    )}
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={isMax ? ['#818CF8', INDIGO] : ['#93C5FD', PRIMARY]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={[styles.bar, { height: h }]}
                      />
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>{pt.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        {/* Detailed Stats Summary */}
        <SectionCard icon="calendar" title="Performance Overview" iconBg="#FFF7ED" iconFg="#F97316">
          {isLoading ? (
            <View style={{ gap: 12 }}>{[1,2,3,4].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}</View>
          ) : (
            <View style={styles.statList}>
              {[
                { label: 'Total Jobs Created', value: String(totalJobs),           color: '#F97316' },
                { label: 'Completed Jobs',     value: String(completedJobs),       color: SUCCESS   },
                { label: 'Active Jobs',        value: String(inProgressJobs + openJobs), color: INFO },
                { label: 'Avg Job Revenue',    value: formatCurrency(avgJobValue), color: PRIMARY   },
                { label: 'Completion Rate',    value: `${completionRate}%`,        color: INDIGO    },
              ].map(stat => (
                <View key={stat.label} style={styles.statRow}>
                  <View style={styles.statDotRow}>
                    <View style={[styles.statDot, { backgroundColor: stat.color }]} />
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        {/* Revenue Breakdown (Services vs Labour vs GST) */}
        {isBillingAvailable && (
          <SectionCard icon="dollar-sign" title="Revenue Breakdown" iconBg="#ECFDF5" iconFg={SUCCESS}>
            <View style={styles.breakdownWrap}>
              {[
                { label: 'Services Revenue', amount: servicesRev, color: '#10B981' },
                { label: 'Labour Charges',   amount: labourRev,   color: '#6366F1' },
                { label: 'GST & Taxes',       amount: gstRev,      color: '#F59E0B' },
              ].map(item => (
                <View key={item.label} style={styles.breakdownItem}>
                  <View style={styles.breakdownTop}>
                    <Text style={styles.breakdownLabel}>{item.label}</Text>
                    <Text style={[styles.breakdownValue, { color: item.color }]}>
                      {formatCurrency(item.amount)}
                    </Text>
                  </View>
                  <View style={styles.trackBg}>
                    <View
                      style={[
                        styles.trackFill,
                        {
                          width: totalRevenue > 0 ? `${Math.min(100, Math.round((item.amount / totalRevenue) * 100))}%` : '0%',
                          backgroundColor: item.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Jobs by Status */}
        <SectionCard icon="pie-chart" title="Jobs by Status" iconBg="#F5F3FF" iconFg="#C41E3A">
          {isLoading ? (
            <View style={{ gap: 14 }}>{[1,2,3].map(i => <SkeletonBlock key={i} height={12} radius={6} />)}</View>
          ) : statusEntries.length === 0 ? (
            <View style={styles.emptyChart}>
              <Feather name="pie-chart" size={28} color="#CBD5E1" />
              <Text style={styles.emptyChartText}>No jobs found for this period</Text>
            </View>
          ) : (
            <View style={styles.statusList}>
              {statusEntries.sort(([, a], [, b]) => b - a).map(([status, count]) => {
                const pct   = totalFromStatus > 0 ? (count / totalFromStatus) * 100 : 0;
                const color = STATUS_COLORS[status] ?? PRIMARY;
                const label = STATUS_LABELS[status] ?? status;
                return (
                  <View key={status} style={styles.statusItem}>
                    <View style={styles.statusItemTop}>
                      <View style={styles.statusDotRow}>
                        <View style={[styles.statusDot, { backgroundColor: color }]} />
                        <Text style={styles.statusItemLabel}>{label}</Text>
                      </View>
                      <Text style={[styles.statusCount, { color }]}>{count} ({Math.round(pct)}%)</Text>
                    </View>
                    <View style={styles.trackBg}>
                      <View style={[styles.trackFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        {/* Recent Activity / Jobs */}
        {recentJobs.length > 0 && (
          <SectionCard icon="file-text" title="Recent Jobs Stats" iconBg="#EFF6FF" iconFg={INFO}>
            <View style={styles.recentList}>
              {recentJobs.map(j => {
                const amount = (j as any).billing?.grand_total ?? j.final_amount ?? j.estimated_amount ?? (j as any).price ?? 0;
                const statusColor = STATUS_COLORS[j.status] ?? PRIMARY;
                const statusLabel = STATUS_LABELS[j.status] ?? j.status;
                const carInfo = [j.brand, j.vehicle_model].filter(Boolean).join(' ') || j.registration_number || 'Vehicle';
                const dateObj = getJobDate(j);
                return (
                  <TouchableOpacity
                    key={j.id}
                    style={styles.recentRow}
                    onPress={() => router.push(`/(tabs)/jobs` as any)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentTitle}>{j.job_number || 'Job'} • {carInfo}</Text>
                      <Text style={styles.recentSub}>{j.customer_name ?? 'Customer'} • {formatDate(dateObj.toISOString())}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={styles.recentAmount}>{formatCurrency(amount)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>
        )}

        <View style={styles.infoChip}>
          <Feather name="info" size={13} color={PRIMARY} />
          <Text style={styles.infoChipText}>
            Showing stats for {jobs.length} of {allJobs.length} total jobs. Pull down to refresh data.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  pageTitle:    { fontSize: 24, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 12, color: MUTED, marginTop: 2 },

  body: { paddingHorizontal: 20 },

  periodWrap: {
    flexDirection: 'row', backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 4, marginBottom: 14,
    position: 'relative',
  },
  periodActivePill: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 36,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  periodBtn:        { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  periodText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  periodTextActive: { fontWeight: '700', color: '#FFFFFF' },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard: {
    borderRadius: 20, padding: 18, gap: 4,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 6 }, default: {},
    }),
  },
  kpiIconWrap:  { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kpiValue:     { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  kpiLabel:     { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  kpiSubRow:    { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  kpiSubText:   { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  kpiCol:       { flex: 1, gap: 10 },
  kpiCardSmall: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, justifyContent: 'center' },
  kpiValueSmall:{ fontSize: 18, fontWeight: '800', marginTop: 4 },
  kpiLabelSmall:{ fontSize: 11.5, fontWeight: '700' },

  chart:            { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 },
  barWrap:          { flex: 1, alignItems: 'center', gap: 3 },
  barValue:         { fontSize: 8, color: MUTED, fontWeight: '600' },
  barTrack:         { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar:              { width: '65%', borderRadius: 5, minHeight: 4 },
  barLabel:         { fontSize: 8, color: MUTED, textAlign: 'center' },
  chartSkeleton:    { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8 },
  chartSkeletonCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  emptyChart:       { height: 80, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText:   { fontSize: 13, color: MUTED, textAlign: 'center' },

  statList: { gap: 2 },
  statRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  statDotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statDot:    { width: 8, height: 8, borderRadius: 4 },
  statLabel:  { fontSize: 13, color: TEXT, fontWeight: '500' },
  statValue:  { fontSize: 14, fontWeight: '800' },

  breakdownWrap: { gap: 14 },
  breakdownItem: { gap: 6 },
  breakdownTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel:{ fontSize: 13, color: TEXT, fontWeight: '500' },
  breakdownValue:{ fontSize: 13, fontWeight: '700' },

  statusList:      { gap: 14 },
  statusItem:      { gap: 8 },
  statusItemTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusDotRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  statusItemLabel: { fontSize: 13, color: TEXT, fontWeight: '500' },
  statusCount:     { fontSize: 13, fontWeight: '700' },
  trackBg:         { height: 6, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  trackFill:       { height: '100%', borderRadius: 4 },

  recentList:  { gap: 12 },
  recentRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  recentTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  recentSub:   { fontSize: 11, color: MUTED, marginTop: 2 },
  recentAmount:{ fontSize: 13, fontWeight: '700', color: TEXT },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  infoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 14,
    borderWidth: 1, borderColor: '#BFDBFE', padding: 14,
  },
  infoChipText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },
});
