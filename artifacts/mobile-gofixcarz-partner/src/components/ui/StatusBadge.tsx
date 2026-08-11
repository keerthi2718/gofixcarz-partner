import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { BookingStatus, JobStatus } from '@/src/types';

type AnyStatus = JobStatus | BookingStatus | string;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

function getStatusConfig(status: AnyStatus, colors: ReturnType<typeof useColors>) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    // Job statuses
    OPEN: { label: 'Open', color: colors.statusOpen, bg: colors.statusOpenBg },
    IN_PROGRESS: { label: 'In Progress', color: colors.statusInProgress, bg: colors.statusInProgressBg },
    QUALITY_CHECK: { label: 'Quality Check', color: colors.statusQualityCheck, bg: colors.statusQualityCheckBg },
    READY: { label: 'Ready', color: colors.statusReady, bg: colors.statusReadyBg },
    COMPLETED: { label: 'Completed', color: colors.statusCompleted, bg: colors.statusCompletedBg },
    CANCELLED: { label: 'Cancelled', color: colors.statusCancelled, bg: colors.statusCancelledBg },
    // Booking statuses
    PENDING: { label: 'Pending', color: colors.bookingPending, bg: colors.bookingPendingBg },
    ACCEPTED: { label: 'Accepted', color: colors.bookingAccepted, bg: colors.bookingAcceptedBg },
    REJECTED: { label: 'Rejected', color: colors.bookingRejected, bg: colors.bookingRejectedBg },
    CONVERTED: { label: 'Converted', color: colors.bookingConverted, bg: colors.bookingConvertedBg },
  };
  return map[status] ?? { label: status, color: colors.mutedForeground, bg: colors.muted };
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = useColors();
  const cfg = getStatusConfig(status, colors);
  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.label, { color: cfg.color }, isSmall && styles.labelSm]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '600' as const },
  labelSm: { fontSize: 11 },
});
