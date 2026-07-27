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
import BookingService from '@/src/services/booking.service';
import StatusBadge from '@/src/components/ui/StatusBadge';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import { formatDate, formatDateTime } from '@/src/utils/helpers';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const DANGER  = '#EF4444';
const SUCCESS = '#10B981';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionCard({ icon, title, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Feather name={icon} size={16} color={PRIMARY} />
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
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | 'create-job' | null>(null);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.BOOKING(id),
    queryFn: () => BookingService.getById(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.BOOKING(id) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  };

  const acceptMut    = useMutation({ mutationFn: () => BookingService.accept(id),    onSuccess: invalidate });
  const rejectMut    = useMutation({ mutationFn: () => BookingService.reject(id),    onSuccess: invalidate });
  const createJobMut = useMutation({
    mutationFn: () => BookingService.createJob(id),
    onSuccess: (job) => { invalidate(); router.replace(`/(tabs)/jobs/${job.id}`); },
  });

  const isPending = acceptMut.isPending || rejectMut.isPending || createJobMut.isPending;

  function handleConfirm() {
    if (confirmAction === 'accept')      acceptMut.mutate();
    else if (confirmAction === 'reject') rejectMut.mutate();
    else if (confirmAction === 'create-job') createJobMut.mutate();
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

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : !data ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Status hero */}
          <View style={styles.statusHero}>
            <StatusBadge status={data.status} />
            <Text style={styles.statusDate}>Created {formatDateTime(data.created_at)}</Text>
          </View>

          {/* Customer */}
          <SectionCard icon="user" title="Customer">
            <InfoRow label="Name"   value={data.customer_name ?? 'Not specified'} />
            <InfoRow label="Mobile" value={data.customer_mobile ?? 'Not specified'} />
            {data.service_requested ? <InfoRow label="Service" value={data.service_requested} /> : null}
            {data.booking_date ? <InfoRow label="Date" value={formatDate(data.booking_date)} /> : null}
          </SectionCard>

          {/* Notes */}
          {data.notes ? (
            <SectionCard icon="file-text" title="Notes">
              <Text style={styles.notesText}>{data.notes}</Text>
            </SectionCard>
          ) : null}

          {/* Actions */}
          {data.status === 'PENDING' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger, isPending && { opacity: 0.6 }]}
                onPress={() => setConfirmAction('reject')}
                disabled={isPending}
                activeOpacity={0.85}
              >
                {rejectMut.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Feather name="x" size={16} color="#fff" /><Text style={styles.actionBtnText}>Reject</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess, isPending && { opacity: 0.6 }]}
                onPress={() => setConfirmAction('accept')}
                disabled={isPending}
                activeOpacity={0.85}
              >
                {acceptMut.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Feather name="check" size={16} color="#fff" /><Text style={styles.actionBtnText}>Accept</Text></>
                }
              </TouchableOpacity>
            </View>
          )}

          {data.status === 'ACCEPTED' && (
            <TouchableOpacity
              style={[styles.convertBtn, isPending && { opacity: 0.6 }]}
              onPress={() => setConfirmAction('create-job')}
              disabled={isPending}
              activeOpacity={0.85}
            >
              {createJobMut.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="briefcase" size={18} color="#fff" /><Text style={styles.convertBtnText}>Convert to Job Card</Text></>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={confirmAction !== null}
        title={
          confirmAction === 'accept' ? 'Accept Booking'
          : confirmAction === 'reject' ? 'Reject Booking'
          : 'Create Job Card'
        }
        message={
          confirmAction === 'accept' ? 'Are you sure you want to accept this booking?'
          : confirmAction === 'reject' ? 'Are you sure you want to reject this booking?'
          : 'Convert this booking into a Job Card?'
        }
        destructive={confirmAction === 'reject'}
        confirmLabel={
          confirmAction === 'accept' ? 'Accept'
          : confirmAction === 'reject' ? 'Reject'
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

  /* Top bar */
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
    backgroundColor: CARD,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 18, gap: 8, alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statusDate: { fontSize: 12, color: MUTED },

  /* Section card */
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  sectionBody:  { padding: 18, gap: 0 },

  /* Info row */
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: MUTED, flex: 1 },
  infoValue: { fontSize: 13, color: TEXT, fontWeight: '600', flex: 1.5, textAlign: 'right' },

  /* Notes */
  notesText: { fontSize: 14, color: MUTED, lineHeight: 22 },

  /* Actions */
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 15, borderRadius: 16,
  },
  actionBtnDanger:  { backgroundColor: DANGER },
  actionBtnSuccess: { backgroundColor: SUCCESS },
  actionBtnText:    { color: '#fff', fontSize: 15, fontWeight: '700' },

  convertBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  convertBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
