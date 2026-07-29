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
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  G,
  Line,
} from 'react-native-svg';
import { ArrowUpRight } from 'lucide-react-native';

/* ─── Shadow ─────────────────────────────────────────────── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

/* ─── Static data ────────────────────────────────────────── */
const PERIODS = ['7D', '30D', '90D'];

const revenueData = [40,35,45,38,52,48,55,42,60,65,58,70,62,75,68,80,72,85,78,90,82,88,85,92,88,94,90,96,92,98];

const TOP_SERVICES = [
  { name: 'Full Service',   percent: 42 },
  { name: 'Oil Change',     percent: 28 },
  { name: 'Brake Service',  percent: 14 },
  { name: 'AC Service',     percent: 10 },
  { name: 'Electrical',     percent: 6  },
];

/* ─── Revenue Trend Chart ────────────────────────────────── */
function RevenueTrendChart() {
  const { width } = useWindowDimensions();
  const chartW = width - 64; // mx-4 (16*2) + p-4 card padding (16*2)
  const chartH = 128;

  const points = revenueData.map((v, i) => ({
    x: (i / (revenueData.length - 1)) * chartW,
    y: chartH - (v / 100) * chartH,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath = linePath + ` L${chartW.toFixed(1)} ${chartH} L0 ${chartH} Z`;

  // Peak point: highest y-value closest to the right (index of max value)
  const peakIndex = revenueData.indexOf(Math.max(...revenueData));
  const peakPt = points[peakIndex];

  // Tooltip position: keep it within bounds
  const tooltipX = Math.min(peakPt.x - 25, chartW - 50);
  const tooltipY = peakPt.y - 26;

  // X-axis label positions (4 evenly spaced)
  const xLabels = [
    { label: 'Week 1', x: chartW * (0 / 3) },
    { label: 'Week 2', x: chartW * (1 / 3) },
    { label: 'Week 3', x: chartW * (2 / 3) },
    { label: 'Week 4', x: chartW * (3 / 3) },
  ];

  return (
    <View style={{ height: chartH + 20 }}>
      <Svg width={chartW} height={chartH + 20}>
        <Defs>
          <SvgLinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="rgba(196,30,58,0.15)" />
            <Stop offset="100%" stopColor="rgba(196,30,58,0)" />
          </SvgLinearGradient>
        </Defs>

        {/* Area fill */}
        <Path d={areaPath} fill="url(#chartGrad)" />

        {/* Line */}
        <Path
          d={linePath}
          fill="none"
          stroke="#C41E3A"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Vertical dashed cursor line at peak */}
        <Line
          x1={peakPt.x.toFixed(1)}
          y1={peakPt.y.toFixed(1)}
          x2={peakPt.x.toFixed(1)}
          y2={chartH}
          stroke="#E2E8F0"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Peak circle */}
        <Circle
          cx={peakPt.x}
          cy={peakPt.y}
          r={4}
          fill="#C41E3A"
          stroke="white"
          strokeWidth={2}
        />

        {/* Tooltip */}
        <G transform={`translate(${tooltipX}, ${tooltipY < 0 ? 2 : tooltipY})`}>
          <Rect width={50} height={20} rx={4} fill="#0F172A" />
          <SvgText
            x={25}
            y={14}
            fill="white"
            fontSize={10}
            fontWeight="bold"
            textAnchor="middle"
          >
            ₹15.2K
          </SvgText>
        </G>

        {/* X-axis labels */}
        {xLabels.map((lbl) => (
          <SvgText
            key={lbl.label}
            x={lbl.x}
            y={chartH + 14}
            fill="#94A3B8"
            fontSize={10}
            textAnchor="middle"
          >
            {lbl.label}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

/* ─── Circular Progress (Returning Customers) ────────────── */
function CircularProgress({ percent }: { percent: number }) {
  return (
    <View style={styles.circleWrap}>
      <Svg viewBox="0 0 36 36" width={48} height={48} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background track */}
        <Path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={3.5}
        />
        {/* Progress arc */}
        <Path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#C41E3A"
          strokeWidth={3.5}
          strokeDasharray={`${percent} 100`}
        />
      </Svg>
      {/* Center label — not inside SVG because SVG is rotated */}
      <View style={styles.circleLabel}>
        <Text style={styles.circleLabelText}>{percent}%</Text>
      </View>
    </View>
  );
}

/* ─── Star Rating ────────────────────────────────────────── */
const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function StarRating() {
  return (
    <View style={styles.starsRow}>
      {/* 4 full stars */}
      {[1, 2, 3, 4].map((s) => (
        <Svg key={s} width={12} height={12} viewBox="0 0 24 24">
          <Path d={STAR_PATH} fill="#C41E3A" />
        </Svg>
      ))}
      {/* Half star */}
      <Svg width={12} height={12} viewBox="0 0 24 24">
        <Defs>
          <SvgLinearGradient id="halfStarGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="50%" stopColor="#C41E3A" />
            <Stop offset="50%" stopColor="#E2E8F0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={STAR_PATH} fill="url(#halfStarGrad)" />
      </Svg>
    </View>
  );
}

/* ─── Screen ─────────────────────────────────────────────── */
export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [activePeriod, setActivePeriod] = useState('30D');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
      >
        {/* Page header */}
        <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSub}>Performance overview</Text>
        </View>

        {/* Time period toggle */}
        <View style={styles.periodToggle}>
          {PERIODS.map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodBtn, activePeriod === period && styles.periodBtnActive]}
              onPress={() => setActivePeriod(period)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, activePeriod === period && styles.periodTextActive]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI summary row */}
        <View style={styles.kpiRow}>
          {/* Revenue */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Revenue</Text>
            <Text style={styles.kpiValue}>₹3.24L</Text>
            <View style={styles.kpiChange}>
              <ArrowUpRight size={10} color="#059669" strokeWidth={2} />
              <Text style={styles.kpiChangeText}> +12%</Text>
            </View>
          </View>

          {/* Jobs Done */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Jobs Done</Text>
            <Text style={styles.kpiValue}>186</Text>
            <View style={styles.kpiChange}>
              <ArrowUpRight size={10} color="#059669" strokeWidth={2} />
              <Text style={styles.kpiChangeText}> +8%</Text>
            </View>
          </View>

          {/* Avg Ticket */}
          <View style={[styles.kpiCard, SHADOW_CARD]}>
            <Text style={styles.kpiLabel}>Avg Ticket</Text>
            <Text style={styles.kpiValue}>₹1,742</Text>
            <View style={styles.kpiChange}>
              <ArrowUpRight size={10} color="#059669" strokeWidth={2} />
              <Text style={styles.kpiChangeText}> +4%</Text>
            </View>
          </View>
        </View>

        {/* Revenue Trend Chart card */}
        <View style={[styles.card, SHADOW_CARD]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Revenue Trend</Text>
            <Text style={styles.cardSubtitle}>₹3.24L this month</Text>
          </View>
          <RevenueTrendChart />
        </View>

        {/* Top Services card */}
        <View style={[styles.card, SHADOW_CARD]}>
          <Text style={styles.cardTitle}>Top Services</Text>
          <View style={styles.servicesList}>
            {TOP_SERVICES.map((service, idx) => (
              <View key={idx} style={styles.serviceRow}>
                <Text style={styles.serviceName} numberOfLines={1}>{service.name}</Text>
                <View style={styles.serviceBarTrack}>
                  <View style={[styles.serviceBarFill, { width: `${service.percent}%` as any }]} />
                </View>
                <Text style={styles.servicePercent}>{service.percent}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom stats row: Returning Customers + Avg Rating */}
        <View style={styles.statsRow}>
          {/* Returning Customers */}
          <View style={[styles.statCard, SHADOW_CARD]}>
            <Text style={styles.statCardLabel}>Returning Customers</Text>
            <View style={styles.statCardContent}>
              <CircularProgress percent={68} />
              <View style={styles.statCardMeta}>
                <View style={styles.statChangeRow}>
                  <ArrowUpRight size={10} color="#059669" strokeWidth={2} />
                  <Text style={styles.statChangeText}> +5%</Text>
                </View>
                <Text style={styles.statChangeSub}>vs last mo.</Text>
              </View>
            </View>
          </View>

          {/* Avg Rating */}
          <View style={[styles.statCard, SHADOW_CARD]}>
            <Text style={styles.statCardLabel}>Avg Rating</Text>
            <View style={styles.ratingContent}>
              <Text style={styles.ratingValue}>4.8</Text>
              <StarRating />
              <Text style={styles.ratingReviews}>142 reviews</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    // paddingBottom set dynamically
  },

  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* Period toggle */
  periodToggle: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
  },
  periodTextActive: {
    fontWeight: '600',
    color: '#0F172A',
  },

  /* KPI row */
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  kpiChange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  kpiChangeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '500',
  },

  /* Generic card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },

  /* Services list */
  servicesList: {
    marginTop: 16,
    gap: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    width: 112,
  },
  serviceBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  serviceBarFill: {
    height: 6,
    backgroundColor: '#C41E3A',
    borderRadius: 3,
  },
  servicePercent: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    width: 32,
    textAlign: 'right',
  },

  /* Bottom stats row */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },

  /* Circular progress */
  circleWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },

  statCardMeta: {
    flex: 1,
  },
  statChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChangeText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '500',
  },
  statChangeSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },

  /* Rating */
  ratingContent: {
    marginTop: 8,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 28,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  ratingReviews: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
});
