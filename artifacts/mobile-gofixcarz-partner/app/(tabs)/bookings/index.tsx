import React, { useState } from 'react';
import {
  FlatList, Platform, Pressable, RefreshControl,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import BookingService from '@/src/services/booking.service';
import { useColors } from '@/hooks/useColors';
import Avatar from '@/src/components/ui/Avatar';
import { radius, shadow, spacing, typography } from '@/constants/theme';
import type { BookingStatus } from '@/src/types';

const FILTERS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All',       value: '' },
  { label: 'Pending',   value: 'PENDING' },
  { label: 'Confirmed', value: 'ACCEPTED' },
  { label: 'Converted', value: 'CONVERTED' },
  { label: 'Rejected',  value: 'REJECTED' },
];

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB' },
  ACCEPTED:  { label: 'Confirmed', color: '#22C55E', bg: '#DCFCE7' },
  REJECTED:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2' },
  CONVERTED: { label: 'Converted', color: '#8B5CF6', bg: '#F5F3FF' },
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [filter, setFilter] = useState<BookingStatus | ''>('');
  const [search, setSearch] = useState('');
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({ status: filter || undefined }),
    queryFn: () => BookingService.list({ status: filter || undefined, page_size: 30 }),
  });

  const all = data?.items ?? [];
  const items = search
    ? all.filter(b =>
        (b.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (b.customer_mobile ?? '').includes(search),
      )
    : all;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 14, backgroundColor: colors.primary }]}>
        <Text style={[typography.title, { color: '#fff' }]}>Booking Requests</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textDisabled} />
          <TextInput
            style={[styles.searchInput, typography.body, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or phone…"
            placeholderTextColor={colors.textDisabled}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x-circle" size={16} color={colors.textDisabled} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.value}
              style={[
                styles.chip,
                { borderColor: filter === f.value ? colors.primary : colors.border },
                filter === f.value && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[typography.label, { color: filter === f.value ? '#fff' : colors.textSecondary }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? { label: item.status, color: '#6B7280', bg: '#F3F4F6' };
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.sm]}
              onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <Avatar name={item.customer_name} size={44} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[typography.titleSm, { color: colors.text }]}>
                    {item.customer_name ?? '—'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {item.customer_mobile ?? ''}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <View style={[styles.dot, { backgroundColor: st.color }]} />
                  <Text style={[typography.labelSm, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {(item.service_requested || item.notes) ? (
                <View style={[styles.cardBody, { borderTopColor: colors.divider }]}>
                  {item.service_requested ? (
                    <View style={styles.infoRow}>
                      <Feather name="tool" size={12} color={colors.textDisabled} />
                      <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.service_requested}
                      </Text>
                    </View>
                  ) : null}
                  {item.booking_date ? (
                    <View style={styles.infoRow}>
                      <Feather name="calendar" size={12} color={colors.textDisabled} />
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {new Date(item.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={colors.textDisabled} />
              <Text style={[typography.title, { color: colors.textSecondary, marginTop: 12 }]}>No Bookings</Text>
              <Text style={[typography.bodySm, { color: colors.textDisabled, marginTop: 4 }]}>
                {search ? 'Try a different search.' : 'Booking requests will appear here.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  searchWrap: { paddingHorizontal: spacing.base, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    borderWidth: 1, height: 44,
  },
  searchInput: { flex: 1 },
  filterBar: { borderBottomWidth: 1 },
  chipRow: { paddingHorizontal: spacing.base, paddingVertical: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
  },
  list: { padding: spacing.base, gap: spacing.sm },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  cardBody: { borderTopWidth: 1, paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.sm, gap: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  empty: { alignItems: 'center', paddingVertical: 60 },
});
