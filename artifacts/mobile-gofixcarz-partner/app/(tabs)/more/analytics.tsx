import React, { useState } from 'react';
import {
  Platform, RefreshControl, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import AnalyticsService from '@/src/services/analytics.service';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency } from '@/src/utils/helpers';
import type { AnalyticsPeriod } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'Year',  value: 'year'  },
];

const STATUS_COLORS: Record<string, string> = {
  completed:   '#10B981',
  in_progress: '#2563EB',
  pending:     '#F59E0B',
  cancelled:   '#EF4444',
  rejected:    '#8B5CF6',
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status] ?? '#64748B';
}

function SectionCard({ icon, title, iconBg = '#EEF2FF', iconFg = PRIMARY, children }: {
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
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 14, fontWeight: '700', color: TEXT },
  body:     { padding: 18 },
});

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.ANALYTICS(period),
    queryFn:  () => AnalyticsService.get({ period }),
  });

  const maxRevenue    = Math.max(...(data?.graph_data?.map(p => p.revenue) ?? [1]), 1);
  const statusEntries = Object.entries(data?.status_counts ?? {}).filter(([, v]) => (v ?? 0) > 0);
  const totalJobs     = statusEntries.reduce((acc, [, v]) => acc + (v ?? 0), 0);

  const avgJobValue = (data?.total_jobs ?? 0) > 0
    ? (data?.total_revenue ?? 0) / (data?.total_jobs ?? 1)
    : 0;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Analytics</Text>
        <View style={{ width: 42 }} />
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
        >
          {/* ── Period selector ── */}
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

          {/* ── KPI Row ── */}
          <View style={styles.kpiRow}>
            <LinearGradient
              colors={['#4F46E5', '#2563EB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.kpiCard, { flex: 1.3 }]}
            >
              <View style={styles.kpiIconWrap}>
                <Feather name="trending-up" size={16} color="rgba(255,255,255,0.8)" />
              </View>
              <Text style={styles.kpiValue}>{formatCurrency(data?.total_revenue ?? 0)}</Text>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
            </LinearGradient>

            <View style={styles.kpiCol}>
              <View style={[styles.kpiCardSmall, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <Feather name="tool" size={14} color="#10B981" />
                <Text style={[styles.kpiValueSmall, { color: '#10B981' }]}>{data?.total_jobs ?? 0}</Text>
                <Text style={[styles.kpiLabelSmall, { color: '#064E3B' }]}>Jobs</Text>
              </View>
              <View style={[styles.kpiCardSmall, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Feather name="bar-chart-2" size={14} color="#F59E0B" />
                <Text style={[styles.kpiValueSmall, { color: '#B45309' }]}>{formatCurrency(avgJobValue)}</Text>
                <Text style={[styles.kpiLabelSmall, { color: '#92400E' }]}>Avg Job</Text>
              </View>
            </View>
          </View>

          {/* ── Revenue Chart ── */}
          {(data?.graph_data?.length ?? 0) > 0 && (
            <SectionCard icon="bar-chart-2" title="Revenue Trend" iconBg="#EEF2FF" iconFg={PRIMARY}>
              <View style={styles.chart}>
                {data!.graph_data.slice(-12).map((point, i) => {
                  const h = (point.revenue / maxRevenue) * 100;
                  return (
                    <View key={i} style={styles.barWrap}>
                      {point.revenue > 0 && (
                        <Text style={styles.barValue}>
                          {point.revenue >= 1000
                            ? `${(point.revenue / 1000).toFixed(0)}k`
                            : String(Math.round(point.revenue))}
                        </Text>
                      )}
                      <View style={styles.barTrack}>
                        <LinearGradient
                          colors={['#818CF8', PRIMARY]}
                          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                          style={[styles.bar, { height: Math.max(h, 4) }]}
                        />
                      </View>
                      <Text style={styles.barLabel} numberOfLines={1}>{point.label}</Text>
                    </View>
                  );
                })}
              </View>
            </SectionCard>
          )}

          {/* ── Jobs by Status ── */}
          {statusEntries.length > 0 && (
            <SectionCard icon="pie-chart" title="Jobs by Status" iconBg="#F5F3FF" iconFg="#7C3AED">
              <View style={styles.statusList}>
                {statusEntries
                  .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
                  .map(([status, count]) => {
                    const pct = totalJobs > 0 ? ((count ?? 0) / totalJobs) * 100 : 0;
                    const color = getStatusColor(status);
                    const label = status.replace(/_/g, ' ');
                    return (
                      <View key={status} style={styles.statusRow}>
                        <View style={styles.statusLabelRow}>
                          <View style={[styles.statusDot, { backgroundColor: color }]} />
                          <Text style={styles.statusLabel}>{label}</Text>
                        </View>
                        <View style={styles.statusBarBg}>
                          <View style={[styles.statusBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                        </View>
                        <Text style={[styles.statusCount, { color }]}>{count}</Text>
                      </View>
                    );
                  })}
              </View>
            </SectionCard>
          )}

          {/* ── Summary info chip ── */}
          <View style={styles.infoChip}>
            <Feather name="info" size={13} color={PRIMARY} />
            <Text style={styles.infoChipText}>
              Showing data for the selected {period}. Pull down to refresh.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
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
  pageTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: TEXT },

  body: { paddingHorizontal: 20 },

  /* Period selector */
  periodWrap: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 4, gap: 4, marginBottom: 16,
  },
  periodBtn: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  periodBtnActive: { backgroundColor: PRIMARY },
  periodText: { fontSize: 13, fontWeight: '700', color: MUTED },
  periodTextActive: { color: '#fff' },

  /* KPI row */
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard: {
    borderRadius: 20, padding: 18, gap: 6,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  kpiIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  kpiCol: { flex: 1, gap: 10 },
  kpiCardSmall: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    padding: 14, gap: 4, alignItems: 'flex-start',
  },
  kpiValueSmall: { fontSize: 16, fontWeight: '800' },
  kpiLabelSmall: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  /* Chart */
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130 },
  barWrap: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 8, color: MUTED, fontWeight: '600' },
  barTrack: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '65%', borderRadius: 5, minHeight: 4 },
  barLabel: { fontSize: 8, color: MUTED, textAlign: 'center', fontWeight: '500' },

  /* Status breakdown */
  statusList: { gap: 14 },
  statusRow:  { gap: 6 },
  statusLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusLabel: {
    fontSize: 12, fontWeight: '600', color: TEXT,
    flex: 1, textTransform: 'capitalize',
  },
  statusBarBg: {
    height: 8, backgroundColor: '#F1F5F9',
    borderRadius: 4, overflow: 'hidden',
  },
  statusBarFill: { height: '100%', borderRadius: 4 },
  statusCount:   { fontSize: 12, fontWeight: '800', textAlign: 'right' },

  /* Info chip */
  infoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
    padding: 14, marginBottom: 14,
  },
  infoChipText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },
});
