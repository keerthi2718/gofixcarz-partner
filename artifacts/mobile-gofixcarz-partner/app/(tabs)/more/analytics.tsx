import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import AnalyticsService from '@/src/services/analytics.service';
import { formatCurrency } from '@/src/utils/helpers';
import type { AnalyticsPeriod } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const INDIGO  = '#6366F1';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Daily',   value: 'week'  },
  { label: 'Monthly', value: 'month' },
  { label: 'Yearly',  value: 'year'  },
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

function SkeletonBlock({ height = 16, width = '100%', radius = 8, style }: {
  height?: number; width?: number | string; radius?: number; style?: object;
}) {
  return (
    <View style={[{ height, width: width as any, borderRadius: radius, backgroundColor: '#E2E8F0' }, style]} />
  );
}

function SectionCard({ icon, title, iconBg = '#FEE2E2', iconFg = PRIMARY, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  iconBg?: string;
  iconFg?: string;
  children: React.ReactNode;
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
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 14,
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

export default function MoreAnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.ANALYTICS(period),
    queryFn:  () => AnalyticsService.get({ period }),
    retry: 1,
    staleTime: 1000 * 60 * 2,
  });

  /* Safe derived values */
  const totalRevenue  = data?.total_revenue ?? 0;
  const totalJobs     = data?.total_jobs    ?? 0;
  const graphData     = Array.isArray(data?.graph_data) ? data!.graph_data : [];
  const statusCounts  = data?.status_counts ?? {};
  const maxRev        = graphData.length > 0 ? Math.max(...graphData.map(p => p.revenue ?? 0), 1) : 1;
  const statusEntries = Object.entries(statusCounts).filter(([, v]) => (v ?? 0) > 0);
  const totalFromStatus = statusEntries.reduce((acc, [, v]) => acc + (v ?? 0), 0);
  const completedJobs  = statusCounts.COMPLETED ?? 0;
  const avgJobValue    = totalJobs > 0 ? totalRevenue / totalJobs : 0;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Revenue & Analytics</Text>
          <Text style={styles.pageSubtitle}>Performance overview</Text>
        </View>
        {(isLoading || isRefetching) && (
          <ActivityIndicator size="small" color={PRIMARY} />
        )}
      </View>

      {/* ── Error banner ── */}
      {error && !isLoading && (
        <View style={styles.errorBanner}>
          <Feather name="wifi-off" size={13} color="#B45309" />
          <Text style={styles.errorText}>Couldn't load live data.</Text>
          <TouchableOpacity onPress={() => refetch()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
      >
        {/* Period selector */}
        <View style={styles.periodWrap}>
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

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <LinearGradient
            colors={['#921527', '#C41E3A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.kpiCard, { flex: 1.3 }]}
          >
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Feather name="trending-up" size={16} color="#fff" />
            </View>
            {isLoading
              ? <SkeletonBlock height={20} width={80} style={{ marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              : <Text style={styles.kpiValue}>{formatCurrency(totalRevenue)}</Text>
            }
            <Text style={styles.kpiLabel}>Total Revenue</Text>
          </LinearGradient>

          <View style={styles.kpiCol}>
            <View style={[styles.kpiCardSmall, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
              <Feather name="briefcase" size={14} color={SUCCESS} />
              {isLoading
                ? <SkeletonBlock height={16} width={32} radius={5} style={{ marginTop: 2 }} />
                : <Text style={[styles.kpiValueSmall, { color: SUCCESS }]}>{totalJobs}</Text>
              }
              <Text style={[styles.kpiLabelSmall, { color: '#064E3B' }]}>Jobs</Text>
            </View>
            <View style={[styles.kpiCardSmall, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
              <Feather name="percent" size={14} color={WARNING} />
              {isLoading
                ? <SkeletonBlock height={16} width={36} radius={5} style={{ marginTop: 2 }} />
                : <Text style={[styles.kpiValueSmall, { color: '#B45309' }]}>{completionRate}%</Text>
              }
              <Text style={[styles.kpiLabelSmall, { color: '#92400E' }]}>Done</Text>
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
          ) : graphData.length === 0 ? (
            <View style={styles.emptyChart}>
              <Feather name="bar-chart-2" size={28} color="#CBD5E1" />
              <Text style={styles.emptyChartText}>No revenue data for this period</Text>
            </View>
          ) : (
            <View style={styles.chart}>
              {graphData.slice(-10).map((pt, i) => {
                const h     = Math.max(((pt.revenue ?? 0) / maxRev) * 100, 6);
                const isMax = (pt.revenue ?? 0) === maxRev;
                return (
                  <View key={i} style={styles.barWrap}>
                    {(pt.revenue ?? 0) > 0 && (
                      <Text style={styles.barValue}>
                        {(pt.revenue ?? 0) >= 1000
                          ? `${((pt.revenue ?? 0) / 1000).toFixed(0)}k`
                          : String(Math.round(pt.revenue ?? 0))}
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

        {/* Booking Statistics */}
        <SectionCard icon="calendar" title="Booking Statistics" iconBg="#FFF7ED" iconFg="#F97316">
          {isLoading ? (
            <View style={{ gap: 12 }}>
              {[1,2,3].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}
            </View>
          ) : (
            <View style={styles.statList}>
              {[
                { label: 'Total Bookings',   value: String(totalJobs),               color: '#F97316' },
                { label: 'Completed',         value: String(completedJobs),           color: SUCCESS   },
                { label: 'Avg Job Value',     value: formatCurrency(avgJobValue),     color: PRIMARY   },
                { label: 'Completion Rate',   value: `${completionRate}%`,            color: INDIGO    },
              ].map(s => (
                <View key={s.label} style={styles.statRow}>
                  <View style={styles.statDotRow}>
                    <View style={[styles.statDot, { backgroundColor: s.color }]} />
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                </View>
              ))}
              {totalJobs === 0 && (
                <Text style={styles.noDataNote}>No booking data for this period.</Text>
              )}
            </View>
          )}
        </SectionCard>

        {/* Jobs by Status */}
        <SectionCard icon="pie-chart" title="Jobs by Status" iconBg="#F5F3FF" iconFg="#C41E3A">
          {isLoading ? (
            <View style={{ gap: 14 }}>
              {[1,2,3].map(i => <SkeletonBlock key={i} height={12} radius={6} />)}
            </View>
          ) : statusEntries.length === 0 ? (
            <View style={styles.emptyChart}>
              <Feather name="pie-chart" size={28} color="#CBD5E1" />
              <Text style={styles.emptyChartText}>No job status data for this period</Text>
            </View>
          ) : (
            <View style={styles.statusList}>
              {statusEntries
                .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
                .map(([status, count]) => {
                  const pct   = totalFromStatus > 0 ? ((count ?? 0) / totalFromStatus) * 100 : 0;
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

        {/* Service Performance */}
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
              <Text style={styles.comingSoonNote}>Detailed service breakdown coming soon.</Text>
            </View>
          )}
        </SectionCard>

        {/* Technician Performance */}
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
              <Text style={styles.comingSoonNote}>Technician analytics coming soon.</Text>
            </View>
          )}
        </SectionCard>

        {/* Customer Insights */}
        <SectionCard icon="user-check" title="Customer Insights" iconBg="#FEE2E2" iconFg={INDIGO}>
          {isLoading ? (
            <View style={{ gap: 12 }}>
              {[1,2,3].map(i => <SkeletonBlock key={i} height={14} radius={7} />)}
            </View>
          ) : (
            <View>
              <NoDataRow label="Total Customers" />
              <NoDataRow label="Repeat Customers" />
              <NoDataRow label="Avg Revenue / Customer" />
              <Text style={styles.comingSoonNote}>Customer analytics coming soon.</Text>
            </View>
          )}
        </SectionCard>

        <View style={styles.infoChip}>
          <Feather name="info" size={13} color={PRIMARY} />
          <Text style={styles.infoChipText}>
            Showing data for the selected {period}. Pull down to refresh.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 12,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pageTitle:    { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  pageSubtitle: { fontSize: 12, color: MUTED, marginTop: 2 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A',
    marginHorizontal: 20, marginBottom: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 12, color: '#B45309' },
  retryText: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  body: { paddingHorizontal: 20 },

  periodWrap: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 4, gap: 4, marginBottom: 14,
  },
  periodBtn:        { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  periodBtnActive:  { backgroundColor: PRIMARY },
  periodText:       { fontSize: 13, fontWeight: '700', color: MUTED },
  periodTextActive: { color: '#fff' },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard: {
    borderRadius: 20, padding: 18, gap: 4,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  kpiIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  kpiValue:       { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  kpiLabel:       { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  kpiCol:         { flex: 1, gap: 10 },
  kpiCardSmall:   { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, gap: 2 },
  kpiValueSmall:  { fontSize: 16, fontWeight: '800' },
  kpiLabelSmall:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 },
  barWrap: { flex: 1, alignItems: 'center', gap: 3 },
  barValue: { fontSize: 8, color: MUTED, fontWeight: '600' },
  barTrack: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar:      { width: '65%', borderRadius: 5, minHeight: 4 },
  barLabel: { fontSize: 8, color: MUTED, textAlign: 'center' },

  chartSkeleton:    { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 8 },
  chartSkeletonCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  emptyChart: { height: 80, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText: { fontSize: 13, color: MUTED, textAlign: 'center' },

  statList: { gap: 2 },
  statRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  statDotRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statDot:    { width: 8, height: 8, borderRadius: 4 },
  statLabel:  { fontSize: 13, color: TEXT, fontWeight: '500' },
  statValue:  { fontSize: 14, fontWeight: '800' },
  noDataNote: { fontSize: 12, color: MUTED, marginTop: 10, textAlign: 'center' },

  statusList: { gap: 14 },
  statusItem: { gap: 8 },
  statusItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusDotRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  statusItemLabel: { fontSize: 13, color: TEXT, fontWeight: '500', textTransform: 'capitalize' },
  statusCount:   { fontSize: 13, fontWeight: '700' },
  trackBg:       { height: 6, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  trackFill:     { height: '100%', borderRadius: 4 },

  infoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
    padding: 14,
  },
  infoChipText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },

  comingSoonNote: {
    fontSize: 11, color: '#94A3B8', textAlign: 'center',
    marginTop: 10, fontStyle: 'italic',
  },
});
