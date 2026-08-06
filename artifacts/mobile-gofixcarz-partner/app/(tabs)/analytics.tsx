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
import { QUERY_KEYS } from '@/src/constants/api';
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
const WARN      = '#D97706';

const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) ?? {};

/* ─── Period mapping ──────────────────────────────────────── */
type UIPeriod = 'Weekly' | 'Monthly' | 'Yearly';
const UI_PERIODS: UIPeriod[] = ['Weekly', 'Monthly', 'Yearly'];
const PERIOD_LABEL: Record<UIPeriod, string> = {
  Weekly:  'Last 7 days',
  Monthly: 'This month',
  Yearly:  'This year',
};

/* ─── Status display config ───────────────────────────────── */
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

/* ─── Client-side analytics helpers ──────────────────────── */

interface TimeSeriesPoint {
  label: string;
  revenue: number;
  job_count: number;
  completed_count: number;
}

/** Revenue from a single job — billing takes priority, then final, then estimated */
function jobRevenue(job: JobResponse): number {
  return (job as any).billing?.grand_total ?? job.final_amount ?? job.estimated_amount ?? 0;
}

/** Is this job's created_at within the period? */
function isInPeriod(job: JobResponse, period: UIPeriod): boolean {
  const d = new Date(job.created_at);
  const now = new Date();
  if (period === 'Weekly') {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    return d >= cutoff;
  }
  if (period === 'Monthly') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  // Yearly
  return d.getFullYear() === now.getFullYear();
}

function buildGraphData(jobs: JobResponse[], period: UIPeriod): TimeSeriesPoint[] {
  const now = new Date();

  if (period === 'Weekly') {
    const points: TimeSeriesPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dateStr = day.toISOString().slice(0, 10);
      const dayJobs = jobs.filter(j => j.created_at.slice(0, 10) === dateStr);
      points.push({
        label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
        revenue: dayJobs.reduce((s, j) => s + jobRevenue(j), 0),
        job_count: dayJobs.length,
        completed_count: dayJobs.filter(j => j.status === 'COMPLETED' || j.status === 'DELIVERED').length,
      });
    }
    return points;
  }

  if (period === 'Monthly') {
    const points: TimeSeriesPoint[] = [];
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    let weekStart = new Date(firstDay);
    let weekNum = 1;
    while (weekStart <= now) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekJobs = jobs.filter(j => {
        const d = new Date(j.created_at);
        return d >= weekStart && d <= weekEnd;
      });
      points.push({
        label: `W${weekNum}`,
        revenue: weekJobs.reduce((s, j) => s + jobRevenue(j), 0),
        job_count: weekJobs.length,
        completed_count: weekJobs.filter(j => j.status === 'COMPLETED' || j.status === 'DELIVERED').length,
      });
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
      weekNum++;
    }
    return points;
  }

  // Yearly — group by month Jan → current month
  const points: TimeSeriesPoint[] = [];
  for (let m = 0; m <= now.getMonth(); m++) {
    const monthJobs = jobs.filter(j => {
      const d = new Date(j.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === m;
    });
    points.push({
      label: new Date(now.getFullYear(), m, 1).toLocaleDateString('en-IN', { month: 'short' }),
      revenue: monthJobs.reduce((s, j) => s + jobRevenue(j), 0),
      job_count: monthJobs.length,
      completed_count: monthJobs.filter(j => j.status === 'COMPLETED' || j.status === 'DELIVERED').length,
    });
  }
  return points;
}

/* ─── Smooth bezier helper ────────────────────────────────── */
function bezierPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx   = (pts[i + 1].x - pts[i].x) * 0.4;
    const cp1x = pts[i].x + dx;
    const cp1y = pts[i].y;
    const cp2x = pts[i + 1].x - dx;
    const cp2y = pts[i + 1].y;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/* ─── Revenue trend chart ─────────────────────────────────── */
