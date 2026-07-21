import React, { useState } from 'react';
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import AnalyticsService from '@/src/services/analytics.service';
import { useColors } from '@/hooks/useColors';
import { formatCurrency } from '@/src/utils/helpers';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import Card from '@/src/components/ui/Card';
import SectionHeader from '@/src/components/ui/SectionHeader';
import { radius, shadow, spacing, typography } from '@/constants/theme';
import type { AnalyticsPeriod } from '@/src/types';

const PERIODS: { label: string; value: AnalyticsPeriod }[] = [
  { label: 'Week',  value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year',  value: 'year' },
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

  const maxRev = Math.max(...(data?.graph_data?.map(p => p.revenue) ?? [1]), 1);
  const statusEntries = Object.entries(data?.status_counts ?? {}).filter(([, v]) => (v ?? 0) > 0);
  const totalJobs = statusEntries.reduce((acc, [, v]) => acc + (v ?? 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, backgroundColor: colors.primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: '#fff' }]}>Analytics</Text>
          <Text style={[typography.caption, { color: 'rgba(255,255,255,0.75)', marginTop: 2 }]}>Performance overview</Text>
        </View>
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Period toggle */}
          <View style={[styles.periodCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.sm]}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.periodBtn, period === p.value && { backgroundColor: colors.primary }]}
                onPress={() => setPeriod(p.value)}
                activeOpacity={0.8}
              >
                <Text style={[typography.label, { color: period === p.value ? '#fff' : colors.textSecondary }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary KPIs */}
          <View style={styles.kpiRow}>
            {[
              { label: 'Total Revenue', value: formatCurrency(data?.total_revenue ?? 0), icon: 'trending-up' as const, color: colors.primary },
              { label: 'Total Jobs',    value: String(data?.total_jobs ?? 0),             icon: 'briefcase' as const,  color: '#8B5CF6' },
            ].map(k => (
              <Card key={k.label} style={styles.kpiCard} padding={spacing.base}>
                <View style={[styles.kpiIcon, { backgroundColor: k.color + '18' }]}>
                  <Feather name={k.icon} size={18} color={k.color} />
                </View>
                <Text style={[typography.headline, { color: colors.text, marginTop: 8 }]}>{k.value}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{k.label}</Text>
              </Card>
            ))}
          </View>

          {/* Revenue chart */}
          {data?.graph_data?.length ? (
            <Card>
              <SectionHeader title="Revenue Trend" style={{ marginBottom: spacing.base }} />
              <View style={styles.chart}>
                {data.graph_data.slice(-10).map((pt, i) => {
                  const h = Math.max((pt.revenue / maxRev) * 100, 4);
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={[typography.labelSm, { color: colors.textSecondary }]} numberOfLines={1}>
                        {pt.revenue >= 1000 ? `${(pt.revenue / 1000).toFixed(0)}k` : String(Math.round(pt.revenue))}
                      </Text>
                      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <View style={[styles.bar, { height: h, backgroundColor: colors.primary, borderRadius: 4 }]} />
                      </View>
                      <Text style={[typography.labelSm, { color: colors.textSecondary }]} numberOfLines={1}>
                        {pt.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {/* Status breakdown */}
          {statusEntries.length ? (
            <Card>
              <SectionHeader title="Jobs by Status" style={{ marginBottom: spacing.base }} />
              <View style={{ gap: 12 }}>
                {statusEntries.map(([status, count]) => {
                  const pct = totalJobs > 0 ? ((count ?? 0) / totalJobs) * 100 : 0;
                  return (
                    <View key={status}>
                      <View style={styles.statusLabelRow}>
                        <Text style={[typography.bodySm, { color: colors.text, fontWeight: '500', flex: 1 }]}>
                          {status.replace(/_/g, ' ')}
                        </Text>
                        <Text style={[typography.label, { color: colors.text }]}>{count}</Text>
                      </View>
                      <View style={[styles.trackBg, { backgroundColor: colors.border }]}>
                        <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  body: { padding: spacing.base, gap: spacing.sm },
  periodCard: {
    flexDirection: 'row', borderRadius: radius.lg,
    padding: 4, gap: 4, borderWidth: 1,
  },
  periodBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.md, alignItems: 'center' },
  kpiRow: { flexDirection: 'row', gap: spacing.sm },
  kpiCard: { flex: 1 },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', gap: 4 },
  bar: { width: '70%' },
  statusLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  trackBg: { height: 6, borderRadius: 4, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 4 },
});
