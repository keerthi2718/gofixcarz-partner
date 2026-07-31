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
import { MOCK_BOOKINGS } from '@/src/data/mockBookings';
import type { BookingStatus } from '@/src/types';

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

/* ── Shadow ── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

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

/* ── Booking Card ── */
type Booking = (typeof MOCK_BOOKINGS)[number];

function BookingCard({ item }: { item: Booking }) {
  const st = STATUS_MAP[item.status] ?? { label: item.status, color: '#64748B', bg: '#F3F4F6' };
  const initials = getInitials(item.customer_name ?? '?');
  const timeStr = item.booking_date ? formatDate(item.booking_date) : '';

  return (
    <TouchableOpacity
      style={[styles.card, SHADOW_CARD]}
      onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
      activeOpacity={0.7}
    >
      {/* Top row: avatar + name + status */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardLeft}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {/* Name */}
          <Text style={styles.cardName} numberOfLines={1}>{item.customer_name ?? '—'}</Text>
        </View>
        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Vehicle + service row */}
      <View style={styles.cardVehicleRow}>
        <Text style={styles.cardVehicleText} numberOfLines={1}>
          {item.service_requested ?? 'Service'}
        </Text>
      </View>

      {/* Bottom row: time + phone + view */}
      <View style={styles.cardBottomRow}>
        <View style={styles.cardMetaGroup}>
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
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCards}>
        {bookings.map(item => (
          <BookingCard key={item.id} item={item} />
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
  const [refreshing, setRefreshing] = useState(false);

  /* Counts per status */
  const counts: Record<string, number> = {};
  for (const b of MOCK_BOOKINGS) {
    counts[b.status] = (counts[b.status] ?? 0) + 1;
  }

  /* Filtered list */
  const filtered = MOCK_BOOKINGS
    .filter(b => !filter || b.status === filter)
    .filter(b =>
      !search ||
      (b.customer_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.customer_mobile ?? '').includes(search),
    );

  /* Group by date */
  const todayBookings     = filtered.filter(b => b.booking_date && isToday(b.booking_date));
  const tomorrowBookings  = filtered.filter(b => b.booking_date && isTomorrow(b.booking_date));
  const otherBookings     = filtered.filter(b => !b.booking_date || (!isToday(b.booking_date) && !isTomorrow(b.booking_date)));

  /* If nothing has a booking_date, show all under "TODAY" */
  const showAllAsToday = filtered.every(b => !b.booking_date);
  const displayToday    = showAllAsToday ? filtered : todayBookings;
  const displayTomorrow = showAllAsToday ? [] : tomorrowBookings;
  const displayOther    = showAllAsToday ? [] : otherBookings;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
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
              <X size={12} color="#C41E3A" strokeWidth={3} />
              <Text style={styles.headerClearText}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => { setSearchOpen(v => !v); setSearch(''); }}
            activeOpacity={0.7}
            style={styles.searchToggleBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Search size={20} color={searchOpen || !!search ? '#C41E3A' : '#0F172A'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C41E3A" />}
      >
        {/* ── Search bar ── */}
        {searchOpen && (
          <View style={styles.searchWrap}>
            <View style={styles.searchBox}>
              <Search size={16} color="#94A3B8" strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search bookings, vehicles..."
                placeholderTextColor="#94A3B8"
                autoFocus
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={15} color="#94A3B8" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
            </View>
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
            const count = f.value ? (counts[f.value] ?? 0) : MOCK_BOOKINGS.length;
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

          {/* Clear chip — shown when any filter is active */}
          {(filter !== '' || !!search) && (
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
        {displayToday.length > 0 && (
          <Section label="TODAY" bookings={displayToday} />
        )}

        {/* ── TOMORROW section ── */}
        {displayTomorrow.length > 0 && (
          <Section label="TOMORROW" bookings={displayTomorrow} />
        )}

        {/* ── OTHER section ── */}
        {displayOther.length > 0 && (
          <Section label="UPCOMING" bookings={displayOther} />
        )}

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <CalendarClock size={28} color="#C41E3A" strokeWidth={2} />
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
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
    backgroundColor: '#FFF1F3',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  headerClearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C41E3A',
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
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
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
    backgroundColor: '#C41E3A',
    borderColor: '#C41E3A',
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
    backgroundColor: '#FFF1F3',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  clearChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C41E3A',
  },

  /* Section */
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionCards: {
    paddingHorizontal: 16,
    gap: 12,
  },

  /* Booking card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  /* Card top row */
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
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
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C41E3A',
  },

  /* Card name */
  cardName: {
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
  cardVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingLeft: 44,
  },
  cardVehicleText: {
    fontSize: 14,
    color: '#64748B',
  },

  /* Bottom row */
  cardBottomRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 44,
  },
  cardMetaGroup: {
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
    color: '#C41E3A',
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
    backgroundColor: '#FEE2E2',
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
