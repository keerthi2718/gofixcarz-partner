import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import NotificationService from '@/src/services/notification.service';
import NotificationItem from '@/src/components/notifications/NotificationItem';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS(unreadOnly),
    queryFn:  () => NotificationService.list({ unread_only: unreadOnly, page_size: 30 }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => NotificationService.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS() }),
  });

  const items      = data?.items ?? [];
  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* All / Unread toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, !unreadOnly && styles.toggleBtnActive]}
            onPress={() => setUnreadOnly(false)}
          >
            <Text style={[styles.toggleText, !unreadOnly && styles.toggleTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, unreadOnly && styles.toggleBtnActive]}
            onPress={() => setUnreadOnly(true)}
          >
            <Text style={[styles.toggleText, unreadOnly && styles.toggleTextActive]}>Unread</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <SkeletonList count={6} />
        </ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => { if (!item.is_read) markReadMut.mutate(item.id); }}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="bell"
              title={unreadOnly ? 'All Caught Up' : 'No Notifications'}
              description={unreadOnly ? 'You have no unread notifications.' : 'Notifications will appear here.'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
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

  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: PRIMARY, borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  toggle: {
    flexDirection: 'row',
    backgroundColor: CARD, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: { backgroundColor: PRIMARY },
  toggleText:      { fontSize: 12, fontWeight: '600', color: MUTED },
  toggleTextActive: { color: '#fff' },

  list: { paddingHorizontal: 20 },
});
