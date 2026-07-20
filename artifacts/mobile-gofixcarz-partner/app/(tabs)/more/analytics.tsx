import React, { useState } from 'react';
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import AnalyticsService from '@/src/services/analytics.service';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency } from '@/src/utils/helpers';
import type { AnalyticsPeriod } from '@/src/types';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.ANALYTICS(period),
    queryFn: () => AnalyticsService.get({ period }),
  });

  const maxRevenue = Math.max(...(data?.graph_data?.map(p => p.revenue) ?? [1]));
  const statusEntries = Object.entries(data?.status_counts ?? {}).filter(([, v]) => (v ?? 0) > 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Period Selector */}
          <View style={[styles.periodRow, { backgroundColor: colors.card }]}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.periodBtn, period === p.value && { backgroundColor: colors.primary }]}
                onPress={() => setPeriod(p.value)} activeOpacity={0.8}
              >
                <Text style={[styles.periodText, { color: period === p.value ? '#fff' : colors.mutedForeground }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
              <Feather name="trending-up" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryValue}>{formatCurrency(data?.total_revenue ?? 0)}</Text>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.accent }]}>
              <Feather name="tool" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryValue}>{data?.total_jobs ?? 0}</Text>
              <Text style={styles.summaryLabel}>Total Jobs</Text>
            </View>
          </View>

          {/* Revenue Chart */}
          {data?.graph_data?.length ? (
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>Revenue Trend</Text>
              <View style={styles.chart}>
                {data.graph_data.slice(-12).map((point, i) => {
                  const h = maxRevenue > 0 ? (point.revenue / maxRevenue) * 120 : 4;
                  return (
                    <View key={i} style={styles.barWrap}>
                      <Text style={[styles.barValue, { color: colors.mutedForeground }]}>
                        {point.revenue >= 1000 ? `${(point.revenue / 1000).toFixed(0)}k` : String(Math.round(point.revenue))}
                      </Text>
                      <View style={[styles.bar, { height: Math.max(h, 4), backgroundColor: colors.primary }]} />
                      <Text style={[styles.barLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{point.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Job Status Breakdown */}
          {statusEntries.length ? (
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>Jobs by Status</Text>
              <View style={styles.statusList}>
                {statusEntries.map(([status, count]) => {
                  const total = statusEntries.reduce((acc, [, v]) => acc + (v ?? 0), 0);
                  const pct = total > 0 ? ((count ?? 0) / total) * 100 : 0;
                  const label = status.replace(/_/g, ' ');
                  return (
                    <View key={status} style={styles.statusRow}>
                      <Text style={[styles.statusLabel, { color: colors.foreground }]}>{label}</Text>
                      <View style={[styles.statusBarBg, { backgroundColor: colors.secondary }]}>
                        <View style={[styles.statusBarFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.statusCount, { color: colors.foreground }]}>{count}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 14 },
  periodRow: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  periodText: { fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 18, gap: 6 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  chartCard: { borderRadius: 16, padding: 16, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 160 },
  barWrap: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9 },
  bar: { width: '70%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, textAlign: 'center' },
  statusList: { gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 12, fontWeight: '500', width: 110 },
  statusBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  statusBarFill: { height: '100%', borderRadius: 4 },
  statusCount: { fontSize: 12, fontWeight: '700', width: 30, textAlign: 'right' },
});
