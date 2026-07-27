import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useColors } from '@/hooks/useColors';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate } from '@/src/utils/helpers';
import type { JobResponse } from '@/src/types';

interface JobCardProps {
  job: JobResponse;
  onPress: () => void;
}

/** Derive a status accent colour used for the left stripe. */
function statusAccent(status: string): string {
  switch (status?.toLowerCase()) {
    case 'completed':  return '#10B981';
    case 'in_progress':
    case 'in progress': return '#6366F1';
    case 'pending':    return '#F59E0B';
    case 'cancelled':  return '#EF4444';
    default:           return '#C41E3A';
  }
}

export default function JobCard({ job, onPress }: JobCardProps) {
  const colors   = useColors();
  const accent   = statusAccent(job.status);
  const vehicleInfo = [job.brand, job.vehicle_model].filter(Boolean).join(' ');
  const hasVehicle  = !!(vehicleInfo || job.registration_number);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Left accent stripe */}
      <View style={[styles.stripe, { backgroundColor: accent }]} />

      <View style={styles.content}>
        {/* ── Header row: job number + status badge ── */}
        <View style={styles.header}>
          <View style={[styles.numBadge, { backgroundColor: accent + '18' }]}>
            <Feather name="hash" size={11} color={accent} />
            <Text style={[styles.numText, { color: accent }]}>{job.job_number}</Text>
          </View>
          <StatusBadge status={job.status} size="sm" />
        </View>

        {/* ── Customer row ── */}
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '12' }]}>
            <Feather name="user" size={12} color={colors.primary} />
          </View>
          <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>
            {job.customer_name ?? 'Walk-in'}
          </Text>
          {job.customer_mobile ? (
            <View style={styles.phoneChip}>
              <Feather name="phone" size={10} color={colors.mutedForeground} />
              <Text style={[styles.phoneText, { color: colors.mutedForeground }]}>
                {job.customer_mobile}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Vehicle row ── */}
        {hasVehicle ? (
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="truck" size={12} color="#F97316" />
            </View>
            <Text style={[styles.vehicle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {vehicleInfo || ''}
            </Text>
            {job.registration_number ? (
              <View style={[styles.regPlate, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.regText, { color: colors.foreground }]}>
                  {job.registration_number}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Footer: date + amount ── */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Feather name="clock" size={11} color={colors.mutedForeground} />
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(job.created_at)}
          </Text>
          {job.estimated_amount != null ? (
            <View style={[styles.amountChip, { backgroundColor: accent + '12' }]}>
              <Text style={[styles.amountText, { color: accent }]}>
                ₹{job.estimated_amount.toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },

  /* Coloured left stripe */
  stripe: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  content: {
    flex: 1,
    padding: 14,
    gap: 9,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  numText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },

  /* Customer / vehicle rows */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customer: {
    fontSize: 14,
    fontWeight: '600' as const,
    flex: 1,
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  vehicle: {
    fontSize: 13,
    flex: 1,
  },

  /* Registration plate badge */
  regPlate: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  regText: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    paddingTop: 9,
  },
  date: {
    fontSize: 11,
    flex: 1,
  },
  amountChip: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  amountText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
