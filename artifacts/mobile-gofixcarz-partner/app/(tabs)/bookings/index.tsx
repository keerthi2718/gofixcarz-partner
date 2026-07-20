import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import BookingService from '@/src/services/booking.service';
import BookingCard from '@/src/components/bookings/BookingCard';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { BookingStatus } from '@/src/types';

const FILTERS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Converted', value: 'CONVERTED' },
];

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState<BookingStatus | ''>('');

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ status: activeFilter || undefined }),
    queryFn: () => BookingService.list({ status: activeFilter || undefined, page_size: 20 }),
  });

  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Bookings</Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {data?.total != null ? `${data.total} total` : ''}
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, activeFilter === f.value && { backgroundColor: colors.primary }]}
            onPress={() => setActiveFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, { color: activeFilter === f.value ? '#fff' : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <SkeletonList count={5} />
        </ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <BookingCard booking={item} onPress={() => router.push(`/(tabs)/bookings/${item.id}`)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="calendar" title="No Bookings" description="Bookings from customers will appear here." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerCount: { fontSize: 13 },
  filters: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1 },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F1F5F9' },
  chipText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16 },
});
