import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import StatusBadge from '@/src/components/ui/StatusBadge';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency, formatDateTime } from '@/src/utils/helpers';
import type { JobStatus } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';
const DANGER  = '#EF4444';

/* ── Status pipeline ── */
const PIPELINE: { status: JobStatus; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { status: 'OPEN',              label: 'Open',     icon: 'file-plus'   },
  { status: 'IN_PROGRESS',       label: 'Working',  icon: 'tool'        },
  { status: 'WAITING_FOR_PARTS', label: 'Parts',    icon: 'package'     },
  { status: 'QUALITY_CHECK',     label: 'QC',       icon: 'check-square'},
  { status: 'READY',             label: 'Ready',    icon: 'truck'       },
  { status: 'COMPLETED',         label: 'Done',     icon: 'check-circle'},
];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:              { label: 'Open',        color: '#3B82F6', bg: '#EFF6FF' },
  IN_PROGRESS:       { label: 'In Progress', color: '#8B5CF6', bg: '#F5F3FF' },
  WAITING_FOR_PARTS: { label: 'Waiting',     color: '#F59E0B', bg: '#FFFBEB' },
  QUALITY_CHECK:     { label: 'QC Check',    color: '#6366F1', bg: '#EEF2FF' },
  READY:             { label: 'Ready',       color: '#10B981', bg: '#ECFDF5' },
  COMPLETED:         { label: 'Completed',   color: '#059669', bg: '#D1FAE5' },
  CANCELLED:         { label: 'Cancelled',   color: DANGER,    bg: '#FEF2F2' },
};

const STATUS_FLOW: JobStatus[] = [
  'OPEN','IN_PROGRESS','WAITING_FOR_PARTS','QUALITY_CHECK','READY','COMPLETED','CANCELLED',
];

