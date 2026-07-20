import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { formatDateTime } from '@/src/utils/helpers';
import type { NotificationResponse } from '@/src/types';

interface NotificationItemProps {
  notification: NotificationResponse;
  onPress: () => void;
}

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const colors = useColors();
  const isUnread = !notification.is_read;

  return (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: isUnread ? colors.primary + '08' : colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: isUnread ? colors.accentLight : colors.muted }]}>
        <Feather
          name="bell"
          size={16}
          color={isUnread ? colors.accent : colors.mutedForeground}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {notification.title}
          </Text>
          {isUnread && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
        </View>
        <Text style={[styles.message, { color: colors.mutedForeground }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatDateTime(notification.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, marginBottom: 10,
    borderWidth: 1,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '600' as const, flex: 1 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  message: { fontSize: 12, lineHeight: 18 },
  time: { fontSize: 11, marginTop: 2 },
});
