import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import NotificationService from '@/src/services/notification.service';
import NotificationItem from '@/src/components/notifications/NotificationItem';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS(unreadOnly),
    queryFn: () => NotificationService.list({ unread_only: unreadOnly, page_size: 30 }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => NotificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS() }),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notifications</Text>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: unreadOnly ? colors.primary : colors.secondary }]}
          onPress={() => setUnreadOnly(v => !v)} activeOpacity={0.8}
        >
          <Text style={[styles.filterText, { color: unreadOnly ? '#fff' : colors.mutedForeground }]}>
            {unreadOnly ? 'Unread' : 'All'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.list}><SkeletonList count={5} /></ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => { if (!item.is_read) markReadMut.mutate(item.id); }}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="bell" title="No Notifications" description={unreadOnly ? 'All caught up!' : 'Notifications will appear here.'} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16 },
});
