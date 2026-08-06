import React, { useState, useCallback } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { TrendingUp } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import JobService from '@/src/services/job.service';
import { formatCurrency } from '@/src/utils/helpers';
import type { JobResponse } from '@/src/types';

/* ─── Tokens ─────────────────────────────────────────────── */
const BG        = '#F8FAFC';
const CARD      = '#FFFFFF';
const PRIMARY   = '#C41E3A';
const TEXT      = '#0F172A';
const MUTED     = '#64748B';
const SUBTLE    = '#94A3B8';
const DIVIDER   = '#F1F5F9';
const SUCCESS   = '#059669';
const INFO      = '#2563EB';

const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) ?? {};

/* ─── Period ──────────────────────────────────────────────── */
type UIPeriod = 'all' | 'year' | 'month' | 'week';

const PERIODS: { label: string; value: UIPeriod }[] = [
  { label: 'All Time', value: 'all'   },
  { label: 'Yearly',   value: 'year'  },
  { label: 'Monthly',  value: 'month' },
  { label: 'Weekly',   value: 'week'  },
];

const PERIOD_LABEL: Record<UIPeriod, string> = {
  all:   'All time',
  year:  'This year',
  month: 'This month',
  week:  'Last 7 days',
};

/* ─── Status colors ───────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  COMPLETED:         SUCCESS,
  DELIVERED:         SUCCESS,
  IN_PROGRESS:       INFO,
  OPEN:              '#F97316',
  WAITING_FOR_PARTS: '#8B5CF6',
  QUALITY_CHECK:     '#0EA5E9',
  READY:             '#10B981',
  CANCELLED:         PRIMARY,
};
const STATUS_LABELS: Record<string, string> = {
  COMPLETED:         'Completed',
  DELIVERED:         'Delivered',
  IN_PROGRESS:       'In Progress',
  OPEN:              'Open',
  WAITING_FOR_PARTS: 'Waiting Parts',
  QUALITY_CHECK:     'Quality Check',
  READY:             'Ready',
  CANCELLED:         'Cancelled',
};

/* ─── Analytics helpers ───────────────────────────────────── */
function jobRevenue(job: JobResponse): number {
  return (job as any).billing?.grand_total ?? job.final_amount ?? job.estimated_amount ?? 0;
}

function filterByPeriod(jobs: JobResponse[], period: UIPeriod): JobResponse[] {
  if (period === 'all') return jobs;
  const now = new Date();
  return jobs.filter(j => {
    const d = new Date(j.created_at);
    if (period === 'week') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 6);
      cutoff.setHours(0, 0, 0, 0);
      return d >= cutoff;
    }
    if (period === 'month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    // year
    return d.getFullYear() === now.getFullYear();
  });
}

interface GraphPoint { label: string; revenue: number; job_count: number; }

function buildGraph(jobs: JobResponse[], period: UIPeriod): GraphPoint[] {
  const now = new Date();

  if (period === 'week' || period === 'all') {
    // Group last 7 days
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(day.getDate() - (6 - i));
      const dateStr = day.toISOString().slice(0, 10);
      const dayJobs = jobs.filter(j => j.created_at.slice(0, 10) === dateStr);
      return {
        label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dayJobs.reduce((s, j) => s + jobRevenue(j), 0),
        job_count: dayJobs.length,
      };
    });
  }

  if (period === 'month') {
    const points: GraphPoint[] = [];
    let weekStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let wn = 1;
    while (weekStart <= now) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEnd2 = weekEnd; // copy for closure
      const wj = jobs.filter(j => {
        const d = new Date(j.created_at);
        return d >= weekStart && d <= weekEnd2;
      });
      points.push({ label: `W${wn}`, revenue: wj.reduce((s, j) => s + jobRevenue(j), 0), job_count: wj.length });
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
      wn++;
    }
    return points;
  }

  // year — group by month
  const earliest = jobs.length
    ? new Date(Math.min(...jobs.map(j => new Date(j.created_at).getTime())))
    : new Date(now.getFullYear(), 0, 1);
  const startMonth = earliest.getFullYear() < now.getFullYear() ? 0 : earliest.getMonth();
  return Array.from({ length: now.getMonth() - startMonth + 1 }, (_, i) => {
    const m = startMonth + i;
    const mj = jobs.filter(j => {
      const d = new Date(j.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === m;
    });
    return {
      label: new Date(now.getFullYear(), m, 1).toLocaleDateString('en-IN', { month: 'short' }),
      revenue: mj.reduce((s, j) => s + jobRevenue(j), 0),
      job_count: mj.length,
    };
  });
}

