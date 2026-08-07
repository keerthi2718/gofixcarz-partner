import React, { useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Clock, Phone, CalendarClock, X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import BookingService from '@/src/services/booking.service';
import type { BookingStatus, BookingDetailResponse } from '@/src/types';

/* ── Filter definitions ── */
const FILTERS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All',       value: ''          },
  { label: 'Pending',   value: 'PENDING'   },
  { label: 'Confirmed', value: 'ACCEPTED'  },
  { label: 'Completed', value: 'CONVERTED' },
  { label: 'Cancelled', value: 'REJECTED'  },
];

/* ── Status display config ── */
const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#D97706', bg: '#FFFBEB' },
  ACCEPTED:  { label: 'Confirmed', color: '#2563EB', bg: '#EFF6FF' },
  CONVERTED: { label: 'Completed', color: '#059669', bg: '#ECFDF5' },
  REJECTED:  { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
};

/* ── Helpers ── */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatTodayHeader(): string {
  const d = new Date();
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isTomorrow(iso: string): boolean {
  const d = new Date(iso);
  const tom = new Date();
  tom.setDate(tom.getDate() + 1);
  return (
    d.getFullYear() === tom.getFullYear() &&
    d.getMonth() === tom.getMonth() &&
    d.getDate() === tom.getDate()
  );
}

/* ── Booking Row ── */
type Booking = BookingDetailResponse;

function BookingRow({ item, isLast }: { item: Booking; isLast: boolean }) {
  const st = STATUS_MAP[item.status] ?? { label: item.status, color: '#64748B', bg: '#F3F4F6' };
  const initials = getInitials(item.customer_name ?? '?');
  const timeStr = item.booking_date ? formatDate(item.booking_date) : '';

  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
      activeOpacity={0.6}
    >
      {/* Top row: avatar + name + status */}
      <View style={styles.rowTopRow}>
        <View style={styles.rowLeft}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {/* Name */}
          <Text style={styles.rowName} numberOfLines={1}>{item.customer_name ?? '—'}</Text>
        </View>
        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Vehicle + service row */}
      <View style={styles.rowVehicleRow}>
        <Text style={styles.rowVehicleText} numberOfLines={1}>
          {item.service_requested ?? 'Service'}
        </Text>
      </View>

      {/* Bottom row: time + phone + view */}
      <View style={styles.rowBottomRow}>
        <View style={styles.rowMetaGroup}>
          {timeStr ? (
            <View style={styles.metaItem}>
              <Clock size={14} color="#94A3B8" strokeWidth={2} />
              <Text style={styles.metaText}>{timeStr}</Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Phone size={14} color="#94A3B8" strokeWidth={2} />
            <Text style={styles.metaText}>
              {item.customer_mobile ? item.customer_mobile : 'Call'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.viewLink}>View</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/* ── Section with label ── */
function Section({ label, bookings }: { label: string; bookings: Booking[] }) {
  if (bookings.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionList}>
        {bookings.map((item, i) => (
          <BookingRow key={item.id} item={item} isLast={i === bookings.length - 1} />
        ))}
      </View>
    </View>
  );
}

/* ── Screen ── */
export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<BookingStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: bookingsData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.BOOKINGS({}),
    queryFn:  () => BookingService.list({ page_size: 100 }),
  });
  const allBookings = bookingsData?.items ?? [];

  /* Counts per status */
  const counts: Record<string, number> = {};
  for (const b of allBookings) {
    counts[b.status] = (counts[b.status] ?? 0) + 1;
  }

  /* Filtered list */
  const filtered = allBookings
    .filter(b => !filter || b.status === filter)
    .filter(b =>
      !search ||
      (b.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.customer_mobile ?? '').includes(search),
    );

  /* Group by date — bookings with no booking_date go to "Unscheduled" */
  const todayBookings       = filtered.filter(b => b.booking_date && isToday(b.booking_date));
  const tomorrowBookings    = filtered.filter(b => b.booking_date && isTomorrow(b.booking_date));
  const upcomingBookings    = filtered.filter(b => b.booking_date && !isToday(b.booking_date) && !isTomorrow(b.booking_date));
  const unscheduledBookings = filtered.filter(b => !b.booking_date);

  const onRefresh = () => { refetch(); };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 20 : 12) + insets.top }]}>
        <View>
          <Text style={styles.headerTitle}>Bookings</Text>
          <Text style={styles.headerDate}>{formatTodayHeader()}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {(filter !== '' || !!search || searchOpen) && (
            <TouchableOpacity
              onPress={() => { setFilter(''); setSearch(''); setSearchOpen(false); }}
              activeOpacity={0.7}
              style={styles.headerClearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={12} color="#2563EB" strokeWidth={3} />
              <Text style={styles.headerClearText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { setSearchOpen(v => !v); setSearch(''); }}
            activeOpacity={0.7}
            style={styles.searchToggleBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={20} color={searchOpen || !!search ? '#2563EB' : '#0F172A'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* ── Search bar ── */}
        {searchOpen && (
          <View style={styles.searchWrap}>
            <View style={[styles.searchBox, !!search && styles.searchBoxActive]}>
              <Search size={16} color={search ? '#2563EB' : '#94A3B8'} strokeWidth={2.2} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search bookings, customer, or phone..."
                placeholderTextColor="#94A3B8"
                autoFocus
              />
              {!!search && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={styles.searchClearBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={13} color="#64748B" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
            {!!search && (
              <View style={styles.searchResultBadge}>
                <Text style={styles.searchResultText}>{filtered.length} found</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScrollView}
        >
          {FILTERS.map(f => {
            const count = f.value ? (counts[f.value] ?? 0) : allBookings.length;
            const isActive = filter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFilter(f.value)}
                activeOpacity={0.7}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {f.label} {count}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Clear chip — shown when any filter or search bar is active */}
          {(filter !== '' || !!search || searchOpen) && (
            <TouchableOpacity
              onPress={() => { setFilter(''); setSearch(''); setSearchOpen(false); }}
              activeOpacity={0.75}
              style={styles.clearChip}
            >
              <X size={11} color="#C41E3A" strokeWidth={3} />
              <Text style={styles.clearChipText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── TODAY section ── */}
        {todayBookings.length > 0 && (
          <Section label="TODAY" bookings={todayBookings} />
        )}

        {/* ── TOMORROW section ── */}
        {tomorrowBookings.length > 0 && (
          <Section label="TOMORROW" bookings={tomorrowBookings} />
        )}

        {/* ── UPCOMING section ── */}
        {upcomingBookings.length > 0 && (
          <Section label="UPCOMING" bookings={upcomingBookings} />
        )}

        {/* ── UNSCHEDULED section — bookings with no date set ── */}
        {unscheduledBookings.length > 0 && (
          <Section label="UNSCHEDULED" bookings={unscheduledBookings} />
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <CalendarClock size={28} color="#2563EB" strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try a different search.' : 'No requests match this filter.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Styles ── */
const SHADOW_HEADER = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  android: { elevation: 2 },
  default: {},
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexShrink: 0,
    ...SHADOW_HEADER,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  headerClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  searchToggleBtn: {
    padding: 8,
    marginRight: -8,
  },

  /* Scroll content */
  scrollContent: {
    paddingTop: 0,
  },

  /* Search bar */
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 44,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  searchBoxActive: {
    borderColor: '#2563EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 0,
  },
  searchClearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
  },
  searchResultText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* Filter chips */
  chipScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  chip: {
    flexShrink: 0,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  /* Clear chip */
  clearChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  clearChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },

  /* Section */
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionList: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  /* Booking row */
  row: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  /* Top row */
  rowTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  /* Avatar */
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },

  /* Row name */
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },

  /* Status pill */
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  /* Vehicle/service row */
  rowVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingLeft: 44,
  },
  rowVehicleText: {
    fontSize: 14,
    color: '#64748B',
  },

  /* Bottom row */
  rowBottomRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 44,
  },
  rowMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  viewLink: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
  },

  /* Empty state */
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
});
