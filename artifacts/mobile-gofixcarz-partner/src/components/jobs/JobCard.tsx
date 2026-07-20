import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate } from '@/src/utils/helpers';
import type { JobResponse } from '@/src/types';

interface JobCardProps {
  job: JobResponse;
  onPress: () => void;
}

export default function JobCard({ job, onPress }: JobCardProps) {
  const colors = useColors();
  const vehicleInfo = [job.brand, job.vehicle_model].filter(Boolean).join(' ');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={[styles.numBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.numText, { color: colors.primary }]}># {job.job_number}</Text>
        </View>
        <StatusBadge status={job.status} size="sm" />
      </View>

      <View style={styles.row}>
        <Feather name="user" size={13} color={colors.mutedForeground} />
        <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>
          {job.customer_name ?? 'Walk-in'}
        </Text>
        {job.customer_mobile ? (
          <Text style={[styles.mobile, { color: colors.mutedForeground }]}>· {job.customer_mobile}</Text>
        ) : null}
      </View>

      {vehicleInfo || job.registration_number ? (
        <View style={styles.row}>
          <Feather name="truck" size={13} color={colors.mutedForeground} />
          <Text style={[styles.vehicle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {[vehicleInfo, job.registration_number].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Feather name="clock" size={12} color={colors.mutedForeground} />
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDate(job.created_at)}</Text>
        {job.estimated_amount != null ? (
          <Text style={[styles.amount, { color: colors.primary }]}>
            ₹{job.estimated_amount.toLocaleString('en-IN')}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
    gap: 8,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  numText: { fontSize: 12, fontWeight: '700' as const },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customer: { fontSize: 14, fontWeight: '600' as const, flex: 1 },
  mobile: { fontSize: 12 },
  vehicle: { fontSize: 13, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, paddingTop: 8 },
  date: { fontSize: 12, flex: 1 },
  amount: { fontSize: 13, fontWeight: '700' as const },
});
