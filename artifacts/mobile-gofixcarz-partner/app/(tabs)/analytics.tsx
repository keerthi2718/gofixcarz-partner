import React, { useMemo, useState } from 'react';
import {
  Dimensions, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  Svg, Path, Defs,
  LinearGradient as SvgGrad, Stop,
  G, Text as SvgText, Circle,
} from 'react-native-svg';
import { formatCurrency } from '@/src/utils/helpers';

/* ─── Tokens ─────────────────────────────────────────────── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const INDIGO  = '#6366F1';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

type Period = 'week' | 'month' | 'year';
const PERIODS: { label: string; value: Period }[] = [
  { label: 'Week',  value: 'week'  },
  { label: 'Month', value: 'month' },
  { label: 'Year',  value: 'year'  },
];

const STATUS_COLORS: Record<string, string> = {
  COMPLETED:         '#10B981',
  IN_PROGRESS:       '#8B5CF6',
  OPEN:              '#3B82F6',
  READY:             '#059669',
  QUALITY_CHECK:     '#6366F1',
  WAITING_FOR_PARTS: '#F59E0B',
  CANCELLED:         '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED:         'Completed',
  IN_PROGRESS:       'In Progress',
  OPEN:              'Open',
  READY:             'Ready',
  QUALITY_CHECK:     'Quality Check',
  WAITING_FOR_PARTS: 'Waiting Parts',
  CANCELLED:         'Cancelled',
};

/* ─── Mock data ──────────────────────────────────────────── */
const MOCK: Record<Period, {
  totalRevenue: number; totalJobs: number; completedJobs: number; cancelledJobs: number;
  graph: { label: string; revenue: number }[];
  statusCounts: Record<string, number>;
  topServices: { name: string; count: number; revenue: number }[];
  technicians: { name: string; initials: string; jobs: number; revenue: number; rating: number }[];
  newCustomers: number; returningCustomers: number;
}> = {
  week: {
    totalRevenue: 84500, totalJobs: 23, completedJobs: 15, cancelledJobs: 1,
    graph: [
      { label: 'Mon', revenue: 8000  },
      { label: 'Tue', revenue: 14500 },
      { label: 'Wed', revenue: 11200 },
      { label: 'Thu', revenue: 17800 },
      { label: 'Fri', revenue: 21000 },
      { label: 'Sat', revenue: 9500  },
      { label: 'Sun', revenue: 2500  },
    ],
    statusCounts: { COMPLETED: 15, IN_PROGRESS: 4, OPEN: 3, READY: 2, QUALITY_CHECK: 1, WAITING_FOR_PARTS: 2, CANCELLED: 1 },
    topServices: [
      { name: 'Oil Change',    count: 9,  revenue: 18000 },
      { name: 'Brake Service', count: 6,  revenue: 21000 },
      { name: 'Tyre Rotation', count: 5,  revenue: 10000 },
      { name: 'AC Service',    count: 4,  revenue: 18400 },
      { name: 'Battery Check', count: 3,  revenue: 5100  },
    ],
    technicians: [
      { name: 'Suresh Kumar', initials: 'SK', jobs: 10, revenue: 38500, rating: 4.8 },
      { name: 'Mahesh Reddy', initials: 'MR', jobs:  8, revenue: 29000, rating: 4.6 },
      { name: 'Ganesh Patel', initials: 'GP', jobs:  5, revenue: 17000, rating: 4.5 },
    ],
    newCustomers: 8, returningCustomers: 15,
  },
  month: {
    totalRevenue: 342000, totalJobs: 94, completedJobs: 68, cancelledJobs: 4,
    graph: [
      { label: 'Wk 1', revenue:  72000 },
      { label: 'Wk 2', revenue:  88000 },
      { label: 'Wk 3', revenue:  95000 },
      { label: 'Wk 4', revenue:  87000 },
    ],
    statusCounts: { COMPLETED: 68, IN_PROGRESS: 12, OPEN: 8, READY: 3, QUALITY_CHECK: 3, WAITING_FOR_PARTS: 5, CANCELLED: 4 },
    topServices: [
      { name: 'Oil Change',    count: 38, revenue:  76000 },
      { name: 'Brake Service', count: 24, revenue:  84000 },
      { name: 'Tyre Rotation', count: 19, revenue:  38000 },
      { name: 'AC Service',    count: 15, revenue:  69000 },
      { name: 'Battery Check', count: 11, revenue:  18700 },
    ],
    technicians: [
      { name: 'Suresh Kumar', initials: 'SK', jobs: 42, revenue: 148000, rating: 4.9 },
      { name: 'Mahesh Reddy', initials: 'MR', jobs: 34, revenue: 122000, rating: 4.7 },
      { name: 'Ganesh Patel', initials: 'GP', jobs: 18, revenue:  72000, rating: 4.5 },
    ],
    newCustomers: 32, returningCustomers: 62,
  },
  year: {
    totalRevenue: 4120000, totalJobs: 1134, completedJobs: 890, cancelledJobs: 52,
    graph: [
      { label: 'Jan', revenue: 280000 },
      { label: 'Feb', revenue: 320000 },
      { label: 'Mar', revenue: 390000 },
      { label: 'Apr', revenue: 340000 },
      { label: 'May', revenue: 410000 },
      { label: 'Jun', revenue: 380000 },
      { label: 'Jul', revenue: 445000 },
      { label: 'Aug', revenue: 360000 },
      { label: 'Sep', revenue: 295000 },
      { label: 'Oct', revenue: 320000 },
      { label: 'Nov', revenue: 375000 },
      { label: 'Dec', revenue: 205000 },
    ],
    statusCounts: { COMPLETED: 890, IN_PROGRESS: 56, OPEN: 48, READY: 22, QUALITY_CHECK: 18, WAITING_FOR_PARTS: 48, CANCELLED: 52 },
    topServices: [
      { name: 'Oil Change',    count: 428, revenue:  856000 },
      { name: 'Brake Service', count: 312, revenue: 1092000 },
      { name: 'Tyre Rotation', count: 244, revenue:  488000 },
      { name: 'AC Service',    count: 186, revenue:  855600 },
      { name: 'Battery Check', count: 142, revenue:  241400 },
    ],
    technicians: [
      { name: 'Suresh Kumar', initials: 'SK', jobs: 498, revenue: 1820000, rating: 4.9 },
      { name: 'Mahesh Reddy', initials: 'MR', jobs: 410, revenue: 1480000, rating: 4.7 },
      { name: 'Ganesh Patel', initials: 'GP', jobs: 226, revenue:  820000, rating: 4.6 },
    ],
    newCustomers: 384, returningCustomers: 750,
  },
};

