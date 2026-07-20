import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import StatusBadge from '@/src/components/ui/StatusBadge';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency, formatDateTime } from '@/src/utils/helpers';
import type { JobStatus } from '@/src/types';

const STATUS_FLOW: JobStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'QUALITY_CHECK', 'READY', 'COMPLETED', 'CANCELLED'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[sectionStyles.card, { backgroundColor: colors.card }]}>
      <Text style={[sectionStyles.title, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}
const sectionStyles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 10, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
});

function InfoPair({ label, value }: { label: string; value?: string | number | null }) {
  const colors = useColors();
  if (!value && value !== 0) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 13, color: colors.mutedForeground, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '500', flex: 1.5, textAlign: 'right' }}>{String(value)}</Text>
    </View>
  );
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOB(id),
    queryFn: () => JobService.getById(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOB(id) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOBS() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  };

  const statusMut = useMutation({
    mutationFn: (status: JobStatus) => JobService.updateStatus(id, { status }),
    onSuccess: () => { invalidate(); setShowStatusPicker(false); },
  });
  const completeMut = useMutation({
    mutationFn: () => JobService.complete(id, {}),
    onSuccess: () => { invalidate(); setShowComplete(false); },
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {data ? `#${data.job_number}` : 'Job Detail'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : !data ? null : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          {/* Status */}
          <Section title="Status">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <StatusBadge status={data.status} />
              {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
                <TouchableOpacity
                  style={[styles.changeStatusBtn, { borderColor: colors.border }]}
                  onPress={() => setShowStatusPicker(true)} activeOpacity={0.8}
                >
                  <Text style={[styles.changeStatusText, { color: colors.primary }]}>Change Status</Text>
                  <Feather name="chevron-down" size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>Created {formatDateTime(data.created_at)}</Text>
          </Section>

          {/* Customer */}
          <Section title="Customer & Vehicle">
            <InfoPair label="Customer" value={data.customer_name} />
            <InfoPair label="Mobile" value={data.customer_mobile} />
            <InfoPair label="Registration" value={data.registration_number} />
            <InfoPair label="Vehicle" value={[data.brand, data.vehicle_model].filter(Boolean).join(' ')} />
            <InfoPair label="Fuel Type" value={data.fuel_type} />
            <InfoPair label="Odometer" value={data.odometer_km ? `${data.odometer_km} km` : null} />
          </Section>

          {/* Description */}
          {data.description ? (
            <Section title="Description">
              <Text style={{ fontSize: 14, color: colors.mutedForeground, lineHeight: 20 }}>{data.description}</Text>
            </Section>
          ) : null}

          {/* Services */}
          {data.services?.length ? (
            <Section title="Services">
              {data.services.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <Text style={{ fontSize: 13, color: colors.foreground, flex: 1 }}>{s.name} {s.qty && s.qty > 1 ? `×${s.qty}` : ''}</Text>
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>{formatCurrency(s.price)}</Text>
                </View>
              ))}
            </Section>
          ) : null}

          {/* Billing */}
          {data.billing ? (
            <Section title="Billing Summary">
              <InfoPair label="Services" value={formatCurrency(data.billing.services_total)} />
              <InfoPair label="Labour" value={formatCurrency(data.billing.labour_total)} />
              <InfoPair label="Subtotal" value={formatCurrency(data.billing.subtotal)} />
              <InfoPair label="GST" value={formatCurrency(data.billing.gst_amount)} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.foreground }}>Grand Total</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{formatCurrency(data.billing.grand_total)}</Text>
              </View>
            </Section>
          ) : data.estimated_amount != null ? (
            <Section title="Estimate">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: colors.mutedForeground }}>Estimated Amount</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>{formatCurrency(data.estimated_amount)}</Text>
              </View>
            </Section>
          ) : null}

          {/* Timeline */}
          {data.timelines?.length ? (
            <Section title="Timeline">
              {[...data.timelines].reverse().map((t, i) => (
                <View key={t.id} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: i === 0 ? colors.accent : colors.border }]} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <StatusBadge status={t.status} size="sm" />
                    {t.notes ? <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{t.notes}</Text> : null}
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{formatDateTime(t.created_at)}</Text>
                  </View>
                </View>
              ))}
            </Section>
          ) : null}

          {/* Complete button */}
          {(data.status === 'QUALITY_CHECK' || data.status === 'READY') && (
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: colors.success }]}
              onPress={() => setShowComplete(true)} activeOpacity={0.85}
            >
              {completeMut.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="check-circle" size={18} color="#fff" /><Text style={styles.completeBtnText}>Mark as Completed</Text></>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Status picker dialog */}
      {showStatusPicker && (
        <View style={[styles.statusOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.statusSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Change Status</Text>
            {STATUS_FLOW.filter(s => s !== data?.status && s !== 'COMPLETED').map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOption, { borderBottomColor: colors.border }]}
                onPress={() => statusMut.mutate(s)} activeOpacity={0.8}
                disabled={statusMut.isPending}
              >
                {statusMut.isPending && statusMut.variables === s
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <StatusBadge status={s} />
                }
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => setShowStatusPicker(false)}>
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 12 },
  changeStatusBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  changeStatusText: { fontSize: 12, fontWeight: '600' },
  dateText: { fontSize: 11 },
  timelineItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  completeBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  completeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statusOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  statusSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 4 },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  statusOption: { paddingVertical: 14, borderBottomWidth: 1 },
  cancelBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
});
