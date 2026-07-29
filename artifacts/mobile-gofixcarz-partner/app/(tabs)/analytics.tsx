import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
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
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wrench, Star, Users } from 'lucide-react-native';

/* ─── Tokens ─────────────────────────────────────────────── */
const BG       = '#F8FAFC';
const CARD     = '#FFFFFF';
const PRIMARY  = '#C41E3A';
const TEXT     = '#0F172A';
const MUTED    = '#64748B';
const SUBTLE   = '#94A3B8';
const BORDER   = '#E2E8F0';
const DIVIDER  = '#F1F5F9';
const SUCCESS  = '#059669';
const SUCCESS_BG = '#ECFDF5';
const INFO     = '#2563EB';
const WARN     = '#D97706';

const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
}) ?? {};

/* ─── Per-period data ─────────────────────────────────────── */
type Period = '7D' | '30D' | '90D';

const PERIOD_DATA: Record<Period, {
  revenue: string; revChange: number;
  jobs: number;    jobChange: number;
  avgTicket: string; avgChange: number;
  chartPoints: number[];
  chartLabels: string[];
  peakLabel: string;
  chartSub: string;
  sparkRevenue: number[];
  sparkJobs: number[];
  sparkAvg: number[];
}> = {
  '7D': {
    revenue: '₹28,450', revChange: 18,
    jobs: 43,            jobChange: 12,
    avgTicket: '₹662',  avgChange: 5,
    chartPoints:  [18, 24, 16, 30, 22, 38, 29],
    chartLabels:  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    peakLabel:    '₹38K',
    chartSub:     '₹28.5K this week',
    sparkRevenue: [12, 18, 14, 22, 19, 26, 24],
    sparkJobs:    [5,  7,  5,  8,  7,  11, 9],
    sparkAvg:     [600, 640, 590, 680, 660, 720, 700],
  },
  '30D': {
    revenue: '₹3.24L', revChange: 12,
    jobs: 186,          jobChange: 8,
    avgTicket: '₹1,742', avgChange: 4,
    chartPoints:  [40,35,45,38,52,48,55,42,60,65,58,70,62,75,68,80,72,85,78,90,82,88,85,92,88,94,90,96,92,98],
    chartLabels:  ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    peakLabel:    '₹15.2K',
    chartSub:     '₹3.24L this month',
    sparkRevenue: [60, 70, 65, 80, 72, 85, 90],
    sparkJobs:    [30, 38, 35, 46, 42, 50, 48],
    sparkAvg:     [1600, 1680, 1650, 1720, 1700, 1750, 1780],
  },
  '90D': {
    revenue: '₹9.84L', revChange: 22,
    jobs: 541,          jobChange: 15,
    avgTicket: '₹1,818', avgChange: 9,
    chartPoints:  [28, 32, 27, 35, 30, 38, 33, 42, 36, 48, 44, 52, 47, 58, 52, 62, 56, 68, 62, 72, 66, 76, 70, 80],
    chartLabels:  ['May', 'Jun', 'Jul'],
    peakLabel:    '₹4.8L',
    chartSub:     '₹9.84L this quarter',
    sparkRevenue: [42, 55, 50, 68, 62, 78, 88],
    sparkJobs:    [120, 145, 138, 162, 155, 175, 180],
    sparkAvg:     [1650, 1700, 1720, 1760, 1790, 1800, 1820],
  },
};

const JOBS_BY_DAY = [
  { day: 'Mon', count: 18 },
  { day: 'Tue', count: 24 },
  { day: 'Wed', count: 20 },
  { day: 'Thu', count: 27 },
  { day: 'Fri', count: 22 },
  { day: 'Sat', count: 35 },
  { day: 'Sun', count: 28 },
];
const MAX_DAY = Math.max(...JOBS_BY_DAY.map(d => d.count));

const SERVICES = [
  { name: 'Full Service',  pct: 42, color: PRIMARY },
  { name: 'Oil Change',    pct: 28, color: INFO    },
  { name: 'Brake Service', pct: 14, color: SUCCESS  },
  { name: 'AC Service',    pct: 10, color: WARN     },
  { name: 'Other',         pct: 6,  color: '#8B5CF6'},
];

