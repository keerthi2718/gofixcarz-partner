import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { formatDateTime } from '@/src/utils/helpers';
import type { NotificationResponse } from '@/src/types';

/* ── Design tokens ── */
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

/* Notification type → icon + colour */
function getStyle(title: string): { icon: React.ComponentProps<typeof Feather>['name']; bg: string; fg: string } {
  const t = title.toLowerCase();
  if (t.includes('book'))    return { icon: 'calendar',      bg: '#EFF6FF', fg: PRIMARY };
  if (t.includes('job'))     return { icon: 'tool',           bg: '#F0FDF4', fg: '#10B981' };
  if (t.includes('pay') || t.includes('revenue')) return { icon: 'credit-card', bg: '#FFFBEB', fg: '#F59E0B' };
  if (t.includes('alert') || t.includes('warn'))  return { icon: 'alert-circle', bg: '#FEF2F2', fg: '#EF4444' };
  if (t.includes('complet')) return { icon: 'check-circle',  bg: '#F0FDF4', fg: '#10B981' };
  return { icon: 'bell', bg: '#EEF2FF', fg: PRIMARY };
}

interface Props {
  notification: NotificationResponse;
  onPress: () => void;
}

export default function NotificationItem({ notification, onPress }: Props) {
  const isUnread = !notification.is_read;
  const { icon, bg, fg } = getStyle(notification.title);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        isUnread && styles.itemUnread,
        pressed && styles.itemPressed,
      ]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(37,99,235,0.06)' }}
    >
      {/* Unread stripe */}
      {isUnread && <View style={styles.unreadStripe} />}

      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Feather name={icon} size={16} color={fg} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
            {notification.title}
          </Text>
          {isUnread && <View style={styles.dot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
        <View style={styles.meta}>
          <Feather name="clock" size={10} color={MUTED} />
          <Text style={styles.time}>{formatDateTime(notification.created_at)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: CARD,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 10, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  itemUnread: {
    backgroundColor: '#F8FAFF',
    borderColor: 'rgba(37,99,235,0.2)',
  },
  itemPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },

  unreadStripe: {
    position: 'absolute', left: 0, top: 10, bottom: 10,
    width: 3, borderRadius: 2, backgroundColor: PRIMARY,
  },

  iconWrap: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  body: { flex: 1, gap: 4 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 13, fontWeight: '600', color: TEXT },
  titleUnread: { fontWeight: '700', color: TEXT },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PRIMARY },

  message: { fontSize: 12, color: MUTED, lineHeight: 18 },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  time: { fontSize: 11, color: MUTED },
});
