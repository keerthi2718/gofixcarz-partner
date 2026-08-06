import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import StatusBadge from '@/src/components/ui/StatusBadge';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency, formatDateTime } from '@/src/utils/helpers';
import type { JobDetailResponse, JobResponse, JobStatus, JobTimelineResponse } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';

const STATUS_FLOW: JobStatus[] = [
  'OPEN','IN_PROGRESS','WAITING_FOR_PARTS','QUALITY_CHECK','READY','COMPLETED','CANCELLED',
];

/* ── Per-status colour palette ── */
type StatusMeta = { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Feather>['name'] };
const STATUS_META: Record<string, StatusMeta> = {
  OPEN:              { label: 'Open',           color: '#2563EB', bg: '#EFF6FF', icon: 'clipboard'    },
  IN_PROGRESS:       { label: 'In Progress',    color: '#D97706', bg: '#FFFBEB', icon: 'tool'         },
  WAITING_FOR_PARTS: { label: 'Waiting Parts',  color: '#7C3AED', bg: '#F5F3FF', icon: 'clock'        },
  QUALITY_CHECK:     { label: 'QC Check',       color: '#0891B2', bg: '#ECFEFF', icon: 'check-square' },
  READY:             { label: 'Ready',          color: '#059669', bg: '#ECFDF5', icon: 'package'      },
  COMPLETED:         { label: 'Completed',      color: '#16A34A', bg: '#F0FDF4', icon: 'check-circle' },
  CANCELLED:         { label: 'Cancelled',      color: '#DC2626', bg: '#FEF2F2', icon: 'x-circle'     },
};

function metaFor(status: string): StatusMeta {
  // Normalise to UPPER_CASE so the lookup is case-insensitive
  return STATUS_META[status?.toUpperCase?.()] ?? { label: status, color: '#64748B', bg: '#F8FAFC', icon: 'circle' };
}

/* ── Colourful horizontal stepper ── */
const STEPPER_STEPS: { status: JobStatus; label: string }[] = [
  { status: 'OPEN',          label: 'Open'        },
  { status: 'IN_PROGRESS',   label: 'In Progress' },
  { status: 'QUALITY_CHECK', label: 'QC Check'    },
  { status: 'READY',         label: 'Ready'       },
  { status: 'COMPLETED',     label: 'Done'        },
];

function stepIndex(status: string) {
  return STEPPER_STEPS.findIndex(s => s.status === status);
}