/* ─── Bezier path ─────────────────────────────────────────── */
function bezierPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = (pts[i + 1].x - pts[i].x) * 0.4;
    d += ` C${(pts[i].x + dx).toFixed(1)},${pts[i].y.toFixed(1)} ${(pts[i + 1].x - dx).toFixed(1)},${pts[i + 1].y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/* ─── Revenue chart ───────────────────────────────────────── */
function RevenueTrendChart({ graphData }: { graphData: GraphPoint[] }) {
  const { width } = useWindowDimensions();
  const chartW = width - 72;
  const chartH = 140;
  const padL   = 40;
  const innerW = chartW - padL;

  const hasRevenue = graphData.some(p => p.revenue > 0);

  if (!graphData.length || !hasRevenue) {
    return (
      <View style={{ height: chartH, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: SUBTLE, fontSize: 13 }}>No billing amounts recorded yet</Text>
      </View>
    );
  }

  const maxRev  = Math.max(...graphData.map(p => p.revenue), 1);
  const pts     = graphData.map((p, i) => ({
    x: padL + (graphData.length === 1 ? innerW / 2 : (i / (graphData.length - 1)) * innerW),
    y: chartH - Math.max((p.revenue / maxRev) * chartH * 0.88, 4),
  }));
  const line    = bezierPath(pts);
  const area    = line + ` L${(padL + innerW).toFixed(1)},${chartH} L${padL.toFixed(1)},${chartH} Z`;
  const peakIdx = graphData.reduce((mx, p, i) => (p.revenue > graphData[mx].revenue ? i : mx), 0);
  const peak    = pts[peakIdx];
  const ttW     = 64;
  const ttX     = Math.max(padL, Math.min(peak.x - ttW / 2, padL + innerW - ttW));
  const ttY     = Math.max(2, peak.y - 28);
  const stride  = Math.ceil(graphData.length / 6);
  const xLabels = graphData.map((p, i) => ({ lbl: p.label, x: pts[i].x, i }))
    .filter(({ i }) => i % stride === 0 || i === graphData.length - 1);

  return (
    <View style={{ height: chartH + 28 }}>
      <Svg width={chartW} height={chartH + 28}>
        <Defs>
          <SvgGrad id="rg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </SvgGrad>
        </Defs>
        {[0, 25, 50, 75, 100].map(t => {
          const gy = chartH - (t / 100) * chartH;
          return (
            <G key={t}>
              <Line x1={padL} y1={gy} x2={padL + innerW} y2={gy} stroke={DIVIDER} strokeWidth={1} />
              {(t === 0 || t === 100) && (
                <SvgText x={padL - 4} y={gy + 4} fill={SUBTLE} fontSize={8} textAnchor="end">
                  {t === 0 ? '0' : 'Peak'}
                </SvgText>
              )}
            </G>
          );
        })}
        <Path d={area} fill="url(#rg)" />
        <Path d={line} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={peak.x} y1={peak.y} x2={peak.x} y2={chartH} stroke={PRIMARY} strokeWidth={1} strokeDasharray="3 4" strokeOpacity={0.5} />
        <Circle cx={peak.x} cy={peak.y} r={5} fill={PRIMARY} stroke={CARD} strokeWidth={2.5} />
        <G transform={`translate(${ttX},${ttY})`}>
          <Rect width={ttW} height={20} rx={6} fill={TEXT} />
          <SvgText x={ttW / 2} y={13.5} fill={CARD} fontSize={9} fontWeight="bold" textAnchor="middle">
            {formatCurrency(graphData[peakIdx].revenue)}
          </SvgText>
        </G>
        {xLabels.map(({ lbl, x }) => (
          <SvgText key={lbl} x={x} y={chartH + 16} fill={SUBTLE} fontSize={9} textAnchor="middle">{lbl}</SvgText>
        ))}
      </Svg>
    </View>
  );
}

/* ─── Jobs bar chart ──────────────────────────────────────── */
function JobsBarChart({ graphData }: { graphData: GraphPoint[] }) {
  if (!graphData.length) return null;
  const maxCount = Math.max(...graphData.map(p => p.job_count), 1);
  const barH = 80;
  return (
    <View style={{ paddingTop: 4, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 }}>
      {graphData.map(({ label, job_count }) => {
        const fillH = Math.max((job_count / maxCount) * barH, job_count > 0 ? 4 : 0);
        return (
          <View key={label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            {job_count > 0 && <Text style={{ fontSize: 9, color: SUBTLE, fontWeight: '600' }}>{job_count}</Text>}
            <View style={{ height: barH, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
              <View style={{ height: fillH, width: '75%', backgroundColor: PRIMARY, borderRadius: 4, opacity: 0.85 }} />
            </View>
            <Text style={{ fontSize: 9, color: SUBTLE }} numberOfLines={1}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ─── Donut ───────────────────────────────────────────────── */
interface Segment { name: string; pct: number; color: string; }
function DonutChart({ segments }: { segments: Segment[] }) {
  const R_OUTER = 52, R_INNER = 36, CX = 60, CY = 60, size = 120;
  function polar(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  function arc(s: number, e: number) {
    const sd = s * 3.6, ed = e * 3.6, large = ed - sd > 180 ? 1 : 0;
    const o1 = polar(CX, CY, R_OUTER, sd), o2 = polar(CX, CY, R_OUTER, ed);
    const i1 = polar(CX, CY, R_INNER, ed), i2 = polar(CX, CY, R_INNER, sd);
    return `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A${R_OUTER} ${R_OUTER} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L${i1.x.toFixed(2)} ${i1.y.toFixed(2)} A${R_INNER} ${R_INNER} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)} Z`;
  }
  if (!segments.length) return (
    <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: SUBTLE, fontSize: 13 }}>No job data</Text>
    </View>
  );
  const top = segments[0];
  let cum = 0;
  return (
    <View style={s.donutRow}>
      <Svg width={size} height={size}>
        {segments.map(({ pct, color, name }) => {
          const p = arc(cum, cum + pct); cum += pct;
          return <Path key={name} d={p} fill={color} />;
        })}
        <SvgText x={CX} y={CY - 4}  fill={TEXT}  fontSize={16} fontWeight="bold" textAnchor="middle">{top.pct}%</SvgText>
        <SvgText x={CX} y={CY + 11} fill={SUBTLE} fontSize={8}  textAnchor="middle">{top.name}</SvgText>
      </Svg>
      <View style={{ flex: 1, gap: 7, paddingLeft: 8 }}>
        {segments.map(({ name, pct, color }) => (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
            <Text style={{ flex: 1, fontSize: 12, color: TEXT, fontWeight: '500' }} numberOfLines={1}>{name}</Text>
            <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>{pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── KPI card ────────────────────────────────────────────── */
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={[s.kpiCard, SHADOW_CARD]}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      {sub ? <Text style={s.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

/* ─── Screen ──────────────────────────────────────────────── */
export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<UIPeriod>('all');

  /* Dedicated query key so it doesn't conflict with Workshop tab */
  const { data: jobsData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['analytics', 'jobs'],
    queryFn:  () => JobService.list({ page_size: 200 }),
    staleTime: 30_000,
  });

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const allJobs = jobsData?.items ?? [];
  const jobs    = filterByPeriod(allJobs, period);
  const graph   = buildGraph(jobs, period);

  const totalJobs      = jobs.length;
  const completedJobs  = jobs.filter(j => j.status === 'COMPLETED').length;
  const totalRevenue   = jobs.reduce((s, j) => s + jobRevenue(j), 0);
  const avgTicket      = totalJobs > 0 ? Math.round(totalRevenue / totalJobs) : 0;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  const statusCounts: Record<string, number> = {};
  for (const j of jobs) statusCounts[j.status] = (statusCounts[j.status] ?? 0) + 1;
  const totalSt = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const segments: Segment[] = totalSt > 0
    ? Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, pct: Math.round((v / totalSt) * 100), color: STATUS_COLORS[k] ?? MUTED }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: 40 + insets.top }]}>
          <View>
            <Text style={s.headerTitle}>Analytics</Text>
            <Text style={s.headerSub}>
              {isLoading ? 'Loading…' : `${allJobs.length} total jobs`}
            </Text>
          </View>
          <View style={s.headerIcon}>
            <TrendingUp size={18} color={PRIMARY} strokeWidth={2} />
          </View>
        </View>

        {/* Period toggle */}
        <View style={s.periodWrap}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[s.periodBtn, period === p.value && s.periodActive]}
              onPress={() => setPeriod(p.value)}
              activeOpacity={0.7}
            >
              <Text style={[s.periodTxt, period === p.value && s.periodActiveTxt]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI row */}
        <View style={s.kpiRow}>
          <KpiCard label="Revenue"    value={isLoading ? '—' : formatCurrency(totalRevenue)} />
          <KpiCard label="Jobs"       value={isLoading ? '—' : String(totalJobs)} sub={totalJobs > 0 ? `${completedJobs} done` : undefined} />
          <KpiCard label="Avg Ticket" value={isLoading ? '—' : formatCurrency(avgTicket)} />
        </View>

        {/* Completion rate */}
        {!isLoading && totalJobs > 0 && (
          <View style={[s.card, SHADOW_CARD, { paddingVertical: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={s.cardTitle}>Completion Rate</Text>
              <Text style={[s.cardTitle, { color: completionRate >= 70 ? SUCCESS : '#D97706' }]}>{completionRate}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${completionRate}%` as any, backgroundColor: completionRate >= 70 ? SUCCESS : '#D97706' }]} />
            </View>
            <Text style={[s.cardSub, { marginTop: 6 }]}>{completedJobs} of {totalJobs} jobs completed · {PERIOD_LABEL[period]}</Text>
          </View>
        )}

        {/* Revenue trend */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Revenue Trend</Text>
            <Text style={s.cardSub}>{PERIOD_LABEL[period]}</Text>
          </View>
          {isLoading
            ? <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: SUBTLE }}>Loading…</Text></View>
            : <RevenueTrendChart graphData={graph} />}
        </View>

        {/* Jobs trend */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Jobs</Text>
            <Text style={s.cardSub}>{PERIOD_LABEL[period]}</Text>
          </View>
          {isLoading
            ? <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: SUBTLE }}>Loading…</Text></View>
            : totalJobs === 0
            ? <View style={{ height: 60, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: SUBTLE, fontSize: 13 }}>No jobs in this period</Text>
              </View>
            : <JobsBarChart graphData={graph} />}
        </View>

        {/* Status mix */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Job Status Mix</Text>
            <Text style={s.cardSub}>{totalJobs} jobs · {PERIOD_LABEL[period]}</Text>
          </View>
          {isLoading
            ? <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: SUBTLE }}>Loading…</Text></View>
            : <DonutChart segments={segments} />}
        </View>

      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CARD, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: TEXT },
  headerSub:   { fontSize: 12, color: MUTED, marginTop: 2 },
  headerIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },

  periodWrap: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: DIVIDER, borderRadius: 10, padding: 3,
  },
  periodBtn:       { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  periodActive:    {
    backgroundColor: CARD,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  periodTxt:       { fontSize: 11, fontWeight: '500', color: SUBTLE },
  periodActiveTxt: { fontWeight: '700', color: TEXT },

  kpiRow:  { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  kpiCard: { flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 12, overflow: 'hidden' },
  kpiLabel:{ fontSize: 10, color: MUTED, marginBottom: 5 },
  kpiValue:{ fontSize: 15, fontWeight: '700', color: TEXT },
  kpiSub:  { fontSize: 10, color: MUTED, marginTop: 3 },

  card: { backgroundColor: CARD, borderRadius: 16, marginHorizontal: 16, marginTop: 12, padding: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardTitle:{ fontSize: 14, fontWeight: '600', color: TEXT },
  cardSub:  { fontSize: 11, color: MUTED, marginTop: 2 },

  progressTrack: { height: 6, borderRadius: 4, backgroundColor: DIVIDER, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 4 },

  donutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
});
