import React, { useState } from 'react';
import {
  Alert, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMockBooking, updateMockBookingStatus } from '@/src/data/mockBookings';
import Avatar from '@/src/components/ui/Avatar';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import { formatDate, formatDateTime } from '@/src/utils/helpers';

/* ── Seeded mock history ── */
const PAST_SERVICES = [
  { service: 'Oil Change & Filter',        amount: 1800,  tech: 'Suresh Kumar' },
  { service: 'Brake Pad Replacement',      amount: 4500,  tech: 'Mahesh Reddy' },
  { service: 'AC Gas Refill',              amount: 3200,  tech: 'Ganesh Patel' },
  { service: 'Full Car Service',           amount: 7500,  tech: 'Suresh Kumar' },
  { service: 'Tyre Rotation & Balancing',  amount: 1200,  tech: 'Mahesh Reddy' },
  { service: 'Battery Replacement',        amount: 5800,  tech: 'Ganesh Patel' },
  { service: 'Engine Diagnostics',         amount: 2000,  tech: 'Suresh Kumar' },
  { service: 'Wheel Alignment',            amount: 900,   tech: 'Mahesh Reddy' },
  { service: 'Clutch Plate Replacement',   amount: 9500,  tech: 'Ganesh Patel' },
  { service: 'Coolant Flush',              amount: 1500,  tech: 'Suresh Kumar' },
  { service: 'Suspension Check & Repair',  amount: 6200,  tech: 'Mahesh Reddy' },
  { service: 'Spark Plug Replacement',     amount: 2400,  tech: 'Ganesh Patel' },
];

const PAST_STATUS = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'CANCELLED'];
const VEHICLES    = ['MH12 AB 1234', 'KA05 XY 9876', 'DL8C 4321', 'TN09 PQ 5678', 'GJ01 ZZ 1111'];

