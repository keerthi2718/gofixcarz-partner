import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import AnalyticsService from '@/src/services/analytics.service';
import { formatCurrency } from '@/src/utils/helpers';
import type { AnalyticsPeriod } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const INDIGO  = '#6366F1';
const PURPLE  = '#7C3AED';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'Year',  value: 'year'  },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN:              '#3B82F6',
  IN_PROGRESS:       '#8B5CF6',
  WAITING_FOR_PARTS: '#F59E0B',
  QUALITY_CHECK:     '#6366F1',
  READY:             '#10B981',
  COMPLETED:         '#059669',
  CANCELLED:         '#EF4444',
};

/* ── Skeleton block ── */
function SkeletonBlock({ height = 16, width = '100%', radius = 8, style }: {
  height?: number; width?: number | string; radius?: number; style?: object;
}) {
  return (
    <View style={[{ height, width: width as any, borderRadius: radius, backgroundColor: '#E2E8F0' }, style]} />
  );
}

/* ── Section card wrapper ── */
function SectionCard({ icon, title, iconBg = '#EEF2FF', iconFg = PRIMARY, children, action }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  iconBg?: string;
  iconFg?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <View style={cardSt.card}>
      <View style={cardSt.header}>
        <View style={[cardSt.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={cardSt.title}>{title}</Text>
        {action}
      </View>
      <View style={cardSt.body}>{children}</View>
    </View>
  );
}
const cardSt = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title:    { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT },
  body:     { padding: 18 },
});

