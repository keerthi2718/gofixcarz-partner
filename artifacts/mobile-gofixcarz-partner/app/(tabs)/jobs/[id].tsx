import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, ScrollView, StatusBar,
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
const PRIMARY = '#C41E3A';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';

const STATUS_FLOW: JobStatus[] = [
  'OPEN','IN_PROGRESS','QUALITY_CHECK','READY','COMPLETED','CANCELLED',
];

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

          {/* Timeline */}
          {(() => {
            const entries = [...(data.timelines ?? [])]
              .filter(t => t.status !== 'WAITING_FOR_PARTS')
              .reverse();
            if (!entries.length) return null;
            return (
              <SectionCard icon="clock" title="Timeline">
                {entries.map((t, i, arr) => {
                  const isFirst = i === 0;
                  const isLast  = i === arr.length - 1;
                  return (
                    <View key={t.id ?? i} style={styles.timelineRow}>
                      {/* Dot + connecting line */}
                      <View style={styles.timelineLeft}>
                        <View style={[
                          styles.timelineDot,
                          isFirst ? styles.timelineDotActive : styles.timelineDotDone,
                        ]} />
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>
                      {/* Content */}
                      <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                        <StatusBadge status={t.status} size="sm" />
                        {t.notes ? <Text style={styles.timelineNote}>{t.notes}</Text> : null}
                        <Text style={styles.timelineDate}>{formatDateTime(t.created_at)}</Text>
                      </View>
                    </View>
                  );
                })}
              </SectionCard>
            );
          })()}

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

  /* Timeline */
  timelineRow:  { flexDirection: 'row', gap: 12 },
  timelineLeft: { alignItems: 'center', width: 20, paddingTop: 3 },
  timelineDot:  { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  timelineDotActive: { backgroundColor: PRIMARY },
  timelineDotDone:   { backgroundColor: '#CBD5E1' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 4, borderRadius: 1 },
  timelineContent: { flex: 1, paddingBottom: 16, gap: 4 },
  timelineNote: { fontSize: 12, color: MUTED },
  timelineDate: { fontSize: 11, color: MUTED },

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