/* ── Sub-components ── */
function SectionCard({ icon, title, iconBg = '#EEF2FF', iconFg = PRIMARY, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string; iconBg?: string; iconFg?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value?: string | null; valueColor?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showComplete, setShowComplete]         = useState(false);
  const topPad  = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOB(id),
    queryFn:  () => JobService.getById(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOB(id) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOBS() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  };

  const statusMut = useMutation({
    mutationFn: (status: JobStatus) => JobService.updateStatus(id, { status }),
    onSuccess:  () => { invalidate(); setShowStatusPicker(false); },
  });
  const completeMut = useMutation({
    mutationFn: () => JobService.complete(id, {}),
    onSuccess:  () => { invalidate(); setShowComplete(false); },
  });

  /* Pipeline position */
  const pipelineIndex = PIPELINE.findIndex(p => p.status === data?.status);
  const isCancelled   = data?.status === 'CANCELLED';
  const isCompleted   = data?.status === 'COMPLETED';
  const canComplete   = data?.status === 'QUALITY_CHECK' || data?.status === 'READY';
  const st            = data ? (STATUS_META[data.status] ?? { label: data.status, color: MUTED, bg: '#F1F5F9' }) : null;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>
          {data?.job_number ? `Job #${data.job_number}` : 'Job Details'}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : !data ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Status pipeline ── */}
          {!isCancelled && (
            <View style={styles.pipelineCard}>
              <View style={styles.pipelineRow}>
                {PIPELINE.map((p, i) => {
                  const done    = i < pipelineIndex;
                  const current = i === pipelineIndex;
                  const future  = i > pipelineIndex;
                  return (
                    <React.Fragment key={p.status}>
                      {i > 0 && (
                        <View style={[styles.pipelineLine, done && styles.pipelineLineDone]} />
                      )}
                      <View style={styles.pipelineNodeWrap}>
                        <View style={[
                          styles.pipelineNode,
                          done    && styles.pipelineNodeDone,
                          current && styles.pipelineNodeCurrent,
                        ]}>
                          {done
                            ? <Feather name="check" size={11} color="#fff" />
                            : <Feather name={p.icon} size={11} color={current ? '#fff' : '#CBD5E1'} />
                          }
                        </View>
                        <Text style={[
                          styles.pipelineLabel,
                          current && styles.pipelineLabelCurrent,
                          done    && styles.pipelineLabelDone,
                        ]} numberOfLines={1}>
                          {p.label}
                        </Text>
                      </View>
                    </React.Fragment>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Status hero ── */}
          <View style={styles.statusHero}>
            <View style={styles.statusHeroLeft}>
              <View style={[styles.statusPill, { backgroundColor: st?.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: st?.color }]} />
                <Text style={[styles.statusPillText, { color: st?.color }]}>{st?.label}</Text>
              </View>
              <Text style={styles.statusDate}>Created {formatDateTime(data.created_at)}</Text>
            </View>
            {!isCompleted && !isCancelled && (
              <TouchableOpacity
                style={styles.changeStatusBtn}
                onPress={() => setShowStatusPicker(true)}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={13} color={PRIMARY} />
                <Text style={styles.changeStatusText}>Update Status</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Customer & Vehicle ── */}
          <SectionCard icon="user" title="Customer & Vehicle">
            <InfoRow label="Customer"     value={data.customer_name} />
            <InfoRow label="Mobile"       value={data.customer_mobile} />
            <InfoRow label="Registration" value={data.registration_number} valueColor={PRIMARY} />
            <InfoRow label="Vehicle"      value={[data.brand, data.vehicle_model].filter(Boolean).join(' ')} />
            <InfoRow label="Fuel Type"    value={data.fuel_type} />
            <InfoRow label="Odometer"     value={data.odometer_km ? `${data.odometer_km} km` : null} />
          </SectionCard>

          {/* ── Description ── */}
          {data.description ? (
            <SectionCard icon="message-circle" title="Complaint & Notes" iconBg="#FEF2F2" iconFg={DANGER}>
              <Text style={styles.descText}>{data.description}</Text>
            </SectionCard>
          ) : null}

          {/* ── Services ── */}
          {data.services?.length ? (
            <SectionCard icon="tool" title="Services" iconBg="#F0FDF4" iconFg={SUCCESS}>
              {data.services.map((s, i) => (
                <View key={i} style={[styles.infoRow, i === data.services!.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.svcNameRow}>
                    <View style={styles.svcDot}><Feather name="tool" size={11} color={PRIMARY} /></View>
                    <Text style={styles.svcName}>{s.name}{s.qty && s.qty > 1 ? ` ×${s.qty}` : ''}</Text>
                  </View>
                  <Text style={styles.svcPrice}>{formatCurrency(s.price)}</Text>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {/* ── Billing ── */}
          {data.billing ? (
            <SectionCard icon="credit-card" title="Billing Summary" iconBg="#FFFBEB" iconFg="#F59E0B">
              <InfoRow label="Services" value={formatCurrency(data.billing.services_total)} />
              <InfoRow label="Labour"   value={formatCurrency(data.billing.labour_total)} />
              <InfoRow label="Subtotal" value={formatCurrency(data.billing.subtotal)} />
              <InfoRow label="GST"      value={formatCurrency(data.billing.gst_amount)} />
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

          {/* ── Timeline ── */}
          {data.timelines?.length ? (
            <SectionCard icon="clock" title="Activity Timeline" iconBg="#F5F3FF" iconFg="#7C3AED">
              {[...data.timelines].reverse().map((t, i) => (
                <View key={t.id} style={[styles.timelineRow, i === data.timelines!.length - 1 && { marginBottom: 0 }]}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      { backgroundColor: i === 0 ? PRIMARY : '#CBD5E1' },
                    ]} />
                    {i < data.timelines!.length - 1 && <View style={styles.timelineConnector} />}
                  </View>
                  <View style={styles.timelineBody}>
                    <StatusBadge status={t.status} size="sm" />
                    {t.notes ? <Text style={styles.timelineNote}>{t.notes}</Text> : null}
                    <Text style={styles.timelineDate}>{formatDateTime(t.created_at)}</Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {/* ── Complete button ── */}
          {canComplete && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => setShowComplete(true)}
              activeOpacity={0.85}
            >
              {completeMut.isPending
                ? <ActivityIndicator color="#fff" />
                : <>
                    <View style={styles.completeBtnIcon}>
                      <Feather name="check-circle" size={20} color={SUCCESS} />
                    </View>
                    <View>
                      <Text style={styles.completeBtnTitle}>Mark as Completed</Text>
                      <Text style={styles.completeBtnSub}>Finalise billing & close job</Text>
                    </View>
                    <Feather name="arrow-right" size={16} color="#fff" style={{ marginLeft: 'auto' }} />
                  </>
              }
            </TouchableOpacity>
          )}

          {/* Cancelled state */}
          {isCancelled && (
            <View style={styles.cancelledBanner}>
              <Feather name="x-circle" size={16} color={DANGER} />
              <Text style={styles.cancelledText}>This job has been cancelled.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Status picker sheet ── */}
      {showStatusPicker && (
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowStatusPicker(false)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Update Job Status</Text>
            <Text style={styles.sheetSub}>Select the new status for this job card</Text>

            <View style={styles.sheetOptions}>
              {STATUS_FLOW.filter(s => s !== data?.status && s !== 'COMPLETED').map(s => {
                const meta    = STATUS_META[s] ?? { label: s, color: MUTED, bg: '#F1F5F9' };
                const loading = statusMut.isPending && statusMut.variables === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.sheetOption, { borderColor: meta.color + '30', backgroundColor: meta.bg }]}
                    onPress={() => statusMut.mutate(s)}
                    disabled={statusMut.isPending}
                    activeOpacity={0.8}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={meta.color} />
                    ) : (
                      <View style={[styles.sheetOptionDot, { backgroundColor: meta.color }]} />
                    )}
                    <Text style={[styles.sheetOptionText, { color: meta.color }]}>{meta.label}</Text>
                    <Feather name="chevron-right" size={14} color={meta.color + '80'} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowStatusPicker(false)} activeOpacity={0.8}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={showComplete}
        title="Complete Job"
        message="Mark this job as completed? This will finalise the billing and close the job card."
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
      android: { elevation: 2 }, default: {},
    }),
  },
  pageTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: TEXT },

  content: { paddingHorizontal: 16, gap: 12 },

  /* Pipeline */
  pipelineCard: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 }, default: {},
    }),
  },
  pipelineRow:         { flexDirection: 'row', alignItems: 'flex-start' },
  pipelineLine:        { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginTop: 14 },
  pipelineLineDone:    { backgroundColor: SUCCESS },
  pipelineNodeWrap:    { alignItems: 'center', gap: 5 },
  pipelineNode: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#CBD5E1',
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  pipelineNodeDone:    { backgroundColor: SUCCESS, borderColor: SUCCESS },
  pipelineNodeCurrent: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  pipelineLabel:       { fontSize: 9, color: '#94A3B8', fontWeight: '600', textAlign: 'center', maxWidth: 42 },
  pipelineLabelCurrent:{ color: PRIMARY, fontWeight: '800' },
  pipelineLabelDone:   { color: SUCCESS },

  /* Status hero */
  statusHero: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 }, default: {},
    }),
  },
  statusHeroLeft: { gap: 6 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start',
  },
  statusDot:     { width: 7, height: 7, borderRadius: 4 },
  statusPillText:{ fontSize: 13, fontWeight: '700' },
  statusDate:    { fontSize: 11, color: MUTED },

  changeStatusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 12, backgroundColor: '#EEF2FF',
    borderWidth: 1.5, borderColor: 'rgba(37,99,235,0.3)',
  },
  changeStatusText: { fontSize: 12, fontWeight: '700', color: PRIMARY },

  /* Section card */
  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 }, default: {},
    }),
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  cardBody:  { padding: 18 },

  /* Info row */
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: MUTED, flex: 1 },
  infoValue: { fontSize: 13, color: TEXT, fontWeight: '600', flex: 1.5, textAlign: 'right' },

  /* Description */
  descText: { fontSize: 13, color: MUTED, lineHeight: 21 },

  /* Services */
  svcNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  svcDot: {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  svcName:  { flex: 1, fontSize: 13, color: TEXT, fontWeight: '500' },
  svcPrice: { fontSize: 13, color: PRIMARY, fontWeight: '700' },

  /* Billing */
  grandTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  grandTotalLabel: { fontSize: 14, fontWeight: '800', color: TEXT },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: PRIMARY },

  /* Timeline */
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timelineLeft: { alignItems: 'center', width: 22 },
  timelineDot:  { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineConnector: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginVertical: 4 },
  timelineBody: { flex: 1, gap: 4, paddingBottom: 4 },
  timelineNote: { fontSize: 12, color: MUTED, lineHeight: 17 },
  timelineDate: { fontSize: 11, color: '#94A3B8' },

  /* Complete */
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: PRIMARY, borderRadius: 18,
    padding: 18,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 8 }, default: {},
    }),
  },
  completeBtnIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  completeBtnTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  completeBtnSub:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* Cancelled */
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA', padding: 16,
  },
  cancelledText: { fontSize: 13, color: DANGER, fontWeight: '600' },

  /* Status sheet */
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20,
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 18,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 4 },
  sheetSub:   { fontSize: 13, color: MUTED, marginBottom: 18 },

  sheetOptions: { gap: 8, marginBottom: 12 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  sheetOptionDot:  { width: 10, height: 10, borderRadius: 5 },
  sheetOptionText: { fontSize: 14, fontWeight: '700' },

  sheetCancel: {
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', backgroundColor: BG,
    borderWidth: 1.5, borderColor: BORDER,
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: TEXT },
});
