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
import BookingService from '@/src/services/booking.service';
import StatusBadge from '@/src/components/ui/StatusBadge';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import { formatDate, formatDateTime } from '@/src/utils/helpers';

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 13, color: colors.mutedForeground, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '600', flex: 1.5, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'accept' | 'reject' | 'create-job' | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.BOOKING(id),
    queryFn: () => BookingService.getById(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.BOOKING(id) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.BOOKINGS() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  };

  const acceptMut = useMutation({ mutationFn: () => BookingService.accept(id), onSuccess: invalidate });
  const rejectMut = useMutation({ mutationFn: () => BookingService.reject(id), onSuccess: invalidate });
  const createJobMut = useMutation({
    mutationFn: () => BookingService.createJob(id),
    onSuccess: (job) => {
      invalidate();
      router.replace(`/(tabs)/jobs/${job.id}`);
    },
  });

  const isPending = acceptMut.isPending || rejectMut.isPending || createJobMut.isPending;
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  function handleConfirm() {
    if (confirmAction === 'accept') acceptMut.mutate();
    else if (confirmAction === 'reject') rejectMut.mutate();
    else if (confirmAction === 'create-job') createJobMut.mutate();
    setConfirmAction(null);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Booking Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : !data ? null : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          {/* Status card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Status</Text>
              <StatusBadge status={data.status} />
            </View>
            <Text style={[styles.bookingDate, { color: colors.mutedForeground }]}>
              Created {formatDateTime(data.created_at)}
            </Text>
          </View>

          {/* Customer Info */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer</Text>
            <InfoRow label="Name" value={data.customer_name ?? 'Not specified'} />
            <InfoRow label="Mobile" value={data.customer_mobile ?? 'Not specified'} />
            {data.service_requested ? <InfoRow label="Service" value={data.service_requested} /> : null}
            {data.booking_date ? <InfoRow label="Booking Date" value={formatDate(data.booking_date)} /> : null}
          </View>

          {/* Notes */}
          {data.notes ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
              <Text style={[styles.notes, { color: colors.mutedForeground }]}>{data.notes}</Text>
            </View>
          ) : null}

          {/* Actions */}
          {data.status === 'PENDING' && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.destructive, opacity: isPending ? 0.6 : 1 }]}
                onPress={() => setConfirmAction('reject')} disabled={isPending} activeOpacity={0.8}
              >
                {rejectMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Reject</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.success, opacity: isPending ? 0.6 : 1 }]}
                onPress={() => setConfirmAction('accept')} disabled={isPending} activeOpacity={0.8}
              >
                {acceptMut.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Accept</Text>}
              </TouchableOpacity>
            </View>
          )}
          {data.status === 'ACCEPTED' && (
            <TouchableOpacity
              style={[styles.fullBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 }]}
              onPress={() => setConfirmAction('create-job')} disabled={isPending} activeOpacity={0.8}
            >
              {createJobMut.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="plus" size={18} color="#fff" /><Text style={styles.fullBtnText}>Convert to Job Card</Text></>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      <ConfirmDialog
        visible={confirmAction !== null}
        title={confirmAction === 'accept' ? 'Accept Booking' : confirmAction === 'reject' ? 'Reject Booking' : 'Create Job Card'}
        message={
          confirmAction === 'accept' ? 'Are you sure you want to accept this booking?'
          : confirmAction === 'reject' ? 'Are you sure you want to reject this booking?'
          : 'Convert this booking into a Job Card?'
        }
        destructive={confirmAction === 'reject'}
        confirmLabel={confirmAction === 'accept' ? 'Accept' : confirmAction === 'reject' ? 'Reject' : 'Create Job'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
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
  card: { borderRadius: 16, padding: 16, gap: 8, shadowColor: 'rgba(0,0,0,0.06)', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  bookingDate: { fontSize: 12 },
  notes: { fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  fullBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  fullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
