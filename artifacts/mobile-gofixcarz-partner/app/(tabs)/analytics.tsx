import React, { useState } from 'react';
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import AnalyticsService from '@/src/services/analytics.service';
import { formatCurrency } from '@/src/utils/helpers';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { AnalyticsPeriod } from '@/src/types';

/* ── Design tokens ── */
const BG     = '#EEEEF6';
const CARD   = '#FFFFFF';
const PRIMARY = '#2563EB';
const INDIGO  = '#6366F1';
const PURPLE  = '#7C3AED';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Week',  value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year',  value: 'year' },
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

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.ANALYTICS(period),
    queryFn:  () => AnalyticsService.get({ period }),
  });

  const maxRev       = Math.max(...(data?.graph_data?.map(p => p.revenue) ?? [1]), 1);
  const statusEntries = Object.entries(data?.status_counts ?? {}).filter(([, v]) => (v ?? 0) > 0);
  const totalJobs    = statusEntries.reduce((acc, [, v]) => acc + (v ?? 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Page header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSubtitle}>Performance overview</Text>
        </View>
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
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

          {/* ── Hero KPI cards ── */}
          <View style={styles.heroRow}>
            {/* Revenue card */}
            <LinearGradient
              colors={['#4F46E5', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroCardCircle} />
              <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Feather name="trending-up" size={18} color="#fff" />
              </View>
              <Text style={styles.heroCardValue}>{formatCurrency(data?.total_revenue ?? 0)}</Text>
              <Text style={styles.heroCardLabel}>Total Revenue</Text>
            </LinearGradient>

            {/* Jobs card */}
            <LinearGradient
              colors={['#7C3AED', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroCardCircle} />
              <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Feather name="briefcase" size={18} color="#fff" />
              </View>
              <Text style={styles.heroCardValue}>{data?.total_jobs ?? 0}</Text>
              <Text style={styles.heroCardLabel}>Total Jobs</Text>
            </LinearGradient>
          </View>

          {/* ── Revenue chart ── */}
          {data?.graph_data?.length ? (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View style={styles.chartIconWrap}>
                  <Feather name="bar-chart-2" size={15} color={PRIMARY} />
                </View>
                <Text style={styles.chartTitle}>Revenue Trend</Text>
              </View>

              <View style={styles.chart}>
                {data.graph_data.slice(-10).map((pt, i) => {
                  const h = Math.max((pt.revenue / maxRev) * 110, 6);
                  const isMax = pt.revenue === Math.max(...data.graph_data!.map(d => d.revenue));
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barValueLabel} numberOfLines={1}>
                        {pt.revenue >= 1000
                          ? `${(pt.revenue / 1000).toFixed(0)}k`
                          : String(Math.round(pt.revenue))}
                      </Text>
                      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: h,
                              backgroundColor: isMax ? INDIGO : PRIMARY,
                              opacity: isMax ? 1 : 0.55,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel} numberOfLines={1}>{pt.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ── Status breakdown ── */}
          {statusEntries.length ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Feather name="pie-chart" size={15} color={PURPLE} />
                </View>
                <Text style={styles.sectionTitle}>Jobs by Status</Text>
              </View>
              <View style={styles.sectionBody}>
                {statusEntries.map(([status, count]) => {
                  const pct   = totalJobs > 0 ? ((count ?? 0) / totalJobs) * 100 : 0;
                  const color = STATUS_COLORS[status] ?? PRIMARY;
                  return (
                    <View key={status} style={styles.statusItem}>
                      <View style={styles.statusItemTop}>
                        <View style={styles.statusDotRow}>
                          <View style={[styles.statusDot, { backgroundColor: color }]} />
                          <Text style={styles.statusItemLabel}>
                            {status.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <Text style={[styles.statusCount, { color }]}>{count}</Text>
                      </View>
                      <View style={styles.trackBg}>
                        <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    paddingHorizontal: 20, paddingBottom: 16,
  },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: MUTED, marginTop: 2 },

  body: { paddingHorizontal: 20, gap: 16 },

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
  periodBtn:       { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  periodBtnActive: { backgroundColor: PRIMARY },
  periodText:      { fontSize: 13, fontWeight: '600', color: MUTED },
  periodTextActive:{ color: '#fff' },

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
  heroCardCircle: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroCardValue: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  heroCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  /* Chart card */
  chartCard: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  chartHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  chartIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  chartTitle:  { fontSize: 14, fontWeight: '700', color: TEXT },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 150, gap: 4,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
  barValueLabel: { fontSize: 9, color: MUTED },
  bar:    { width: '80%', borderRadius: 6 },
  barLabel: { fontSize: 9, color: MUTED },

  /* Section card */
  sectionCard: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  sectionBody:  { padding: 18, gap: 16 },

  /* Status bars */
  statusItem:    { gap: 8 },
  statusItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusDotRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  statusItemLabel: { fontSize: 13, color: TEXT, fontWeight: '500', textTransform: 'capitalize' },
  statusCount:   { fontSize: 13, fontWeight: '700' },
  trackBg:  { height: 6, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  trackFill:{ height: '100%', borderRadius: 4 },
});
