import React, { useState } from 'react';
import {
  FlatList, Platform, Pressable, ScrollView,
  StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Avatar from '@/src/components/ui/Avatar';
import { MOCK_BOOKINGS } from '@/src/data/mockBookings';
import type { BookingStatus } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

const FILTERS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All',       value: ''          },
  { label: 'Pending',   value: 'PENDING'   },
  { label: 'Confirmed', value: 'ACCEPTED'  },
  { label: 'Converted', value: 'CONVERTED' },
  { label: 'Rejected',  value: 'REJECTED'  },
];

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB' },
  ACCEPTED:  { label: 'Confirmed', color: '#10B981', bg: '#ECFDF5' },
  REJECTED:  { label: 'Rejected',  color: '#EF4444', bg: '#FEF2F2' },
  CONVERTED: { label: 'Converted', color: '#8B5CF6', bg: '#F5F3FF' },
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const [filter,      setFilter]      = useState<BookingStatus | ''>('');
  const [search,      setSearch]      = useState('');
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [, forceUpdate] = useState(0);          // re-render when returning from detail
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const filtered = MOCK_BOOKINGS
    .filter(b => !filter || b.status === filter)
    .filter(b =>
      !search ||
      (b.customer_name  ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (b.customer_mobile ?? '').includes(search),
    );

  const counts: Record<string, number> = {};
  for (const b of MOCK_BOOKINGS) counts[b.status] = (counts[b.status] ?? 0) + 1;

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Page header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.pageTitle}>Bookings</Text>
          <Text style={styles.pageSubtitle}>{MOCK_BOOKINGS.length} total requests</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => { setSearchOpen(v => !v); setSearch(''); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name={searchOpen ? 'x' : 'search'} size={18} color={TEXT} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      {searchOpen && (
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Feather name="search" size={15} color={MUTED} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or phone…"
              placeholderTextColor="#94A3B8"
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x-circle" size={15} color={MUTED} />
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
        style={styles.chipBar}
      >
        {FILTERS.map(f => {
          const count = f.value ? (counts[f.value] ?? 0) : MOCK_BOOKINGS.length;
          return (
            <Pressable
              key={f.value}
              style={[styles.chip, filter === f.value && styles.chipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
              <View style={[styles.chipBadge, filter === f.value && styles.chipBadgeActive]}>
                <Text style={[styles.chipBadgeText, filter === f.value && styles.chipBadgeTextActive]}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        onLayout={() => forceUpdate(n => n + 1)}   // sync status changes from detail screen
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? { label: item.status, color: MUTED, bg: '#F3F4F6' };
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(tabs)/bookings/${item.id}` as any)}
              activeOpacity={0.86}
            >
              {/* Top row */}
              <View style={styles.cardTop}>
                <Avatar name={item.customer_name} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {item.customer_name ?? '—'}
                  </Text>
                  <Text style={styles.cardPhone} numberOfLines={1}>
                    {item.customer_mobile ?? ''}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                  <View style={[styles.dot, { backgroundColor: st.color }]} />
                  <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>

              {/* Bottom meta */}
              {(item.service_requested || item.booking_date) ? (
                <View style={styles.cardMeta}>
                  {item.service_requested ? (
                    <View style={styles.metaRow}>
                      <View style={styles.metaIconWrap}>
                        <Feather name="tool" size={11} color={PRIMARY} />
                      </View>
                      <Text style={styles.metaText} numberOfLines={1}>{item.service_requested}</Text>
                    </View>
                  ) : null}
                  {item.booking_date ? (
                    <View style={styles.metaRow}>
                      <View style={[styles.metaIconWrap, { backgroundColor: '#F1F5F9' }]}>
                        <Feather name="calendar" size={11} color={MUTED} />
                      </View>
                      <Text style={styles.metaText}>
                        {new Date(item.booking_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="calendar" size={28} color={PRIMARY} />
            </View>
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySubtitle}>
              {search ? 'Try a different search.' : 'No requests match this filter.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  pageTitle:    { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },

  searchWrap: { paddingHorizontal: 20, paddingBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, height: 46,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  searchInput: { flex: 1, fontSize: 15, color: TEXT },

  chipBar: { flexGrow: 0 },
  chipRow: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD,
  },
  chipActive:         { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:           { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTextActive:     { color: '#fff' },
  chipBadge:          { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  chipBadgeActive:    { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText:      { fontSize: 10, fontWeight: '700', color: MUTED },
  chipBadgeTextActive:{ color: '#fff' },

  list: { paddingHorizontal: 20, gap: 10 },

  card: {
    backgroundColor: CARD,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardName:  { fontSize: 15, fontWeight: '600', color: TEXT, marginBottom: 3 },
  cardPhone: { fontSize: 12, color: MUTED },

  cardMeta: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 14, paddingBottom: 12, flexWrap: 'wrap',
  },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaIconWrap:{ width: 20, height: 20, borderRadius: 6, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  metaText:    { fontSize: 12, color: MUTED },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  dot:        { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: MUTED },
});