// Simple seeded RNG (mulberry32) — same seed → same output every render
function seededRng(seed: number) {
  let s = seed;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function idToSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getVisitHistory(bookingId: string) {
  const rng   = seededRng(idToSeed(bookingId));
  const count = 2 + Math.floor(rng() * 3); // 2–4 past visits
  const now   = new Date('2026-07-27');
  const visits = [];
  let daysBack = 30 + Math.floor(rng() * 20);

  for (let i = 0; i < count; i++) {
    daysBack += 40 + Math.floor(rng() * 60);
    const date     = new Date(now.getTime() - daysBack * 86400000);
    const svcIdx   = Math.floor(rng() * PAST_SERVICES.length);
    const stIdx    = Math.floor(rng() * PAST_STATUS.length);
    const vehIdx   = Math.floor(rng() * VEHICLES.length);
    const jitter   = 1 + (rng() * 0.4 - 0.2);          // ±20% price variation
    visits.push({
      date,
      service:  PAST_SERVICES[svcIdx].service,
      amount:   Math.round(PAST_SERVICES[svcIdx].amount * jitter / 100) * 100,
      tech:     PAST_SERVICES[svcIdx].tech,
      status:   PAST_STATUS[stIdx],
      vehicle:  VEHICLES[vehIdx],
      jobId:    `JOB-${1000 + Math.floor(rng() * 8000)}`,
    });
  }
  return visits;
}

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const DANGER  = '#EF4444';
const SUCCESS = '#10B981';
const WARNING = '#F59E0B';
const PURPLE  = '#8B5CF6';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  PENDING:   { label: 'Pending',   color: WARNING, bg: '#FFFBEB', icon: 'clock'     },
  ACCEPTED:  { label: 'Confirmed', color: SUCCESS, bg: '#ECFDF5', icon: 'check-circle' },
  REJECTED:  { label: 'Rejected',  color: DANGER,  bg: '#FEF2F2', icon: 'x-circle'  },
  CONVERTED: { label: 'Converted', color: PURPLE,  bg: '#F5F3FF', icon: 'briefcase' },
};

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  // Local state tracks status changes so the UI re-renders immediately
  const [, tick] = useState(0);
  const rerender = () => tick(n => n + 1);

  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | 'create-job' | null>(null);

  const booking = getMockBooking(id ?? '');

  if (!booking) {
    return (
      <View style={[styles.root, { backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }]}>
        <Feather name="alert-circle" size={40} color={MUTED} />
        <Text style={{ color: MUTED, marginTop: 12, fontSize: 14 }}>Booking not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: PRIMARY, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const st      = STATUS_META[booking.status] ?? { label: booking.status, color: MUTED, bg: '#F3F4F6', icon: 'circle' };
  const history = getVisitHistory(booking.id);

  function handleConfirm() {
    if (!booking) return;
    if (confirmAction === 'accept') {
      updateMockBookingStatus(booking.id, 'ACCEPTED');
      rerender();
    } else if (confirmAction === 'reject') {
      updateMockBookingStatus(booking.id, 'REJECTED');
      rerender();
    } else if (confirmAction === 'create-job') {
      updateMockBookingStatus(booking.id, 'CONVERTED');
      rerender();
      Alert.alert(
        'Job Card Created',
        `A new job card has been created for ${booking.customer_name ?? 'this customer'}.`,
        [{ text: 'Go to Jobs', onPress: () => router.replace('/(tabs)/jobs') }, { text: 'Stay', style: 'cancel' }],
      );
    }
    setConfirmAction(null);
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Booking Detail</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Status hero card ── */}
        <View style={[styles.heroCard, { borderColor: `${st.color}30` }]}>
          {/* Avatar + name */}
          <View style={styles.heroTop}>
            <Avatar name={booking.customer_name} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{booking.customer_name ?? '—'}</Text>
              {booking.customer_mobile ? (
                <Text style={styles.heroPhone}>{booking.customer_mobile}</Text>
              ) : null}
            </View>
            {/* Status pill */}
            <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
              <Feather name={st.icon} size={12} color={st.color} />
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.heroDivider} />

          {/* Booking meta */}
          <View style={styles.heroMeta}>
            {booking.service_requested ? (
              <View style={styles.heroMetaItem}>
                <View style={[styles.heroMetaIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="tool" size={12} color={PRIMARY} />
                </View>
                <Text style={styles.heroMetaText} numberOfLines={2}>{booking.service_requested}</Text>
              </View>
            ) : null}
            {booking.booking_date ? (
              <View style={styles.heroMetaItem}>
                <View style={[styles.heroMetaIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Feather name="calendar" size={12} color="#3B82F6" />
                </View>
                <Text style={styles.heroMetaText}>
                  {new Date(booking.booking_date).toLocaleDateString('en-IN', {
                    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
            ) : null}
            <View style={styles.heroMetaItem}>
              <View style={[styles.heroMetaIcon, { backgroundColor: '#F5F3FF' }]}>
                <Feather name="clock" size={12} color={PURPLE} />
              </View>
              <Text style={styles.heroMetaText}>
                Received {formatDateTime(booking.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Customer info ── */}
        <SectionCard icon="user" title="Customer Details">
          <InfoRow label="Full Name"   value={booking.customer_name   ?? 'Not specified'} />
          <InfoRow label="Mobile"      value={booking.customer_mobile ?? 'Not specified'} />
          {booking.service_requested
            ? <InfoRow label="Service Requested" value={booking.service_requested} />
            : null}
          {booking.booking_date
            ? <InfoRow label="Preferred Date" value={formatDate(booking.booking_date)} last />
            : <InfoRow label="Requested On" value={formatDate(booking.created_at)} last />}
        </SectionCard>

        {/* ── Notes ── */}
        {booking.notes ? (
          <SectionCard icon="file-text" title="Customer Notes" iconBg="#FFF7ED" iconFg="#F97316">
            <Text style={styles.notesText}>{booking.notes}</Text>
          </SectionCard>
        ) : null}

        {/* ── Visit History ── */}
        <SectionCard icon="clock" title="Visit History" iconBg="#F0FDF4" iconFg={SUCCESS}>
          {history.map((visit, i) => {
            const isCompleted = visit.status === 'COMPLETED';
            const isLast      = i === history.length - 1;
            return (
              <View key={visit.jobId} style={[styles.historyItem, !isLast && styles.historyItemBorder]}>
                {/* Left: date column */}
                <View style={styles.historyDateCol}>
                  <Text style={styles.historyDay}>
                    {visit.date.toLocaleDateString('en-IN', { day: '2-digit' })}
                  </Text>
                  <Text style={styles.historyMonth}>
                    {visit.date.toLocaleDateString('en-IN', { month: 'short' })}
                  </Text>
                  <Text style={styles.historyYear}>
                    {visit.date.getFullYear()}
                  </Text>
                </View>

                {/* Divider line */}
                <View style={styles.historyDivider} />

                {/* Right: details */}
                <View style={styles.historyDetails}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyService} numberOfLines={1}>{visit.service}</Text>
                    <View style={[
                      styles.historyStatusPill,
                      { backgroundColor: isCompleted ? '#ECFDF5' : '#FEF2F2' },
                    ]}>
                      <Text style={[
                        styles.historyStatusText,
                        { color: isCompleted ? SUCCESS : DANGER },
                      ]}>
                        {isCompleted ? 'Done' : 'Cancelled'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyMetaRow}>
                    <View style={styles.historyMetaItem}>
                      <Feather name="user" size={10} color={MUTED} />
                      <Text style={styles.historyMetaText}>{visit.tech}</Text>
                    </View>
                    <View style={styles.historyMetaItem}>
                      <Feather name="tag" size={10} color={MUTED} />
                      <Text style={styles.historyMetaText}>{visit.jobId}</Text>
                    </View>
                  </View>

                  <View style={styles.historyBottomRow}>
                    <View style={styles.historyMetaItem}>
                      <Feather name="truck" size={10} color={MUTED} />
                      <Text style={styles.historyMetaText}>{visit.vehicle}</Text>
                    </View>
                    <Text style={[styles.historyAmount, { color: isCompleted ? PRIMARY : MUTED }]}>
                      {isCompleted ? `₹${visit.amount.toLocaleString('en-IN')}` : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </SectionCard>

        {/* ── Timeline ── */}
        <SectionCard icon="activity" title="Status Timeline" iconBg="#F5F3FF" iconFg={PURPLE}>
          <View style={styles.timeline}>
            {(
              [
                { status: 'PENDING',   label: 'Request Received', date: booking.created_at },
                booking.status !== 'PENDING'
                  ? { status: booking.status, label:
                      booking.status === 'ACCEPTED'  ? 'Booking Confirmed' :
                      booking.status === 'REJECTED'  ? 'Booking Rejected'  :
                      booking.status === 'CONVERTED' ? 'Converted to Job'  : booking.status,
                      date: booking.updated_at }
                  : null,
              ].filter(Boolean) as { status: string; label: string; date: string }[]
            ).map((step, i, arr) => {
              const isLast = i === arr.length - 1;
              const sMeta  = STATUS_META[step.status] ?? { color: MUTED, bg: '#F3F4F6', icon: 'circle' };
              return (
                <View key={step.status} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: sMeta.color }]}>
                      <Feather name={sMeta.icon as any} size={10} color="#fff" />
                    </View>
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: `${sMeta.color}40` }]} />}
                  </View>
                  <View style={styles.timelineRight}>
                    <Text style={styles.timelineLabel}>{step.label}</Text>
                    <Text style={styles.timelineDate}>{formatDateTime(step.date)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </SectionCard>

        {/* ── Actions ── */}
        {booking.status === 'PENDING' && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: DANGER }]}
              onPress={() => setConfirmAction('reject')}
              activeOpacity={0.85}
            >
              <Feather name="x" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: SUCCESS }]}
              onPress={() => setConfirmAction('accept')}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {booking.status === 'ACCEPTED' && (
          <TouchableOpacity
            onPress={() => setConfirmAction('create-job')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#921527', '#C41E3A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.convertBtn}
            >
              <Feather name="briefcase" size={18} color="#fff" />
              <Text style={styles.convertBtnText}>Convert to Job Card</Text>
              <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {(booking.status === 'REJECTED' || booking.status === 'CONVERTED') && (
          <View style={[styles.closedBanner, { backgroundColor: st.bg, borderColor: `${st.color}30` }]}>
            <Feather name={st.icon} size={16} color={st.color} />
            <Text style={[styles.closedText, { color: st.color }]}>
              {booking.status === 'REJECTED'
                ? 'This booking has been rejected.'
                : 'This booking was converted to a job card.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={confirmAction !== null}
        title={
          confirmAction === 'accept'     ? 'Accept Booking'
          : confirmAction === 'reject'   ? 'Reject Booking'
          : 'Create Job Card'
        }
        message={
          confirmAction === 'accept'     ? 'Confirm this booking and notify the customer?'
          : confirmAction === 'reject'   ? 'Are you sure you want to reject this booking?'
          : 'Convert this booking into a Job Card?'
        }
        destructive={confirmAction === 'reject'}
        confirmLabel={
          confirmAction === 'accept'     ? 'Accept'
          : confirmAction === 'reject'   ? 'Reject'
          : 'Create Job'
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pageTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: TEXT },

  content: { paddingHorizontal: 20, gap: 14 },

  /* Hero card */
  heroCard: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1.5, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  heroTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  heroName:   { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 3 },
  heroPhone:  { fontSize: 13, color: MUTED },
  heroDivider:{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  heroMeta:   { padding: 14, gap: 10 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  heroMetaIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  heroMetaText: { flex: 1, fontSize: 13, color: TEXT, fontWeight: '500', lineHeight: 18 },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },

  /* Section card */
  sectionCard: {
    backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sectionIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle:    { fontSize: 14, fontWeight: '700', color: TEXT },
  sectionBody:     { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 6 },

  /* Info row */
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: MUTED, flex: 1 },
  infoValue: { fontSize: 13, color: TEXT, fontWeight: '600', flex: 1.8, textAlign: 'right' },

  notesText: { fontSize: 14, color: MUTED, lineHeight: 22, paddingVertical: 10 },

  /* Timeline */
  timeline:      { paddingTop: 8, paddingBottom: 4 },
  timelineItem:  { flexDirection: 'row', gap: 12, marginBottom: 6 },
  timelineLeft:  { alignItems: 'center', width: 26 },
  timelineDot:   { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  timelineLine:  { width: 2, flex: 1, marginTop: 4, borderRadius: 2 },
  timelineRight: { flex: 1, paddingTop: 4, paddingBottom: 12 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: TEXT },
  timelineDate:  { fontSize: 11, color: MUTED, marginTop: 2 },

  /* Actions */
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    paddingVertical: 15, borderRadius: 16,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  convertBtn: {
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  convertBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },

  /* Visit history */
  historyItem:       { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14, gap: 14 },
  historyItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyDateCol:    { width: 34, alignItems: 'center', justifyContent: 'center', gap: 1 },
  historyDay:        { fontSize: 16, fontWeight: '800', color: TEXT, lineHeight: 18 },
  historyMonth:      { fontSize: 10, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.3 },
  historyYear:       { fontSize: 9, color: MUTED, marginTop: 1 },
  historyDivider:    { width: 1.5, borderRadius: 2, backgroundColor: '#E2E8F0' },
  historyDetails:    { flex: 1, gap: 6 },
  historyTopRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyService:    { flex: 1, fontSize: 13, fontWeight: '700', color: TEXT },
  historyStatusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  historyStatusText: { fontSize: 10, fontWeight: '700' },
  historyMetaRow:    { flexDirection: 'row', gap: 14 },
  historyBottomRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyMetaItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyMetaText:   { fontSize: 11, color: MUTED },
  historyAmount:     { fontSize: 13, fontWeight: '800' },

  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  closedText: { fontSize: 13, fontWeight: '600', flex: 1 },
});