/* ─── SVG helpers ────────────────────────────────────────── */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  // clamp to avoid full-circle degenerate case
  const end = Math.min(endDeg, startDeg + 359.99);
  const large = end - startDeg > 180 ? 1 : 0;
  const o1 = polarToCartesian(cx, cy, outerR, end);
  const o2 = polarToCartesian(cx, cy, outerR, startDeg);
  const i1 = polarToCartesian(cx, cy, innerR, end);
  const i2 = polarToCartesian(cx, cy, innerR, startDeg);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 0 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 1 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

function smoothLinePath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = (pts[i].x + pts[i + 1].x) / 2;
    d += ` C ${cp},${pts[i].y} ${cp},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

/* ─── Chart components ───────────────────────────────────── */
function LineChart({ data }: { data: { label: string; revenue: number }[] }) {
  const W = Dimensions.get('window').width - 40 - 36; // screen - outer pad - card pad
  const H = 160;
  const padL = 4; const padR = 8; const padT = 24; const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1 || 1)) * chartW,
    y: padT + (1 - d.revenue / maxVal) * chartH,
    revenue: d.revenue,
    label: d.label,
  }));

  const linePath = smoothLinePath(pts);
  const areaPath = pts.length >= 2
    ? linePath + ` L ${pts[pts.length - 1].x} ${padT + chartH} L ${pts[0].x} ${padT + chartH} Z`
    : '';

  return (
    <View style={{ height: H }}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgGrad id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.18} />
            <Stop offset="100%" stopColor={PRIMARY} stopOpacity={0}    />
          </SvgGrad>
        </Defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padT + pct * chartH;
          const val = maxVal * (1 - pct);
          return (
            <G key={pct}>
              <Path d={`M ${padL} ${y} L ${padL + chartW} ${y}`} stroke="#F1F5F9" strokeWidth={1} />
              <SvgText x={padL} y={y - 3} fontSize={8} fill={MUTED} textAnchor="start">
                {val >= 100000
                  ? `${(val / 100000).toFixed(1)}L`
                  : val >= 1000
                  ? `${(val / 1000).toFixed(0)}k`
                  : String(Math.round(val))}
              </SvgText>
            </G>
          );
        })}

        {/* Area fill */}
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

        {/* Line */}
        {linePath ? (
          <Path d={linePath} stroke={PRIMARY} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {/* Dots + value labels */}
        {pts.map((pt, i) => (
          <G key={i}>
            <Circle cx={pt.x} cy={pt.y} r={4} fill={CARD} stroke={PRIMARY} strokeWidth={2} />
            {/* x-axis labels */}
            <SvgText x={pt.x} y={H - 6} fontSize={9} fill={MUTED} textAnchor="middle">{pt.label}</SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
}

function DonutChart({ counts }: { counts: Record<string, number> }) {
  const SIZE  = 160;
  const cx = SIZE / 2, cy = SIZE / 2;
  const outerR = 62, innerR = 40;
  const gapDeg = 2; // gap between segments

  const entries = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  let cursor = 0;
  const segments = entries.map(([key, val]) => {
    const sweep = (val / total) * 360;
    const start = cursor;
    const end   = cursor + sweep - gapDeg;
    cursor += sweep;
    return { key, val, start, end, color: STATUS_COLORS[key] ?? PRIMARY };
  });

  const completed = counts.COMPLETED ?? 0;
  const completePct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <Svg width={SIZE} height={SIZE}>
        {segments.map(seg => (
          <Path
            key={seg.key}
            d={donutSegmentPath(cx, cy, outerR, innerR, seg.start, seg.end)}
            fill={seg.color}
          />
        ))}
        {/* Centre label */}
        <SvgText x={cx} y={cy - 8}  fontSize={22} fontWeight="bold" fill={TEXT} textAnchor="middle">{completePct}%</SvgText>
        <SvgText x={cx} y={cy + 10} fontSize={9}  fill={MUTED} textAnchor="middle">Completed</SvgText>
      </Svg>

      {/* Legend */}
      <View style={{ flex: 1, gap: 6 }}>
        {segments.map(seg => (
          <View key={seg.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
              <Text style={{ fontSize: 11, color: MUTED, fontWeight: '500' }} numberOfLines={1}>
                {STATUS_LABELS[seg.key] ?? seg.key}
              </Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: TEXT }}>{seg.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function HorizontalBars({ items }: { items: { name: string; count: number; revenue: number }[] }) {
  const maxCount = Math.max(...items.map(i => i.count), 1);
  return (
    <View style={{ gap: 12 }}>
      {items.map((item, idx) => {
        const pct = (item.count / maxCount) * 100;
        const colors: [string, string][] = [
          ['#C41E3A', '#E11D48'],
          ['#7C3AED', '#8B5CF6'],
          ['#0369A1', '#0EA5E9'],
          ['#065F46', '#10B981'],
          ['#92400E', '#F59E0B'],
        ];
        const [c1, c2] = colors[idx % colors.length];
        return (
          <View key={item.name} style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT }}>{item.name}</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: MUTED }}>{item.count} jobs</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c1 }}>{formatCurrency(item.revenue)}</Text>
              </View>
            </View>
            <View style={{ height: 8, backgroundColor: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
              <LinearGradient
                colors={[c1, c2]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ width: `${pct}%`, height: '100%', borderRadius: 6 }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function TechnicianList({ techs }: { techs: { name: string; initials: string; jobs: number; revenue: number; rating: number }[] }) {
  const maxJobs = Math.max(...techs.map(t => t.jobs), 1);
  return (
    <View style={{ gap: 16 }}>
      {techs.map((t, i) => (
        <View key={t.name} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Avatar */}
            <LinearGradient
              colors={i === 0 ? ['#921527', '#C41E3A'] : ['#64748B', '#94A3B8']}
              style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{t.initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{t.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Feather name="star" size={11} color={WARNING} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: WARNING }}>{t.rating}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: MUTED }}>{t.jobs} jobs</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: PRIMARY }}>{formatCurrency(t.revenue)}</Text>
              </View>
            </View>
          </View>
          {/* Progress bar */}
          <View style={{ height: 5, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <LinearGradient
              colors={i === 0 ? ['#921527', '#C41E3A'] : ['#94A3B8', '#CBD5E1']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ width: `${(t.jobs / maxJobs) * 100}%`, height: '100%', borderRadius: 4 }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ─── Section card ───────────────────────────────────────── */
function SectionCard({ icon, title, iconBg = '#FEE2E2', iconFg = PRIMARY, subtitle, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string; iconBg?: string; iconFg?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={cardSt.card}>
      <View style={cardSt.header}>
        <View style={[cardSt.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cardSt.title}>{title}</Text>
          {subtitle ? <Text style={cardSt.sub}>{subtitle}</Text> : null}
        </View>
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
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
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
  sub:      { fontSize: 11, color: MUTED, marginTop: 1 },
  body:     { padding: 18 },
});

/* ─── Stat mini-card ─────────────────────────────────────── */
function MiniStat({ label, value, icon, bg, fg }: { label: string; value: string; icon: React.ComponentProps<typeof Feather>['name']; bg: string; fg: string }) {
  return (
    <View style={miniSt.card}>
      <View style={[miniSt.icon, { backgroundColor: bg }]}>
        <Feather name={icon} size={14} color={fg} />
      </View>
      <Text style={[miniSt.value, { color: fg }]}>{value}</Text>
      <Text style={miniSt.label}>{label}</Text>
    </View>
  );
}
const miniSt = StyleSheet.create({
  card:  { flex: 1, backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 4,
           ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 }, android: { elevation: 1 }, default: {} }) },
  icon:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  label: { fontSize: 10, color: MUTED, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
});

/* ─── Screen ─────────────────────────────────────────────── */
export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('month');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const d = MOCK[period];

  const avgJobValue    = d.totalJobs > 0 ? d.totalRevenue / d.totalJobs : 0;
  const completionRate = d.totalJobs > 0 ? Math.round((d.completedJobs / d.totalJobs) * 100) : 0;
  const totalCustomers = d.newCustomers + d.returningCustomers;
  const repeatRate     = totalCustomers > 0 ? Math.round((d.returningCustomers / totalCustomers) * 100) : 0;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.pageTitle}>Analytics</Text>
          <Text style={styles.pageSub}>Performance overview</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Period toggle */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.value}
              style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
              onPress={() => setPeriod(p.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero KPI cards */}
        <View style={styles.heroRow}>
          <LinearGradient colors={['#921527', '#C41E3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroBubble} />
            <View style={styles.heroIconWrap}><Feather name="trending-up" size={18} color="#fff" /></View>
            <Text style={styles.heroValue}>{formatCurrency(d.totalRevenue)}</Text>
            <Text style={styles.heroLabel}>Total Revenue</Text>
          </LinearGradient>
          <LinearGradient colors={['#C41E3A', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
            <View style={styles.heroBubble} />
            <View style={styles.heroIconWrap}><Feather name="briefcase" size={18} color="#fff" /></View>
            <Text style={styles.heroValue}>{d.totalJobs}</Text>
            <Text style={styles.heroLabel}>Total Jobs</Text>
          </LinearGradient>
        </View>

        {/* Mini metric row */}
        <View style={styles.metricsRow}>
          <MiniStat label="Avg Job"     value={formatCurrency(avgJobValue)}  icon="dollar-sign"  bg="#FFFBEB" fg={WARNING} />
          <MiniStat label="Complete"    value={`${completionRate}%`}          icon="check-circle" bg="#ECFDF5" fg={SUCCESS} />
          <MiniStat label="Cancelled"   value={String(d.cancelledJobs)}       icon="x-circle"     bg="#FEE2E2" fg={PRIMARY} />
        </View>

        {/* ── Revenue trend (line chart) ── */}
        <SectionCard
          icon="trending-up"
          title="Revenue Trend"
          subtitle={period === 'week' ? 'Last 7 days' : period === 'month' ? 'Last 4 weeks' : 'Last 12 months'}
        >
          <LineChart data={d.graph} />
        </SectionCard>

        {/* ── Jobs by status (donut) ── */}
        <SectionCard icon="pie-chart" title="Jobs by Status" iconBg="#F5F3FF" iconFg={INDIGO}
          subtitle={`${d.totalJobs} total jobs`}>
          <DonutChart counts={d.statusCounts} />
        </SectionCard>

        {/* ── Top services (horizontal bars) ── */}
        <SectionCard icon="tool" title="Top Services" iconBg="#F0FDF4" iconFg={SUCCESS}
          subtitle="By job count & revenue">
          <HorizontalBars items={d.topServices} />
        </SectionCard>

        {/* ── Technician leaderboard ── */}
        <SectionCard icon="users" title="Technician Performance" iconBg="#FFFBEB" iconFg={WARNING}
          subtitle="Jobs completed & revenue">
          <TechnicianList techs={d.technicians} />
        </SectionCard>

        {/* ── Customer insights ── */}
        <SectionCard icon="user-check" title="Customer Insights" iconBg="#FEE2E2" iconFg={INDIGO}>
          {/* Split bar */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', height: 14 }}>
              <LinearGradient
                colors={['#921527', '#C41E3A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: d.newCustomers, height: '100%' }}
              />
              <LinearGradient
                colors={['#6366F1', '#818CF8']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flex: d.returningCustomers, height: '100%' }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY }} />
                  <Text style={{ fontSize: 12, color: MUTED }}>New Customers</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: PRIMARY, marginLeft: 14 }}>{d.newCustomers}</Text>
              </View>
              <View style={{ gap: 3, alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 12, color: MUTED }}>Returning</Text>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: INDIGO }} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: INDIGO }}>{d.returningCustomers}</Text>
              </View>
            </View>
            {/* Stats row */}
            <View style={styles.insightRow}>
              <View style={styles.insightCell}>
                <Text style={styles.insightVal}>{totalCustomers}</Text>
                <Text style={styles.insightLbl}>Total Customers</Text>
              </View>
              <View style={[styles.insightCell, styles.insightCellMid]}>
                <Text style={styles.insightVal}>{repeatRate}%</Text>
                <Text style={styles.insightLbl}>Repeat Rate</Text>
              </View>
              <View style={[styles.insightCell, { alignItems: 'flex-end' }]}>
                <Text style={styles.insightVal}>{formatCurrency(d.totalRevenue / (totalCustomers || 1))}</Text>
                <Text style={styles.insightLbl}>Avg / Customer</Text>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* ── Bookings summary ── */}
        <SectionCard icon="calendar" title="Booking Summary" iconBg="#FFF7ED" iconFg="#F97316">
          <View style={{ gap: 0 }}>
            {([
              { label: 'Total Received',     val: d.totalJobs,      color: '#F97316' },
              { label: 'Successfully Closed', val: d.completedJobs, color: SUCCESS   },
              { label: 'Cancelled',           val: d.cancelledJobs, color: PRIMARY   },
              { label: 'Conversion Rate',     val: `${completionRate}%`, color: INDIGO },
            ] as const).map((row, i, arr) => (
              <View key={row.label} style={[styles.statRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: row.color }} />
                  <Text style={styles.statLabel}>{row.label}</Text>
                </View>
                <Text style={[styles.statValue, { color: row.color }]}>{row.val}</Text>
              </View>
            ))}
          </View>
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
  pageTitle: { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  pageSub:   { fontSize: 13, color: MUTED, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#A7F3D0' },
  liveDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: SUCCESS },
  liveText:  { fontSize: 11, fontWeight: '700', color: SUCCESS },

  body:      { paddingHorizontal: 20, gap: 14 },

  periodRow: {
    flexDirection: 'row', backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 4, gap: 4,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  periodBtn:        { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  periodBtnActive:  { backgroundColor: PRIMARY },
  periodText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  periodTextActive: { color: '#fff' },

  heroRow: { flexDirection: 'row', gap: 12 },
  heroCard: {
    flex: 1, borderRadius: 20, padding: 18, overflow: 'hidden', minHeight: 130,
    justifyContent: 'flex-end',
    ...Platform.select({
      ios:     { shadowColor: INDIGO, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  heroBubble:   { position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroValue:    { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  heroLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  metricsRow: { flexDirection: 'row', gap: 10 },

  statRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  statLabel: { fontSize: 13, color: TEXT, fontWeight: '500' },
  statValue: { fontSize: 14, fontWeight: '800' },

  insightRow:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14, marginTop: 4 },
  insightCell:    { flex: 1, gap: 3 },
  insightCellMid: { alignItems: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F1F5F9', paddingHorizontal: 8 },
  insightVal:     { fontSize: 15, fontWeight: '800', color: TEXT },
  insightLbl:     { fontSize: 10, color: MUTED, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
});