function RevenueTrendChart({ graphData }: { graphData: TimeSeriesPoint[] }) {
  const { width } = useWindowDimensions();
  const chartW = width - 72;
  const chartH = 140;
  const padL   = 40;
  const innerW = chartW - padL;

  if (!graphData.length || graphData.every(p => p.revenue === 0)) {
    return (
      <View style={{ height: chartH, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: SUBTLE, fontSize: 13 }}>No revenue recorded yet</Text>
      </View>
    );
  }

  const maxRev = Math.max(...graphData.map(p => p.revenue), 1);
  const pts = graphData.map((p, i) => ({
    x: padL + (graphData.length === 1 ? innerW / 2 : (i / (graphData.length - 1)) * innerW),
    y: chartH - Math.max((p.revenue / maxRev) * chartH * 0.88, 4),
  }));

  const line     = bezierPath(pts);
  const area     = line + ` L${(padL + innerW).toFixed(1)},${chartH} L${padL.toFixed(1)},${chartH} Z`;
  const peakIdx  = graphData.reduce((mx, p, i) => (p.revenue > graphData[mx].revenue ? i : mx), 0);
  const peak     = pts[peakIdx];
  const ttW      = 64;
  const ttX      = Math.max(padL, Math.min(peak.x - ttW / 2, padL + innerW - ttW));
  const ttY      = Math.max(2, peak.y - 28);

  const stride   = Math.ceil(graphData.length / 6);
  const xLabels  = graphData
    .map((p, i) => ({ lbl: p.label, x: pts[i].x, i }))
    .filter(({ i }) => i % stride === 0 || i === graphData.length - 1);

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <View style={{ height: chartH + 28 }}>
      <Svg width={chartW} height={chartH + 28}>
        <Defs>
          <SvgGrad id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </SvgGrad>
        </Defs>

        {yTicks.map(t => {
          const gy = chartH - (t / 100) * chartH;
          return (
            <G key={t}>
              <Line
                x1={padL} y1={gy.toFixed(1)}
                x2={(padL + innerW).toFixed(1)} y2={gy.toFixed(1)}
                stroke={DIVIDER} strokeWidth={1}
              />
              <SvgText x={padL - 4} y={(gy + 4).toFixed(1)} fill={SUBTLE} fontSize={8} textAnchor="end">
                {t === 0 ? '0' : t === 100 ? 'Peak' : ''}
              </SvgText>
            </G>
          );
        })}

        <Path d={area} fill="url(#revGrad)" />
        <Path d={line} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        <Line
          x1={peak.x.toFixed(1)} y1={peak.y.toFixed(1)}
          x2={peak.x.toFixed(1)} y2={chartH}
          stroke={PRIMARY} strokeWidth={1} strokeDasharray="3 4" strokeOpacity={0.5}
        />

        <Circle cx={peak.x} cy={peak.y} r={5} fill={PRIMARY} stroke={CARD} strokeWidth={2.5} />

        <G transform={`translate(${ttX}, ${ttY})`}>
          <Rect width={ttW} height={20} rx={6} fill={TEXT} />
          <SvgText x={ttW / 2} y={13.5} fill={CARD} fontSize={9} fontWeight="bold" textAnchor="middle">
            {formatCurrency(graphData[peakIdx].revenue)}
          </SvgText>
        </G>

        {xLabels.map(({ lbl, x }) => (
          <SvgText key={lbl} x={x} y={chartH + 16} fill={SUBTLE} fontSize={9} textAnchor="middle">
            {lbl}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

/* ─── Jobs trend bar chart ────────────────────────────────── */
function JobsTrendChart({ graphData }: { graphData: TimeSeriesPoint[] }) {
  if (!graphData.length) {
    return (
      <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: SUBTLE, fontSize: 13 }}>No data for this period</Text>
      </View>
    );
  }

  const maxCount = Math.max(...graphData.map(p => p.job_count), 1);
  const barH     = 80;

  return (
    <View style={{ paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingHorizontal: 4 }}>
        {graphData.map(({ label, job_count }) => {
          const fillH = Math.max((job_count / maxCount) * barH, job_count > 0 ? 4 : 0);
          return (
            <View key={label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              {job_count > 0 && (
                <Text style={{ fontSize: 9, color: SUBTLE, fontWeight: '600' }}>{job_count}</Text>
              )}
              <View style={{ height: barH, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                <View style={{
                  height: fillH, width: '75%',
                  backgroundColor: PRIMARY, borderRadius: 4, opacity: 0.85,
                }} />
              </View>
              <Text style={{ fontSize: 9, color: SUBTLE }} numberOfLines={1}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Donut chart ─────────────────────────────────────────── */
interface Segment { name: string; pct: number; color: string; }

function DonutChart({ segments }: { segments: Segment[] }) {
  const R_OUTER = 52;
  const R_INNER = 36;
  const CX = 60;
  const CY = 60;
  const size = 120;

  function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startPct: number, endPct: number) {
    const startDeg = startPct * 3.6;
    const endDeg   = endPct   * 3.6;
    const large    = endDeg - startDeg > 180 ? 1 : 0;
    const o1 = polarToCart(CX, CY, R_OUTER, startDeg);
    const o2 = polarToCart(CX, CY, R_OUTER, endDeg);
    const i1 = polarToCart(CX, CY, R_INNER, endDeg);
    const i2 = polarToCart(CX, CY, R_INNER, startDeg);
    return [
      `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
      `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
      `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
      `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
      'Z',
    ].join(' ');
  }

  if (!segments.length) {
    return (
      <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: SUBTLE, fontSize: 13 }}>No job data</Text>
      </View>
    );
  }

  const top = segments[0];
  let cumulative = 0;

  return (
    <View style={s.donutRow}>
      <Svg width={size} height={size}>
        {segments.map(({ pct, color, name }) => {
          const path = arcPath(cumulative, cumulative + pct);
          cumulative += pct;
          return <Path key={name} d={path} fill={color} />;
        })}
        <SvgText x={CX} y={CY - 4}  fill={TEXT}  fontSize={16} fontWeight="bold" textAnchor="middle">
          {top.pct}%
        </SvgText>
        <SvgText x={CX} y={CY + 11} fill={SUBTLE} fontSize={8}  textAnchor="middle">
          {top.name}
        </SvgText>
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
  const [period, setPeriod] = useState<UIPeriod>('Monthly');

  /* Fetch all jobs — share cache with Workshop tab for instant display */
  const { data: jobsData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOBS({}),
    queryFn:  () => JobService.list({ page_size: 200 }),
    staleTime: 30_000,
    refetchOnMount: true,
  });

  /* Refetch every time this tab comes into focus */
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const allJobs   = jobsData?.items ?? [];
  const jobs      = allJobs.filter(j => isInPeriod(j, period));
  const graphData = buildGraphData(jobs, period);

  /* ── KPI computations ── */
  const totalJobs      = jobs.length;
  const completedJobs  = jobs.filter(j => j.status === 'COMPLETED' || j.status === 'DELIVERED').length;
  const totalRevenue   = jobs.reduce((s, j) => s + jobRevenue(j), 0);
  const avgTicket      = totalJobs > 0 ? Math.round(totalRevenue / totalJobs) : 0;
  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  /* ── Status breakdown for donut ── */
  const statusCounts: Record<string, number> = {};
  for (const job of jobs) {
    statusCounts[job.status] = (statusCounts[job.status] ?? 0) + 1;
  }
  const totalStatusJobs = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const segments: Segment[] = totalStatusJobs > 0
    ? Object.entries(statusCounts)
        .filter(([, v]) => v > 0)
        .map(([key, val]) => ({
          name:  STATUS_LABELS[key] ?? key,
          pct:   Math.round((val / totalStatusJobs) * 100),
          color: STATUS_COLORS[key] ?? MUTED,
        }))
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

        {/* ── Header ── */}
        <View style={[s.header, { paddingTop: 40 + insets.top }]}>
          <View>
            <Text style={s.headerTitle}>Analytics</Text>
            <Text style={s.headerSub}>{PERIOD_LABEL[period]}</Text>
          </View>
          <View style={s.headerIcon}>
            <TrendingUp size={18} color={PRIMARY} strokeWidth={2} />
          </View>
        </View>

        {/* ── Period toggle ── */}
        <View style={s.periodWrap}>
          {UI_PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[s.periodBtn, period === p && s.periodActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[s.periodTxt, period === p && s.periodActiveTxt]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── KPI row ── */}
        <View style={s.kpiRow}>
          <KpiCard
            label="Revenue"
            value={isLoading ? '—' : formatCurrency(totalRevenue)}
          />
          <KpiCard
            label="Jobs"
            value={isLoading ? '—' : String(totalJobs)}
            sub={totalJobs > 0 ? `${completedJobs} done` : undefined}
          />
          <KpiCard
            label="Avg Ticket"
            value={isLoading ? '—' : formatCurrency(avgTicket)}
          />
        </View>

        {/* ── Completion rate strip ── */}
        {!isLoading && totalJobs > 0 && (
          <View style={[s.card, SHADOW_CARD, { paddingVertical: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={s.cardTitle}>Completion Rate</Text>
              <Text style={[s.cardTitle, { color: completionRate >= 70 ? SUCCESS : WARN }]}>
                {completionRate}%
              </Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, {
                width: `${completionRate}%` as any,
                backgroundColor: completionRate >= 70 ? SUCCESS : WARN,
              }]} />
            </View>
            <Text style={[s.cardSub, { marginTop: 6 }]}>
              {completedJobs} of {totalJobs} jobs completed
            </Text>
          </View>
        )}

        {/* ── Revenue trend ── */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardTitle}>Revenue Trend</Text>
              <Text style={s.cardSub}>{PERIOD_LABEL[period]}</Text>
            </View>
          </View>
          {isLoading
            ? <View style={{ height: 140, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: SUBTLE }}>Loading…</Text></View>
            : <RevenueTrendChart graphData={graphData} />}
        </View>

        {/* ── Jobs trend ── */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardTitle}>Jobs</Text>
              <Text style={s.cardSub}>{PERIOD_LABEL[period]}</Text>
            </View>
          </View>
          {isLoading
            ? <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: SUBTLE }}>Loading…</Text></View>
            : <JobsTrendChart graphData={graphData} />}
        </View>

        {/* ── Job status mix ── */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardTitle}>Job Status Mix</Text>
              <Text style={s.cardSub}>
                {totalJobs > 0 ? `${totalJobs} jobs this ${period === 'Weekly' ? 'week' : period === 'Monthly' ? 'month' : 'year'}` : 'By current status'}
              </Text>
            </View>
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
    backgroundColor: CARD,
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: TEXT },
  headerSub:   { fontSize: 12, color: MUTED, marginTop: 2 },
  headerIcon:  {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Period toggle */
  periodWrap: {
    flexDirection: 'row',
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: DIVIDER,
    borderRadius: 10, padding: 3,
  },
  periodBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  periodActive: {
    backgroundColor: CARD,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  periodTxt:       { fontSize: 13, fontWeight: '500', color: SUBTLE },
  periodActiveTxt: { fontWeight: '700', color: TEXT },

  /* KPI row */
  kpiRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 8 },
  kpiCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 12, overflow: 'hidden',
  },
  kpiLabel: { fontSize: 10, color: MUTED, marginBottom: 5 },
  kpiValue: { fontSize: 15, fontWeight: '700', color: TEXT },
  kpiSub:   { fontSize: 10, color: MUTED, marginTop: 3 },

  /* Card */
  card: {
    backgroundColor: CARD, borderRadius: 16,
    marginHorizontal: 16, marginTop: 12, padding: 16,
  },
  cardHead: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  cardSub:   { fontSize: 11, color: MUTED, marginTop: 2 },

  /* Completion progress */
  progressTrack: {
    height: 6, borderRadius: 4, backgroundColor: DIVIDER, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 4,
  },

  /* Donut */
  donutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
});
