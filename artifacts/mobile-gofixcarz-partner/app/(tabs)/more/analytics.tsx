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
import { QUERY_KEYS } from '@/src/constants/api';
import { formatCurrency } from '@/src/utils/helpers';
import AnimatedCurrencyText from '@/src/components/ui/AnimatedCurrencyText';
import type { JobResponse } from '@/src/types';

/* ── Tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const INDIGO  = '#6366F1';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
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
  CLOSED:        '#059669',
  CANCELLED:     '#EF4444',
};

/* ── Helpers ── */
function isRealizedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toString().toUpperCase().trim();
  return s === 'DELIVERED' || s.includes('DELIVER');
}

function parseJobDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const ms = val < 10000000000 ? val * 1000 : val;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const str = val.trim();
    if (!str) return null;
    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    const normalizedStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
    let d = new Date(normalizedStr);
    if (!isNaN(d.getTime())) return d;
    d = new Date(str.replace(/-/g, '/'));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function getJobDate(job: JobResponse): Date {
  const statusUpper = (job.status || '').toString().toUpperCase().trim();
  const isDone = isRealizedStatus(statusUpper);
  const rawDate = isDone
    ? (job.completed_at || (job as any).completed_date || job.updated_at || (job as any).updated_date || job.created_at || (job as any).created_date || (job as any).date || (job as any).service_date)
    : (job.created_at || (job as any).created_date || job.updated_at || (job as any).updated_date || (job as any).date);

  const parsed = parseJobDate(rawDate);
  return parsed || new Date();
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  const parsed = parseJobDate(d);
  if (!parsed) return '—';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function jobRevenue(job: JobResponse): number {
  const statusUpper = (job.status || '').toString().toUpperCase().trim();

  // Only COMPLETED or DELIVERED job cards generate total revenue
  if (!isRealizedStatus(statusUpper)) {
    return 0;
  }

  // 1. Calculate sum from services + labour charge (pure sum without GST)
  const servicesSum = job.services?.reduce((sum, item) => {
    const p = parseFloat(String(item.price ?? 0)) || 0;
    const q = parseFloat(String(item.qty ?? 1)) || 1;
    return sum + (p * q);
  }, 0) ?? 0;

  const labourCharge = parseFloat(String(job.labour?.charge ?? (job as any).labour_charge ?? (job as any).labour_total ?? 0)) || 0;
  const itemsTotal = servicesSum + labourCharge;

  if (itemsTotal > 0) {
    return itemsTotal;
  }

  // 2. Billing subtotal (services_total + labour_total) without GST
  const billingSubtotal = parseFloat(String(job.billing?.subtotal ?? (job.billing?.services_total ?? 0) + (job.billing?.labour_total ?? 0))) || 0;
  if (billingSubtotal > 0) {
    return billingSubtotal;
  }

  // 3. Fallback for single amount fields
  const fallbackAmt = parseFloat(String(
    job.estimated_amount ??
    job.final_amount ??
    (job as any).price ??
    (job as any).amount ??
    (job as any).total_amount ??
    0
  )) || 0;

  return fallbackAmt;
}

function getJobValue(job: JobResponse): number {
  if (!job) return 0;
  const servicesSum = job.services?.reduce((sum, item) => {
    const p = parseFloat(String(item.price ?? 0)) || 0;
    const q = parseFloat(String(item.qty ?? 1)) || 1;
    return sum + (p * q);
  }, 0) ?? 0;

  const labourCharge = parseFloat(String(job.labour?.charge ?? (job as any).labour_charge ?? (job as any).labour_total ?? 0)) || 0;
  const itemsTotal = servicesSum + labourCharge;
  if (itemsTotal > 0) return itemsTotal;

  const billingTotal = parseFloat(String(
    job.billing?.grand_total ??
    job.billing?.subtotal ??
    (job.billing?.services_total ?? 0) + (job.billing?.labour_total ?? 0)
  )) || 0;
  if (billingTotal > 0) return billingTotal;

  return parseFloat(String(
    job.estimated_amount ??
    job.final_amount ??
    (job as any).price ??
    (job as any).amount ??
    (job as any).total_amount ??
    0
  )) || 0;
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
    if (period === 'month') {
      const isSameMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      const cutoff30 = new Date(now); cutoff30.setDate(cutoff30.getDate() - 29); cutoff30.setHours(0,0,0,0);
      return isSameMonth || d >= cutoff30;
    }
    if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

interface GraphPoint { label: string; revenue: number; job_count: number; }

function buildGraph(jobs: JobResponse[], period: UIPeriod): GraphPoint[] {
  const now = new Date();

  if (period === 'week') {
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
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    let ws = new Date(firstDay);
    let wn = 1;
    while (ws <= now || wn <= 4) {
      const we = new Date(ws); we.setDate(we.getDate() + 6); we.setHours(23,59,59,999);
      const wj = jobs.filter(j => { const d = getJobDate(j); return d >= ws && d <= we; });
      pts.push({ label: `W${wn}`, revenue: wj.reduce((s, j) => s + jobRevenue(j), 0), job_count: wj.length });
      ws = new Date(ws); ws.setDate(ws.getDate() + 7); wn++;
    }
    return pts;
  }

  if (period === 'year') {
    return Array.from({ length: 12 }, (_, m) => {
      const mj = jobs.filter(j => { const d = getJobDate(j); return d.getFullYear() === now.getFullYear() && d.getMonth() === m; });
      return { label: new Date(now.getFullYear(), m, 1).toLocaleDateString('en-IN', { month: 'short' }), revenue: mj.reduce((s, j) => s + jobRevenue(j), 0), job_count: mj.length };
    });
  }

  // period === 'all'
  const monthsMap = new Map<string, { label: string; revenue: number; job_count: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    monthsMap.set(key, { label, revenue: 0, job_count: 0 });
  }

  for (const j of jobs) {
    const d = getJobDate(j);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthsMap.has(key)) {
      const item = monthsMap.get(key)!;
      item.revenue += jobRevenue(j);
      item.job_count += 1;
    } else {
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      monthsMap.set(key, { label, revenue: jobRevenue(j), job_count: 1 });
    }
  }

  return Array.from(monthsMap.values());
}

/* ── UI sub-components ── */
function SkeletonBlock({ height = 16, width = '100%', radius = 8, style }: {
  height?: number; width?: number | string; radius?: number; style?: object;
}) {
  return <View style={[{ height, width: width as any, borderRadius: radius, backgroundColor: '#E2E8F0' }, style]} />;
}

function SectionCard({ icon, title, iconBg = '#FEE2E2', iconFg = PRIMARY, children }: {
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

function PeriodSelector({ period, setPeriod }: { period: UIPeriod; setPeriod: (p: UIPeriod) => void }) {
  const [wrapWidth, setWrapWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const isInitial = useRef(true);

  const activeIndex = Math.max(0, PERIODS.findIndex(p => p.value === period));
  const innerWidth = wrapWidth > 0 ? wrapWidth - 8 : 0;
  const btnWidth = innerWidth > 0 ? innerWidth / PERIODS.length : 0;

  useEffect(() => {
    if (btnWidth > 0) {
      const targetPos = activeIndex * btnWidth;
      if (isInitial.current) {
        isInitial.current = false;
        translateX.setValue(targetPos);
      } else {
        translateX.stopAnimation();
        Animated.spring(translateX, {
          toValue: targetPos,
          useNativeDriver: true,
          stiffness: 320,
          damping: 28,
          mass: 0.6,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        }).start();
      }
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

export default function MoreAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<UIPeriod>('all');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [refreshing, setRefreshing] = useState(false);

  /* Shared Query key so cache invalidation on job creation immediately updates analytics */
  const { data: jobsData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOBS({}),
    queryFn:  () => JobService.list({}),
    staleTime: 5_000,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const allJobs: JobResponse[] = Array.isArray(jobsData)
    ? jobsData
    : jobsData?.items ?? (jobsData as any)?.jobs ?? (jobsData as any)?.results ?? (jobsData as any)?.data ?? [];
  const jobs     = filterByPeriod(allJobs, period);
  const graphData = buildGraph(jobs, period);
  const maxRev   = graphData.length ? Math.max(...graphData.map(p => p.revenue), 1) : 1;

  const totalRevenue   = jobs.reduce((s, j) => s + jobRevenue(j), 0);
  const totalJobs      = jobs.length;
  
  /* Recent 5 Jobs for quick stats view */
  const recentJobs = [...jobs].sort((a, b) => getJobDate(b).getTime() - getJobDate(a).getTime()).slice(0, 5);
  const recentTotalRev = recentJobs.reduce((s, j) => s + getJobValue(j), 0);
  const recentAvgRev = recentJobs.length > 0 ? recentTotalRev / recentJobs.length : 0;
  
  const completedJobs  = jobs.filter(j => isRealizedStatus(j.status)).length;
  const avgJobValue    = totalJobs > 0 ? totalRevenue / totalJobs : 0;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  const statusCounts: Record<string, number> = {};
  for (const j of jobs) {
    const raw = (j.status || '').toString().toUpperCase().trim();
    const normalizedKey = isRealizedStatus(raw)
      ? 'COMPLETED'
      : (raw === 'IN_PROGRESS' || raw === 'QUALITY_CHECK' ? 'IN_PROGRESS' : raw);
    statusCounts[normalizedKey] = (statusCounts[normalizedKey] ?? 0) + 1;
  }
  const statusEntries   = Object.entries(statusCounts).filter(([, v]) => v > 0);
  const totalFromStatus = statusEntries.reduce((a, [, v]) => a + v, 0);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? 20 : 12) + insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="chevron-left" size={24} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>
            {isLoading ? 'Loading stats…' : `${totalJobs} total jobs (${period})`}
          </Text>
        </View>
        {(isLoading || isRefetching) && <ActivityIndicator size="small" color={PRIMARY} />}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} />}
      >
        {/* Period selector */}
        <PeriodSelector period={period} setPeriod={setPeriod} />

        {/* KPI Row */}
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
              : <AnimatedCurrencyText value={totalRevenue} style={styles.kpiValue} />}
            <Text style={styles.kpiLabel}>Total Revenue</Text>
          </LinearGradient>

          <View style={styles.kpiCol}>
            <View style={[styles.kpiCardSmall, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Feather name="briefcase" size={15} color={SUCCESS} />
              {isLoading
                ? <SkeletonBlock height={16} width={32} radius={5} style={{ marginTop: 2 }} />
                : <Text style={[styles.kpiValueSmall, { color: SUCCESS }]}>{totalJobs}</Text>}
              <Text style={[styles.kpiLabelSmall, { color: '#065F46' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Total Jobs</Text>
            </View>
            <View style={[styles.kpiCardSmall, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Feather name="percent" size={15} color={WARNING} />
              {isLoading
                ? <SkeletonBlock height={16} width={36} radius={5} style={{ marginTop: 2 }} />
                : <Text style={[styles.kpiValueSmall, { color: '#B45309' }]}>{completionRate}%</Text>}
              <Text style={[styles.kpiLabelSmall, { color: '#92400E' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Completion Rate</Text>
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
              <Text style={styles.emptyChartText}>No billing amounts recorded yet</Text>
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

        {/* Summary */}
        <SectionCard icon="calendar" title="Summary" iconBg="#FFF7ED" iconFg="#F97316">
          {isLoading ? (
            <View style={{ gap: 12 }}>{[1,2,3].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}</View>
          ) : (
            <View style={styles.statList}>
              {[
                { label: 'Total Jobs',     value: String(totalJobs),           color: '#F97316' },
                { label: 'Completed',       value: String(completedJobs),       color: SUCCESS   },
                { label: 'Avg Job Value',   value: formatCurrency(avgJobValue), color: PRIMARY   },
                { label: 'Completion Rate', value: `${completionRate}%`,        color: INDIGO    },
              ].map(stat => (
                <View key={stat.label} style={styles.statRow}>
                  <View style={styles.statDotRow}>
                    <View style={[styles.statDot, { backgroundColor: stat.color }]} />
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                </View>
              ))}
              {totalJobs === 0 && (
                <Text style={styles.noDataNote}>No jobs found. Try switching to "All Time".</Text>
              )}
            </View>
          )}
        </SectionCard>

        {/* Jobs by Status */}
        <SectionCard icon="pie-chart" title="Jobs by Status" iconBg="#F5F3FF" iconFg="#C41E3A">
          {isLoading ? (
            <View style={{ gap: 14 }}>{[1,2,3].map(i => <SkeletonBlock key={i} height={12} radius={6} />)}</View>
          ) : statusEntries.length === 0 ? (
            <View style={styles.emptyChart}>
              <Feather name="pie-chart" size={28} color="#CBD5E1" />
              <Text style={styles.emptyChartText}>No jobs for this period</Text>
            </View>
          ) : (
            <View style={styles.statusList}>
              {statusEntries.sort(([, a], [, b]) => b - a).map(([status, count]) => {
                const pct   = totalFromStatus > 0 ? (count / totalFromStatus) * 100 : 0;
                const color = STATUS_COLORS[status] ?? PRIMARY;
                return (
                  <View key={status} style={styles.statusItem}>
                    <View style={styles.statusItemTop}>
                      <View style={styles.statusDotRow}>
                        <View style={[styles.statusDot, { backgroundColor: color }]} />
                        <Text style={styles.statusItemLabel}>
                          {status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                        </Text>
                      </View>
                      <Text style={[styles.statusCount, { color }]}>{count}</Text>
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

        <View style={styles.infoChip}>
          <Feather name="info" size={13} color={PRIMARY} />
          <Text style={styles.infoChipText}>
            {totalJobs} of {allJobs.length} jobs shown. Pull down to refresh.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 }, default: {},
    }),
  },
  pageTitle:    { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
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
  noDataNote: { fontSize: 12, color: MUTED, marginTop: 10, textAlign: 'center' },

  statusList:      { gap: 14 },
  statusItem:      { gap: 8 },
  statusItemTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusDotRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  statusItemLabel: { fontSize: 13, color: TEXT, fontWeight: '500' },
  statusCount:     { fontSize: 13, fontWeight: '700' },
  trackBg:         { height: 6, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  trackFill:       { height: '100%', borderRadius: 4 },

  /* ── Recent Job Cards Stats Redesign ──────────────────────── */
  recentStatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  recentStatItem: { flex: 1, alignItems: 'center' },
  recentStatLabel: { fontSize: 9.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  recentStatValPrimary: { fontSize: 15, fontWeight: '800', color: PRIMARY, marginTop: 2 },
  recentStatValSecondary: { fontSize: 14, fontWeight: '800', color: TEXT, marginTop: 2 },
  recentStatDivider: { width: 1, height: 26, backgroundColor: '#CBD5E1' },

  recentCardList: { gap: 10 },
  jobStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  jobStatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobStatTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  jobStatRegBadge: {
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  jobStatRegText: { fontSize: 11, fontWeight: '800', color: PRIMARY },
  jobStatModelText: { fontSize: 14.5, fontWeight: '800', color: TEXT, flex: 1 },

  jobStatStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 20, borderWidth: 1,
  },
  jobStatStatusDot: { width: 6, height: 6, borderRadius: 3 },
  jobStatStatusText: { fontSize: 10.5, fontWeight: '800' },

  jobStatBody: { gap: 4 },
  jobStatMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobStatCustName: { fontSize: 12, fontWeight: '700', color: '#334155' },
  jobStatDateText: { fontSize: 11, color: MUTED, fontWeight: '500' },
  jobStatServiceText: { fontSize: 12, color: '#475569', fontWeight: '500' },

  jobStatFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 2,
  },
  jobStatBreakdownText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  jobStatAmountWrap: {
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  jobStatAmountText: { fontSize: 14.5, fontWeight: '800', color: '#059669' },

  recentViewAllBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  recentViewAllBarText: { fontSize: 13, fontWeight: '700', color: PRIMARY },

  infoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EFF6FF', borderRadius: 14,
    borderWidth: 1, borderColor: '#BFDBFE', padding: 14,
  },
  infoChipText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },
});
