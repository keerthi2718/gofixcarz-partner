import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import BookingService from '@/src/services/booking.service';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { BookingStatus } from '@/src/types';

const RED = '#C62828';

const FILTERS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'ACCEPTED' },
  { label: 'Completed', value: 'CONVERTED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Confirmed',
  REJECTED: 'Rejected',
  CONVERTED: 'Converted',
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#10B981',
  REJECTED: '#EF4444',
  CONVERTED: '#8B5CF6',
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<BookingStatus | ''>('');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ status: activeFilter || undefined }),
    queryFn: () => BookingService.list({ status: activeFilter || undefined, page_size: 30 }),
  });

  const bookings = data?.items ?? [];
  const filtered = search
    ? bookings.filter(b =>
        (b.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (b.customer_mobile ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : bookings;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Red Header */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Text style={styles.headerTitle}>Booking Requests</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search bookings..."
          placeholderTextColor="#9CA3AF"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity>
          <Feather name="filter" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.chip, activeFilter === f.value && styles.chipActive]}
            onPress={() => setActiveFilter(f.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, activeFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SkeletonList count={5} />
        </ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const statusColor = STATUS_COLOR[item.status] ?? '#6B7280';
            return (
              <TouchableOpacity
                style={styles.bookingCard}
                onPress={() => router.push(`/(tabs)/bookings/${item.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarLetter}>
                        {(item.customer_name ?? 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.customerName}>{item.customer_name ?? '—'}</Text>
                      <Text style={styles.customerPhone}>{item.customer_mobile ?? ''}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                      {STATUS_LABEL[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.serviceText} numberOfLines={1}>
                    {item.service_requested ?? '—'}
                  </Text>
                  <Text style={styles.vehicleText}>{item.notes ?? ''}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.timeText}>
                    {item.booking_date
                      ? new Date(item.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : '—'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={RED} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title="No Bookings"
              description={search ? 'Try a different search.' : 'Booking requests will appear here.'}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: RED, paddingHorizontal: 16, paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  filtersRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: RED, borderColor: RED },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },
  list: { padding: 12 },
  bookingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 1, gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 15, fontWeight: '700', color: RED },
  customerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  customerPhone: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  cardBody: { gap: 2 },
  serviceText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  vehicleText: { fontSize: 12, color: '#6B7280' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#6B7280' },
  amountText: { fontSize: 13, fontWeight: '700', color: RED },
});