/* ─── Smooth bezier helper ───────────────────────────────── */
function bezierPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = (pts[i + 1].x - pts[i].x) * 0.4;
    const cp1x = pts[i].x + dx;
    const cp1y = pts[i].y;
    const cp2x = pts[i + 1].x - dx;
    const cp2y = pts[i + 1].y;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
  }
  return d;
}

/* ─── Mini sparkline (for KPI cards) ─────────────────────── */
function Sparkline({ data, color, w = 64, h = 24 }: { data: number[]; color: string; w?: number; h?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h * 0.85,
  }));
  const line = bezierPath(pts);
  const area = line + ` L${w},${h} L0,${h} Z`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgGrad id={`sg${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </SvgGrad>
      </Defs>
      <Path d={area} fill={`url(#sg${color.replace('#', '')})`} />
      <Path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ─── Revenue trend chart ─────────────────────────────────── */
function RevenueTrendChart({ period }: { period: Period }) {
  const { width } = useWindowDimensions();
  const pd = PERIOD_DATA[period];
  const chartW = width - 72;   // mx-4 (32) + p-4 card (32) + y-axis (8 extra)
  const chartH = 140;
  const padL   = 40;            // space for Y labels
  const innerW = chartW - padL;

  const raw = pd.chartPoints;
  const minV = 0;
  const maxV = 100;

  const pts = raw.map((v, i) => ({
    x: padL + (i / (raw.length - 1)) * innerW,
    y: chartH - ((v - minV) / (maxV - minV)) * chartH,
  }));

  const line = bezierPath(pts);
  const area = line + ` L${(padL + innerW).toFixed(1)},${chartH} L${padL.toFixed(1)},${chartH} Z`;

  const peakIdx = raw.indexOf(Math.max(...raw));
  const peak    = pts[peakIdx];

  // Y gridlines at 0%, 25%, 50%, 75%, 100%
  const yTicks = [0, 25, 50, 75, 100];

  // X labels — evenly spaced from chartLabels
  const xCount = pd.chartLabels.length;
  const xLabelPts = pd.chartLabels.map((lbl, i) => ({
    lbl,
    x: padL + (i / (xCount - 1)) * innerW,
  }));

  // Tooltip: show peak revenue label
  const ttW = 52;
  const ttX  = Math.max(padL, Math.min(peak.x - ttW / 2, padL + innerW - ttW));
  const ttY  = Math.max(2, peak.y - 28);

  return (
    <View style={{ height: chartH + 28 }}>
      <Svg width={chartW} height={chartH + 28}>
        <Defs>
          <SvgGrad id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </SvgGrad>
        </Defs>

        {/* Y-axis gridlines + labels */}
        {yTicks.map(tick => {
          const y = chartH - ((tick / 100) * chartH);
          return (
            <G key={tick}>
              <Line
                x1={padL} y1={y.toFixed(1)}
                x2={(padL + innerW).toFixed(1)} y2={y.toFixed(1)}
                stroke={BORDER} strokeWidth={1} strokeDasharray="3 4"
              />
              {tick > 0 && (
                <SvgText x={padL - 4} y={y + 4} fill={SUBTLE} fontSize={8} textAnchor="end">
                  {tick === 100 ? 'High' : tick === 50 ? 'Mid' : ''}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* Area fill */}
        <Path d={area} fill="url(#revGrad)" />

        {/* Line */}
        <Path d={line} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Vertical drop at peak */}
        <Line
          x1={peak.x.toFixed(1)} y1={peak.y.toFixed(1)}
          x2={peak.x.toFixed(1)} y2={chartH}
          stroke={PRIMARY} strokeWidth={1} strokeDasharray="3 4" strokeOpacity={0.5}
        />

        {/* Peak dot */}
        <Circle cx={peak.x} cy={peak.y} r={5} fill={PRIMARY} stroke={CARD} strokeWidth={2.5} />

        {/* Tooltip */}
        <G transform={`translate(${ttX}, ${ttY})`}>
          <Rect width={ttW} height={20} rx={6} fill={TEXT} />
          <SvgText x={ttW / 2} y={13.5} fill={CARD} fontSize={9.5} fontWeight="bold" textAnchor="middle">
            {pd.peakLabel}
          </SvgText>
        </G>

        {/* X-axis labels */}
        {xLabelPts.map(({ lbl, x }) => (
          <SvgText key={lbl} x={x} y={chartH + 16} fill={SUBTLE} fontSize={9} textAnchor="middle">
            {lbl}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

/* ─── Jobs by day bar chart ───────────────────────────────── */
function JobsByDayChart() {
  const { width } = useWindowDimensions();
  const chartW = width - 64;
  const barH   = 80;
  const barW   = Math.floor((chartW - 16) / JOBS_BY_DAY.length) - 6;
  const today  = new Date().getDay(); // 0=Sun, 1=Mon …
  const todayIdx = today === 0 ? 6 : today - 1;

  return (
    <View style={{ paddingTop: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 4 }}>
        {JOBS_BY_DAY.map(({ day, count }, idx) => {
          const fillH = (count / MAX_DAY) * barH;
          const isToday = idx === todayIdx;
          return (
            <View key={day} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 9, color: isToday ? PRIMARY : SUBTLE, fontWeight: isToday ? '700' : '400' }}>
                {count}
              </Text>
              <View style={{
                width: '100%', height: barH,
                justifyContent: 'flex-end',
              }}>
                <View style={{
                  height: fillH,
                  backgroundColor: isToday ? PRIMARY : '#E2E8F0',
                  borderTopLeftRadius: 4, borderTopRightRadius: 4,
                }} />
              </View>
              <Text style={{ fontSize: 9, color: isToday ? PRIMARY : SUBTLE, fontWeight: isToday ? '700' : '400' }}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ─── Donut chart ─────────────────────────────────────────── */
function DonutChart() {
  const R_OUTER = 52;
  const R_INNER = 36;
  const CX = 60;
  const CY = 60;
  const size = 120;

  // Build SVG arc paths from percentages
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

  let cumulative = 0;
  return (
    <View style={s.donutRow}>
      {/* Donut */}
      <Svg width={size} height={size}>
        {SERVICES.map(({ pct, color, name }) => {
          const path = arcPath(cumulative, cumulative + pct);
          cumulative += pct;
          return <Path key={name} d={path} fill={color} />;
        })}
        {/* Centre label */}
        <SvgText x={CX} y={CY - 4}  fill={TEXT}  fontSize={16} fontWeight="bold" textAnchor="middle">42%</SvgText>
        <SvgText x={CX} y={CY + 11} fill={SUBTLE} fontSize={8}  textAnchor="middle">Top service</SvgText>
      </Svg>

      {/* Legend */}
      <View style={{ flex: 1, gap: 7, paddingLeft: 8 }}>
        {SERVICES.map(({ name, pct, color }) => (
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

/* ─── Circular progress (returning customers) ─────────────── */
function CircularProgress({ pct }: { pct: number }) {
  return (
    <View style={s.circleWrap}>
      <Svg viewBox="0 0 36 36" width={64} height={64} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke={DIVIDER} strokeWidth={3.5} />
        <Path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke={PRIMARY} strokeWidth={3.5} strokeDasharray={`${pct} 100`} strokeLinecap="round" />
      </Svg>
      <View style={s.circleLabel}>
        <Text style={s.circlePct}>{pct}%</Text>
      </View>
    </View>
  );
}

/* ─── KPI card ────────────────────────────────────────────── */
function KpiCard({
  label, value, change, spark, sparkColor,
}: { label: string; value: string; change: number; spark: number[]; sparkColor: string }) {
  const up = change >= 0;
  return (
    <View style={[s.kpiCard, SHADOW_CARD]}>
      {/* Sparkline in background (top-right) */}
      <View style={s.kpiSparkWrap}>
        <Sparkline data={spark} color={sparkColor} w={70} h={28} />
      </View>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      <View style={[s.kpiChange, { backgroundColor: up ? SUCCESS_BG : '#FEF2F2' }]}>
        {up
          ? <ArrowUpRight size={10} color={SUCCESS} strokeWidth={2.5} />
          : <ArrowDownRight size={10} color={PRIMARY} strokeWidth={2.5} />}
        <Text style={[s.kpiChangeTxt, { color: up ? SUCCESS : PRIMARY }]}>
          {up ? '+' : ''}{change}%
        </Text>
      </View>
    </View>
  );
}

/* ─── Screen ─────────────────────────────────────────────── */
const PERIODS: Period[] = ['7D', '30D', '90D'];
const PERIOD_LABEL: Record<Period, string> = {
  '7D':  'Last 7 days',
  '30D': 'Last 30 days',
  '90D': 'Last 90 days',
};

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('30D');
  const pd = PERIOD_DATA[period];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={[s.header, { paddingTop: 40 + insets.top }]}>
          <View>
            <Text style={s.headerTitle}>Analytics</Text>
            <Text style={s.headerSub}>{PERIOD_LABEL[period]}</Text>
          </View>
          <View style={s.headerIcon}>
            <TrendingUp size={18} color={PRIMARY} strokeWidth={2} />
          </View>
        </View>

        {/* ── Period toggle ──────────────────────────────── */}
        <View style={s.periodWrap}>
          {PERIODS.map(p => (
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

        {/* ── KPI cards ─────────────────────────────────── */}
        <View style={s.kpiRow}>
          <KpiCard label="Revenue"    value={pd.revenue}    change={pd.revChange} spark={pd.sparkRevenue} sparkColor={PRIMARY} />
          <KpiCard label="Jobs Done"  value={String(pd.jobs)} change={pd.jobChange} spark={pd.sparkJobs}    sparkColor={INFO}    />
          <KpiCard label="Avg Ticket" value={pd.avgTicket}  change={pd.avgChange} spark={pd.sparkAvg}     sparkColor={SUCCESS} />
        </View>

        {/* ── Revenue trend chart ────────────────────────── */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardTitle}>Revenue Trend</Text>
              <Text style={s.cardSub}>{pd.chartSub}</Text>
            </View>
            <View style={s.revBadge}>
              <ArrowUpRight size={11} color={SUCCESS} strokeWidth={2.5} />
              <Text style={s.revBadgeTxt}>+{pd.revChange}%</Text>
            </View>
          </View>
          <RevenueTrendChart period={period} />
        </View>

        {/* ── Jobs by day ────────────────────────────────── */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardTitle}>Jobs by Day</Text>
              <Text style={s.cardSub}>Weekly distribution</Text>
            </View>
            <View style={s.peakBadge}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: PRIMARY, marginRight: 5 }} />
              <Text style={s.peakBadgeTxt}>Today</Text>
            </View>
          </View>
          <JobsByDayChart />
        </View>

        {/* ── Service mix ────────────────────────────────── */}
        <View style={[s.card, SHADOW_CARD]}>
          <View style={s.cardHead}>
            <View>
              <Text style={s.cardTitle}>Service Mix</Text>
              <Text style={s.cardSub}>By job category</Text>
            </View>
          </View>
          <DonutChart />
        </View>

        {/* ── Bottom row: retention + rating ─────────────── */}
        <View style={s.bottomRow}>
          {/* Returning customers */}
          <View style={[s.bottomCard, SHADOW_CARD]}>
            <Text style={s.bottomCardTitle}>Return Rate</Text>
            <View style={s.bottomCardBody}>
              <CircularProgress pct={68} />
              <View style={{ marginLeft: 10 }}>
                <Text style={s.bigPct}>68%</Text>
                <View style={s.microChange}>
                  <ArrowUpRight size={10} color={SUCCESS} strokeWidth={2.5} />
                  <Text style={[s.microChangeTxt, { color: SUCCESS }]}>+5% vs last</Text>
                </View>
                <Text style={s.microLabel}>Returning</Text>
              </View>
            </View>
          </View>

          {/* Rating */}
          <View style={[s.bottomCard, SHADOW_CARD]}>
            <Text style={s.bottomCardTitle}>Rating</Text>
            <View style={s.bottomCardBody}>
              <View style={s.ratingCircle}>
                <Star size={20} color={PRIMARY} fill={PRIMARY} strokeWidth={0} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={s.bigPct}>4.8</Text>
                <View style={s.starsRow}>
                  {[1,2,3,4].map(i => (
                    <Svg key={i} width={10} height={10} viewBox="0 0 24 24">
                      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={PRIMARY} />
                    </Svg>
                  ))}
                  <Svg width={10} height={10} viewBox="0 0 24 24">
                    <Defs>
                      <SvgGrad id="halfStar" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="80%" stopColor={PRIMARY} />
                        <Stop offset="80%" stopColor={BORDER} />
                      </SvgGrad>
                    </Defs>
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#halfStar)" />
                  </Svg>
                </View>
                <Text style={s.microLabel}>142 reviews</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Insight chips ──────────────────────────────── */}
        <View style={[s.card, SHADOW_CARD, { marginBottom: 4 }]}>
          <Text style={s.cardTitle}>Key Insights</Text>
          <View style={s.insightsList}>
            <InsightRow icon="up"   text="Saturday is your busiest day — 35 jobs on average" />
            <InsightRow icon="up"   text="Full Service accounts for 42% of revenue" />
            <InsightRow icon="warn" text="Wednesday has the fewest bookings — consider a promo" />
            <InsightRow icon="up"   text="Returning customer rate is above the 60% industry avg" />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

function InsightRow({ icon, text }: { icon: 'up' | 'warn'; text: string }) {
  const isUp = icon === 'up';
  return (
    <View style={s.insightRow}>
      <View style={[s.insightDot, { backgroundColor: isUp ? SUCCESS_BG : '#FFFBEB' }]}>
        {isUp
          ? <ArrowUpRight size={10} color={SUCCESS} strokeWidth={2.5} />
          : <ArrowUpRight size={10} color={WARN}    strokeWidth={2.5} style={{ transform: [{ rotate: '90deg' }] }} />}
      </View>
      <Text style={s.insightText}>{text}</Text>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: BG },

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
    flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 12,
    overflow: 'hidden',
  },
  kpiSparkWrap: { position: 'absolute', right: 0, top: 0, opacity: 0.8 },
  kpiLabel:     { fontSize: 10, color: MUTED, marginBottom: 5 },
  kpiValue:     { fontSize: 15, fontWeight: '700', color: TEXT },
  kpiChange:    {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
    marginTop: 6, alignSelf: 'flex-start',
  },
  kpiChangeTxt: { fontSize: 10, fontWeight: '600' },

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

  revBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SUCCESS_BG, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  revBadgeTxt: { fontSize: 11, color: SUCCESS, fontWeight: '600' },

  peakBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  peakBadgeTxt: { fontSize: 11, color: PRIMARY, fontWeight: '600' },

  /* Donut */
  donutRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },

  /* Bottom row */
  bottomRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 12 },
  bottomCard: { flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 14 },
  bottomCardTitle: { fontSize: 11, color: MUTED, fontWeight: '500', marginBottom: 10 },
  bottomCardBody:  { flexDirection: 'row', alignItems: 'center' },

  /* Circular */
  circleWrap:  { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  circleLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  circlePct:   { fontSize: 12, fontWeight: '700', color: TEXT },

  bigPct:   { fontSize: 22, fontWeight: '700', color: TEXT, lineHeight: 26 },
  microChange: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  microChangeTxt: { fontSize: 10, fontWeight: '500' },
  microLabel:  { fontSize: 10, color: MUTED, marginTop: 2 },

  ratingCircle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },

  /* Insights */
  insightsList: { marginTop: 12, gap: 10 },
  insightRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  insightDot:   {
    width: 20, height: 20, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  insightText: { flex: 1, fontSize: 12.5, color: TEXT, lineHeight: 18 },
});
