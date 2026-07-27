import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useColors } from '@/hooks/useColors';
import StatusBadge from '@/src/components/ui/StatusBadge';
import { formatDate } from '@/src/utils/helpers';
import type { BookingDetailResponse } from '@/src/types';

interface BookingCardProps {
  booking: BookingDetailResponse;
  onPress: () => void;
}

export default function BookingCard({ booking, onPress }: BookingCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={[styles.avatarWrap, { backgroundColor: colors.accentLight }]}>
          <Feather name="calendar" size={16} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {booking.customer_name ?? 'Walk-in Customer'}
          </Text>
          {booking.customer_mobile ? (
            <Text style={[styles.mobile, { color: colors.mutedForeground }]}>
              {booking.customer_mobile}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={booking.status} size="sm" />
      </View>

      {booking.service_requested ? (
        <Text style={[styles.service, { color: colors.foreground }]} numberOfLines={1}>
          {booking.service_requested}
        </Text>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Feather name="clock" size={12} color={colors.mutedForeground} />
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {booking.booking_date ? formatDate(booking.booking_date) : formatDate(booking.created_at)}
        </Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, padding: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' as const },
  mobile: { fontSize: 12, marginTop: 1 },
  service: { fontSize: 13, color: '#555' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, paddingTop: 10 },
  date: { fontSize: 12, flex: 1 },
  chevron: { marginLeft: 'auto' as never },
});