/* ── Placeholder "no data" row ── */
function NoDataRow({ label }: { label: string }) {
  return (
    <View style={ph.row}>
      <View style={ph.dot} />
      <Text style={ph.label}>{label}</Text>
      <Text style={ph.value}>—</Text>
    </View>
  );
}
const ph = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
           borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  dot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  label: { flex: 1, fontSize: 13, color: MUTED },
  value: { fontSize: 13, fontWeight: '700', color: MUTED },
});

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.ANALYTICS(period),
    queryFn:  () => AnalyticsService.get({ period }),
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });

  /* Safe derived values — never throw regardless of data shape */
  const totalRevenue  = data?.total_revenue  ?? 0;
  const totalJobs     = data?.total_jobs     ?? 0;
  const graphData     = Array.isArray(data?.graph_data)   ? data!.graph_data   : [];
  const statusCounts  = data?.status_counts  ?? {};
  const maxRev        = graphData.length > 0 ? Math.max(...graphData.map(p => p.revenue ?? 0), 1) : 1;
  const statusEntries = Object.entries(statusCounts).filter(([, v]) => (v ?? 0) > 0);
  const totalJobsFromStatus = statusEntries.reduce((acc, [, v]) => acc + (v ?? 0), 0);
  const avgJobValue   = totalJobs > 0 ? totalRevenue / totalJobs : 0;
  const completedJobs = (statusCounts.COMPLETED ?? 0);
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Page header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>Performance overview</Text>
        </View>
        {(isLoading || isRefetching) && (
          <ActivityIndicator size="small" color={PRIMARY} style={{ marginBottom: 6 }} />
        )}
      </View>

      {/* ── Inline API error banner ── */}
      {error && !isLoading && (
        <View style={styles.errorBanner}>
          <Feather name="wifi-off" size={14} color="#B45309" />
          <Text style={styles.errorText}>Couldn't load live data — showing last known values.</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
        }
      >
        {/* ── Period toggle ── */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
              onPress={() => setPeriod(p.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Revenue summary ── */}
        <View style={styles.heroRow}>
          <LinearGradient
            colors={['#4F46E5', '#2563EB']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroBubble} />
            <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name="trending-up" size={18} color="#fff" />
            </View>
            {isLoading
              ? <SkeletonBlock height={22} width={90} style={{ marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              : <Text style={styles.heroValue}>{formatCurrency(totalRevenue)}</Text>
            }
            <Text style={styles.heroLabel}>Total Revenue</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#7C3AED', '#6366F1']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroBubble} />
            <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name="briefcase" size={18} color="#fff" />
            </View>
            {isLoading
              ? <SkeletonBlock height={22} width={50} style={{ marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              : <Text style={styles.heroValue}>{totalJobs}</Text>
            }
            <Text style={styles.heroLabel}>Total Jobs</Text>
          </LinearGradient>
        </View>

        {/* ── Key metrics row ── */}
        <View style={styles.metricsRow}>
          {[
            { label: 'Avg Job Value', value: isLoading ? null : formatCurrency(avgJobValue),  icon: 'dollar-sign', bg: '#FFFBEB', fg: WARNING },
            { label: 'Completion',    value: isLoading ? null : `${completionRate}%`,           icon: 'check-circle', bg: '#ECFDF5', fg: SUCCESS },
            { label: 'Completed',     value: isLoading ? null : String(completedJobs),          icon: 'award',        bg: '#EEF2FF', fg: PRIMARY },
          ].map(m => (
            <View key={m.label} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: m.bg }]}>
                <Feather name={m.icon as any} size={14} color={m.fg} />
              </View>
              {m.value === null
                ? <SkeletonBlock height={18} width={44} radius={6} style={{ marginBottom: 4 }} />
                : <Text style={[styles.metricValue, { color: m.fg }]}>{m.value}</Text>
              }
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Revenue chart ── */}
        <SectionCard icon="bar-chart-2" title="Revenue Trend">
          {isLoading ? (
            <View style={styles.chartSkeleton}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View key={i} style={styles.chartSkeletonCol}>
                  <SkeletonBlock height={20 + i * 12} width="65%" radius={5} />
                </View>
              ))}
            </View>
          ) : graphData.length === 0 ? (
            <View style={styles.emptyChart}>
              <Feather name="bar-chart-2" size={30} color="#CBD5E1" />
              <Text style={styles.emptyChartText}>No revenue data for this period</Text>
            </View>
          ) : (
            <View style={styles.chart}>
              {graphData.slice(-10).map((pt, i) => {
                const h = Math.max(((pt.revenue ?? 0) / maxRev) * 110, 6);
                const isMax = (pt.revenue ?? 0) === maxRev;
                return (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barValueLabel} numberOfLines={1}>
                      {(pt.revenue ?? 0) >= 1000
                        ? `${((pt.revenue ?? 0) / 1000).toFixed(0)}k`
                        : String(Math.round(pt.revenue ?? 0))}
                    </Text>
                    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                      <View style={[styles.bar, { height: h, backgroundColor: isMax ? INDIGO : PRIMARY, opacity: isMax ? 1 : 0.55 }]} />
                    </View>
                    <Text style={styles.barLabel} numberOfLines={1}>{pt.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        {/* ── Booking statistics ── */}
        <SectionCard icon="calendar" title="Booking Statistics" iconBg="#FFF7ED" iconFg="#F97316">
          {isLoading ? (
            <View style={{ gap: 12 }}>
              {[1,2,3].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}
            </View>
          ) : (
            <View style={styles.statList}>
              <View style={styles.statRow}>
                <View style={styles.statDotRow}>
                  <View style={[styles.statDot, { backgroundColor: '#F97316' }]} />
                  <Text style={styles.statLabel}>Total Bookings Received</Text>
                </View>
                <Text style={[styles.statValue, { color: '#F97316' }]}>{totalJobs}</Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statDotRow}>
                  <View style={[styles.statDot, { backgroundColor: SUCCESS }]} />
                  <Text style={styles.statLabel}>Successfully Converted</Text>
                </View>
                <Text style={[styles.statValue, { color: SUCCESS }]}>{completedJobs}</Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statDotRow}>
                  <View style={[styles.statDot, { backgroundColor: PRIMARY }]} />
                  <Text style={styles.statLabel}>Conversion Rate</Text>
                </View>
                <Text style={[styles.statValue, { color: PRIMARY }]}>{completionRate}%</Text>
              </View>
              {totalJobs === 0 && (
                <Text style={styles.noDataNote}>No booking data available for this period.</Text>
              )}
            </View>
          )}
        </SectionCard>

        {/* ── Jobs by status ── */}
        {(isLoading || statusEntries.length > 0) && (
          <SectionCard icon="pie-chart" title="Jobs by Status" iconBg="#F5F3FF" iconFg={PURPLE}>
            {isLoading ? (
              <View style={{ gap: 14 }}>
                {[1,2,3].map(i => <SkeletonBlock key={i} height={12} radius={6} />)}
              </View>
            ) : (
              <View style={styles.statusList}>
                {statusEntries
                  .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
                  .map(([status, count]) => {
                    const pct   = totalJobsFromStatus > 0 ? ((count ?? 0) / totalJobsFromStatus) * 100 : 0;
                    const color = STATUS_COLORS[status] ?? PRIMARY;
                    return (
                      <View key={status} style={styles.statusItem}>
                        <View style={styles.statusItemTop}>
                          <View style={styles.statusDotRow}>
                            <View style={[styles.statusDot, { backgroundColor: color }]} />
                            <Text style={styles.statusItemLabel}>{status.replace(/_/g, ' ')}</Text>
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
        )}

        {/* ── Service performance ── */}
        <SectionCard icon="tool" title="Service Performance" iconBg="#F0FDF4" iconFg={SUCCESS}>
          {isLoading ? (
            <View style={{ gap: 12 }}>
              {[1,2,3].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}
            </View>
          ) : (
            <View>
              <NoDataRow label="Most Popular Service" />
              <NoDataRow label="Avg Service Duration" />
              <NoDataRow label="Services This Period" />
              <Text style={styles.comingSoonNote}>
                Detailed service breakdown coming soon.
              </Text>
            </View>
          )}
        </SectionCard>

        {/* ── Technician performance ── */}
        <SectionCard icon="users" title="Technician Performance" iconBg="#FFFBEB" iconFg={WARNING}>
          {isLoading ? (
            <View style={{ gap: 12 }}>
              {[1,2].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}
            </View>
          ) : (
            <View>
              <NoDataRow label="Top Technician" />
              <NoDataRow label="Jobs Assigned" />
              <NoDataRow label="Avg Resolution Time" />
              <Text style={styles.comingSoonNote}>
                Technician analytics coming soon.
              </Text>
            </View>
          )}
        </SectionCard>

        {/* ── Customer insights ── */}
        <SectionCard icon="user-check" title="Customer Insights" iconBg="#EEF2FF" iconFg={INDIGO}>
          {isLoading ? (
            <View style={{ gap: 12 }}>
              {[1,2,3].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}
            </View>
          ) : (
            <View>
              <NoDataRow label="Total Customers" />
              <NoDataRow label="Repeat Customers" />
              <NoDataRow label="Avg Revenue / Customer" />
              <Text style={styles.comingSoonNote}>
                Customer analytics coming soon.
              </Text>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: MUTED, marginTop: 2 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A',
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText:  { flex: 1, fontSize: 12, color: '#B45309' },
  retryText:  { fontSize: 12, fontWeight: '700', color: PRIMARY },

  body: { paddingHorizontal: 20, gap: 14 },

  /* Period toggle */
  periodRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 4, gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  periodBtn:        { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  periodBtnActive:  { backgroundColor: PRIMARY },
  periodText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  periodTextActive: { color: '#fff' },

  /* Hero KPI row */
  heroRow: { flexDirection: 'row', gap: 12 },
  heroCard: {
    flex: 1, borderRadius: 20, padding: 18, overflow: 'hidden', minHeight: 130,
    justifyContent: 'flex-end',
    ...Platform.select({
      ios: { shadowColor: INDIGO, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  heroBubble: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroValue: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  heroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  /* Key metric cards */
  metricsRow:   { flexDirection: 'row', gap: 10 },
  metricCard: {
    flex: 1, backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 4, alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  metricIcon:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  metricValue: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  metricLabel: { fontSize: 10, color: MUTED, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },

  /* Chart */
  chart: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 150, gap: 4,
  },
  barCol:         { flex: 1, alignItems: 'center', height: '100%' as any, gap: 4 },
  barValueLabel:  { fontSize: 9, color: MUTED },
  bar:            { width: '80%', borderRadius: 6 },
  barLabel:       { fontSize: 9, color: MUTED },

  chartSkeleton:    { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 8 },
  chartSkeletonCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },

  emptyChart: {
    height: 100, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  emptyChartText: { fontSize: 13, color: MUTED, textAlign: 'center' },

  /* Stat list */
  statList: { gap: 2 },
  statRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  statDotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statDot:    { width: 8, height: 8, borderRadius: 4 },
  statLabel:  { fontSize: 13, color: TEXT, fontWeight: '500' },
  statValue:  { fontSize: 14, fontWeight: '800' },
  noDataNote: { fontSize: 12, color: MUTED, marginTop: 10, textAlign: 'center' },

  /* Status */
  statusList: { gap: 14 },
  statusItem: { gap: 8 },
  statusItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusDotRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  statusItemLabel: { fontSize: 13, color: TEXT, fontWeight: '500', textTransform: 'capitalize' },
  statusCount:   { fontSize: 13, fontWeight: '700' },
  trackBg:       { height: 6, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  trackFill:     { height: '100%', borderRadius: 4 },

  comingSoonNote: {
    fontSize: 11, color: '#94A3B8', textAlign: 'center',
    marginTop: 10, fontStyle: 'italic',
  },
});
