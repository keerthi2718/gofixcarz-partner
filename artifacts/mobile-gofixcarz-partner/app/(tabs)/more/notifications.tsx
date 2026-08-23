import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import NotificationService from '@/src/services/notification.service';
import { resolveRoute } from '@/src/context/NotificationContext';
import NotificationItem from '@/src/components/notifications/NotificationItem';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';

/* ── Design tokens ── */
const BG      = '#F8FAFC';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const qc     = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS(unreadOnly),
    queryFn:  () => NotificationService.list({ unread_only: unreadOnly, page_size: 30 }),
  });

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const markReadMut = useMutation({
    mutationFn: (id: string) => NotificationService.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS() }),
  });

  const items      = data?.items ?? [];
  const unreadCount = items.filter(n => !n.is_read).length;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? 14 : 10) + insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {/* Unread toggle */}
        <TouchableOpacity
          style={[styles.toggleBtn, unreadOnly && styles.toggleBtnActive]}
          onPress={() => setUnreadOnly(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, unreadOnly && styles.toggleTextActive]}>
            {unreadOnly ? 'All' : 'Unread'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
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
              onPress={() => {
                if (!item.is_read) markReadMut.mutate(item.id);
                const route = resolveRoute({
                  type: item.type ?? '',
                  reference_id: item.reference_id ?? '',
                });
                if (route !== '/(tabs)/more/notifications') {
                  router.push(route as any);
                }
              }}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={PRIMARY} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    padding: 4,
  },

  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pageTitle: { fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center' },
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