function JobStepper({ status }: { status: string }) {
  const isCancelled = status === 'CANCELLED';
  const current     = isCancelled ? -1 : stepIndex(status);

  return (
    <View style={sp.card}>
      <View style={sp.headerRow}>
        <View style={sp.iconBox}>
          <Feather name="git-branch" size={14} color={PRIMARY} />
        </View>
        <Text style={sp.title}>Job Progress</Text>
        {!isCancelled && current >= 0 && (
          <View style={[sp.progressPill, { backgroundColor: metaFor(STEPPER_STEPS[current]?.status ?? 'OPEN').bg }]}>
            <Text style={[sp.progressPillText, { color: metaFor(STEPPER_STEPS[current]?.status ?? 'OPEN').color }]}>
              {current + 1}/{STEPPER_STEPS.length}
            </Text>
          </View>
        )}
      </View>

      {isCancelled ? (
        <View style={sp.cancelledRow}>
          <View style={sp.cancelledIcon}>
            <Feather name="x-circle" size={18} color="#DC2626" />
          </View>
          <View>
            <Text style={sp.cancelledTitle}>Job Cancelled</Text>
            <Text style={sp.cancelledSub}>This job has been cancelled</Text>
          </View>
        </View>
      ) : (
        <View style={sp.track}>
          {STEPPER_STEPS.map((step, i) => {
            const done    = i < current;
            const active  = i === current;
            const meta    = metaFor(step.status);
            const nodeColor = done ? '#10B981' : active ? meta.color : '#CBD5E1';
            const nodeBg    = done ? '#D1FAE5' : active ? meta.bg    : '#F8FAFC';

            return (
              <React.Fragment key={step.status}>
                <View style={sp.node}>
                  {/* Circle */}
                  <View style={[
                    sp.circle,
                    { backgroundColor: nodeBg, borderColor: nodeColor },
                    active && sp.circleActive,
                  ]}>
                    {done ? (
                      <Feather name="check" size={11} color="#10B981" />
                    ) : active ? (
                      <Feather name={meta.icon} size={11} color={meta.color} />
                    ) : (
                      <View style={[sp.innerDot, { backgroundColor: '#D1D5DB' }]} />
                    )}
                  </View>

                  {/* Glow ring on active */}
                  {active && (
                    <View style={[sp.glowRing, { borderColor: `${meta.color}30` }]} />
                  )}

                  <Text style={[
                    sp.label,
                    done   && { color: '#10B981', fontWeight: '600' },
                    active && { color: meta.color, fontWeight: '700' },
                    !done && !active && { color: '#CBD5E1' },
                  ]} numberOfLines={1}>
                    {step.label}
                  </Text>
                </View>

                {/* Connector */}
                {i < STEPPER_STEPS.length - 1 && (
                  <View style={sp.lineWrap}>
                    <View style={[sp.line, done && sp.lineDone]} />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ── Structured Job Timeline ── */
interface TLStage { status: string; label: string; desc: string }

const BASE_TIMELINE_STAGES: TLStage[] = [
  { status: 'OPEN',          label: 'Job Created',        desc: 'Job card has been created successfully'        },
  { status: 'IN_PROGRESS',   label: 'Work Started',       desc: 'Technician is working on the vehicle'         },
  { status: 'QUALITY_CHECK', label: 'Quality Check',      desc: 'Performing quality inspection on the vehicle'  },
  { status: 'READY',         label: 'Ready for Delivery', desc: 'Vehicle is ready for customer pickup'          },
  { status: 'COMPLETED',     label: 'Job Completed',      desc: 'Job has been successfully completed'           },
];
const WAITING_TL_STAGE: TLStage = {
  status: 'WAITING_FOR_PARTS', label: 'Waiting for Parts', desc: 'Waiting for spare parts to arrive',
};

function buildTimelineStages(currentStatus: string, timelines: JobTimelineResponse[]): TLStage[] {
  const normStatus = currentStatus?.toUpperCase?.() ?? '';
  const hasWaiting = normStatus === 'WAITING_FOR_PARTS'
    || timelines.some(t => t.status?.toUpperCase?.() === 'WAITING_FOR_PARTS');
  const stages = [...BASE_TIMELINE_STAGES];
  if (hasWaiting) {
    const idx = stages.findIndex(s => s.status === 'IN_PROGRESS');
    if (idx >= 0) stages.splice(idx + 1, 0, WAITING_TL_STAGE);
  }
  return stages;
}

type TLState = 'completed' | 'active' | 'pending';

function getStageState(stageIdx: number, currentIdx: number, normCurrent: string): TLState {
  if (normCurrent === 'CANCELLED') return 'pending';
  if (stageIdx < currentIdx)       return 'completed';
  if (stageIdx === currentIdx)     return 'active';
  return 'pending';
}

function JobTimeline({
  timelines = [],
  currentStatus,
}: {
  timelines?: JobTimelineResponse[];
  currentStatus: string;
}) {
  const normCurrent = currentStatus?.toUpperCase?.() ?? '';
  const stages      = buildTimelineStages(normCurrent, timelines);
  const currentIdx  = stages.findIndex(s => s.status === normCurrent);

  // Quick lookup: status → first timeline entry for that status
  const tlMap: Record<string, JobTimelineResponse> = {};
  for (const e of timelines) {
    const key = e.status?.toUpperCase?.() ?? '';
    if (!tlMap[key]) tlMap[key] = e;
  }

  return (
    <View style={tl.card}>
      {/* Header */}
      <View style={tl.headerRow}>
        <View style={tl.iconBox}>
          <Feather name="activity" size={14} color={PRIMARY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={tl.title}>Job Timeline</Text>
          <Text style={tl.subtitle}>Track the progress of this job</Text>
        </View>
      </View>

      {/* Stage rows */}
      <View style={tl.body}>
        {stages.map((stage, i) => {
          const state  = getStageState(i, currentIdx, normCurrent);
          const isLast = i === stages.length - 1;
          const entry  = tlMap[stage.status];
          const ts     = entry ? formatDateTime(entry.created_at) : null;
          const notes  = entry?.notes ?? null;

          const dotBg     = state === 'completed' ? '#10B981' : state === 'active' ? '#2563EB' : '#FFFFFF';
          const dotBorder = state === 'completed' ? '#10B981' : state === 'active' ? '#2563EB' : '#CBD5E1';
          const lineColor = state === 'completed' ? '#10B981' : '#E2E8F0';
          const nameColor = state === 'active'    ? '#1D4ED8' : state === 'pending' ? '#94A3B8' : TEXT;

          return (
            <View key={stage.status} style={tl.stageOuter}>
              {/* ── Left spine: dot + connector ── */}
              <View style={tl.spine}>
                <View style={[tl.dot, { backgroundColor: dotBg, borderColor: dotBorder }]}>
                  {state === 'completed' ? (
                    <Feather name="check" size={13} color="#fff" />
                  ) : (
                    <Text style={[tl.dotNum, { color: state === 'active' ? '#fff' : '#94A3B8' }]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                {!isLast && (
                  <View style={[tl.connector, { backgroundColor: lineColor }]} />
                )}
              </View>

              {/* ── Right content ── */}
              <View style={[
                tl.stageContent,
                state === 'active' && tl.stageContentActive,
                isLast && { marginBottom: 0 },
              ]}>
                {/* Name + badge */}
                <View style={tl.stageRow}>
                  <Text style={[tl.stageName, { color: nameColor }]} numberOfLines={1}>
                    {stage.label}
                  </Text>
                  {state === 'completed' && (
                    <View style={tl.badgeGreen}><Text style={tl.badgeGreenTxt}>Completed</Text></View>
                  )}
                  {state === 'active' && (
                    <View style={tl.badgeBlue}><Text style={tl.badgeBlueTxt}>In Progress</Text></View>
                  )}
                  {state === 'pending' && (
                    <View style={tl.badgeGrey}><Text style={tl.badgeGreyTxt}>Pending</Text></View>
                  )}
                </View>

                {/* Subtitle */}
                {state === 'active' && <Text style={tl.activeDesc}>{stage.desc}</Text>}
                {state === 'pending' && <Text style={tl.pendingDesc}>Pending</Text>}

                {/* Timestamp */}
                {!!ts && (
                  <View style={tl.tsRow}>
                    <Feather name="clock" size={11} color="#94A3B8" />
                    <Text style={tl.tsText}>{ts}</Text>
                  </View>
                )}

                {/* Notes */}
                {!!notes && (
                  <View style={tl.notesBox}>
                    <Feather name="message-square" size={11} color="#94A3B8" />
                    <Text style={tl.notesText}>{notes}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={tl.legend}>
        {([
          { color: '#10B981', label: 'Completed'  },
          { color: '#2563EB', label: 'In Progress' },
          { color: '#CBD5E1', label: 'Pending'     },
        ] as const).map(({ color, label }) => (
          <View key={label} style={tl.legendItem}>
            <View style={[tl.legendDot, { backgroundColor: color }]} />
            <Text style={tl.legendLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  title:        { fontSize: 14, fontWeight: '700', color: TEXT, flex: 1 },
  progressPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  progressPillText: { fontSize: 11, fontWeight: '700' },

  track: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 10, paddingTop: 20, paddingBottom: 18,
  },
  node:  { alignItems: 'center', width: 54, position: 'relative' },

  circle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 7, zIndex: 1,
  },
  circleActive: { borderWidth: 2 },

  glowRing: {
    position: 'absolute', top: -5, width: 42, height: 42,
    borderRadius: 21, borderWidth: 4, zIndex: 0,
  },

  innerDot: { width: 7, height: 7, borderRadius: 4 },

  label: { fontSize: 9, fontWeight: '500', textAlign: 'center', lineHeight: 13 },

  lineWrap: { flex: 1, paddingTop: 15 },
  line:     { height: 2.5, backgroundColor: '#E2E8F0', borderRadius: 2 },
  lineDone: { backgroundColor: '#A7F3D0' },

  cancelledRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 20,
    backgroundColor: '#FEF2F2',
  },
  cancelledIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelledTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  cancelledSub:   { fontSize: 12, color: '#F87171', marginTop: 2 },
});

const tl = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },

  /* Header */
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 14, fontWeight: '700', color: TEXT },
  subtitle: { fontSize: 11, color: MUTED, marginTop: 1 },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },

  stageOuter: { flexDirection: 'row', gap: 12 },

  /* Spine */
  spine:     { alignItems: 'center', width: 30, flexShrink: 0 },
  dot: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0,
  },
  dotNum:    { fontSize: 12, fontWeight: '700' },
  connector: { flex: 1, width: 2, borderRadius: 1, marginTop: 3, marginBottom: 3, minHeight: 24 },

  /* Stage content */
  stageContent: {
    flex: 1, borderRadius: 12,
    paddingHorizontal: 10, paddingTop: 3, paddingBottom: 18,
  },
  stageContentActive: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, marginBottom: 4,
  },
  stageRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8, marginBottom: 3,
  },
  stageName: { fontSize: 14, fontWeight: '700', flex: 1 },

  activeDesc:  { fontSize: 12, color: '#2563EB', fontWeight: '500', marginBottom: 3 },
  pendingDesc: { fontSize: 12, color: '#94A3B8', marginBottom: 3 },

  /* Badges */
  badgeGreen:    { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeGreenTxt: { fontSize: 11, fontWeight: '700', color: '#059669' },
  badgeBlue:     { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeBlueTxt:  { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  badgeGrey:     { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeGreyTxt:  { fontSize: 11, fontWeight: '700', color: '#94A3B8' },

  /* Timestamp */
  tsRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  tsText: { fontSize: 11, color: '#94A3B8' },

  /* Notes */
  notesBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 4,
  },
  notesText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },

  /* Legend */
  legend: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4,
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: MUTED, fontWeight: '500' },
});

/* ── Shared section card ── */
function SectionCard({ icon, title, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Feather name={icon} size={15} color={PRIMARY} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/* ── Info pair row ── */
function InfoPair({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoPair}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOB(id),
    queryFn:  () => JobService.getById(id),
    staleTime: 0, // always refetch on focus
  });

  /** Refetch job detail whenever this screen comes into focus so timeline
   *  is always current after navigating away and back. */
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  /**
   * Invalidate the job detail with a short delay (800 ms) so the server
   * has time to write the new timeline entry before we re-fetch.
   * The lists + analytics are invalidated immediately (no delay needed).
   */
  const invalidate = () => {
    // Immediate: lists, dashboard, analytics
    qc.invalidateQueries({ queryKey: ['jobs'] });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    qc.invalidateQueries({ queryKey: ['analytics'] });
    // Delayed: job detail — give the server 800 ms to commit the timeline entry
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.JOB(id) });
    }, 800);
  };

  /** Push a new status into every relevant cache immediately so the list
   *  updates without waiting for the background refetch to complete. */
  const applyCachedStatus = (newStatus: JobStatus) => {
    // Update the job detail cache
    qc.setQueryData<JobDetailResponse>(QUERY_KEYS.JOB(id), (old) =>
      old ? { ...old, status: newStatus } : old
    );
    // Update every jobs-list cache variant (all param shapes share the ['jobs'] prefix)
    qc.setQueriesData<{ items: JobResponse[]; total: number }>(
      { queryKey: ['jobs'] },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((j) =>
            j.id === id ? { ...j, status: newStatus } : j
          ),
        };
      }
    );
  };

  const statusMut = useMutation({
    mutationFn: (status: JobStatus) => JobService.updateStatus(id, { status }),
    onSuccess:  (_result, newStatus) => {
      applyCachedStatus(newStatus);
      invalidate();
      setShowStatusPicker(false);
    },
    onError:    (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Could not update status. Please try again.';
      Alert.alert('Status Update Failed', msg);
    },
  });
  const completeMut = useMutation({
    mutationFn: () => JobService.complete(id, {}),
    onSuccess:  () => {
      applyCachedStatus('COMPLETED');
      invalidate();
      setShowComplete(false);
    },
    onError:    (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Could not complete job. Please try again.';
      Alert.alert('Complete Job Failed', msg);
    },
  });

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>
          {data ? `Job #${data.job_number}` : 'Job Detail'}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : !data ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          }
        >
          {/* Status hero */}
          <View style={styles.statusHero}>
            <View style={styles.statusHeroRow}>
              <StatusBadge status={data.status} />
              {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
                <TouchableOpacity
                  style={styles.changeStatusBtn}
                  onPress={() => setShowStatusPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeStatusText}>Change</Text>
                  <Feather name="chevron-down" size={13} color={PRIMARY} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.statusDate}>Created {formatDateTime(data.created_at)}</Text>
          </View>

          {/* Customer & Vehicle */}
          <SectionCard icon="user" title="Customer & Vehicle">
            <InfoPair label="Customer"     value={data.customer_name} />
            <InfoPair label="Mobile"       value={data.customer_mobile} />
            <InfoPair label="Registration" value={data.registration_number} />
            <InfoPair label="Vehicle"      value={[data.brand, data.vehicle_model].filter(Boolean).join(' ')} />
            <InfoPair label="Fuel Type"    value={data.fuel_type} />
            <InfoPair label="Odometer"     value={data.odometer_km ? `${data.odometer_km} km` : null} />
          </SectionCard>

          {/* Description */}
          {data.description ? (
            <SectionCard icon="file-text" title="Description">
              <Text style={styles.descText}>{data.description}</Text>
            </SectionCard>
          ) : null}

          {/* Services */}
          {data.services?.length ? (
            <SectionCard icon="tool" title="Services">
              {data.services.map((s, i) => (
                <View key={i} style={styles.serviceRow}>
                  <Text style={styles.serviceName}>
                    {s.name}{s.qty && s.qty > 1 ? ` ×${s.qty}` : ''}
                  </Text>
                  <Text style={styles.servicePrice}>{formatCurrency(s.price)}</Text>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {/* Billing */}
          {data.billing ? (
            <SectionCard icon="credit-card" title="Billing Summary">
              <InfoPair label="Services" value={formatCurrency(data.billing.services_total)} />
              <InfoPair label="Labour"   value={formatCurrency(data.billing.labour_total)} />
              <InfoPair label="Subtotal" value={formatCurrency(data.billing.subtotal)} />
              <InfoPair label="GST"      value={formatCurrency(data.billing.gst_amount)} />
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(data.billing.grand_total)}</Text>
              </View>
            </SectionCard>
          ) : data.estimated_amount != null ? (
            <SectionCard icon="dollar-sign" title="Estimate">
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Estimated Amount</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(data.estimated_amount)}</Text>
              </View>
            </SectionCard>
          ) : null}

          {/* Job progress stepper */}
          <JobStepper status={data.status} />

          {/* Structured job timeline */}
          <JobTimeline timelines={data.timelines} currentStatus={data.status} />

          {/* Complete button */}
          {(data.status === 'QUALITY_CHECK' || data.status === 'READY') && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => setShowComplete(true)}
              activeOpacity={0.85}
            >
              {completeMut.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="check-circle" size={18} color="#fff" /><Text style={styles.completeBtnText}>Mark as Completed</Text></>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── Status picker sheet ── */}
      {showStatusPicker && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowStatusPicker(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change Status</Text>
            {STATUS_FLOW.filter(s => s !== data?.status && s !== 'COMPLETED').map(s => (
              <TouchableOpacity
                key={s}
                style={styles.sheetOption}
                onPress={() => statusMut.mutate(s)}
                disabled={statusMut.isPending}
                activeOpacity={0.8}
              >
                {statusMut.isPending && statusMut.variables === s
                  ? <ActivityIndicator size="small" color={PRIMARY} />
                  : <StatusBadge status={s} />
                }
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowStatusPicker(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={showComplete}
        title="Complete Job"
        message="Mark this job as completed? This will finalize the billing."
        confirmLabel="Complete"
        onConfirm={() => completeMut.mutate()}
        onCancel={() => setShowComplete(false)}
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pageTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 18, fontWeight: '700', color: TEXT,
  },

  content: { paddingHorizontal: 20, gap: 14 },

  /* Status hero */
  statusHero: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 18, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statusHeroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeStatusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY + '40',
    backgroundColor: '#FEE2E2',
  },
  changeStatusText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  statusDate:       { fontSize: 11, color: MUTED },

  /* Section card */
  sectionCard: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  sectionBody:  { padding: 18 },

  /* Info pair */
  infoPair: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: MUTED, flex: 1 },
  infoValue: { fontSize: 13, color: TEXT, fontWeight: '600', flex: 1.5, textAlign: 'right' },

  /* Description */
  descText: { fontSize: 14, color: MUTED, lineHeight: 22 },

  /* Services */
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  serviceName:  { fontSize: 13, color: TEXT, flex: 1 },
  servicePrice: { fontSize: 13, color: PRIMARY, fontWeight: '700' },

  /* Billing */
  grandTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 12, marginTop: 4,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: '800', color: TEXT },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: PRIMARY },

  /* Complete */
  completeBtn: {
    backgroundColor: SUCCESS, borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: SUCCESS, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  completeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Status sheet */
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 32, gap: 2,
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 16,
  },
  sheetTitle:      { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 10 },
  sheetOption:     { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetCancel: {
    marginTop: 10, paddingVertical: 14,
    borderRadius: 14, alignItems: 'center',
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: TEXT },
});
