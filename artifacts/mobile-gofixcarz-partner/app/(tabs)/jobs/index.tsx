import React, { useState, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import { formatCurrency } from '@/src/utils/helpers';
import type { JobResponse } from '@/src/types';
import { Filter, Plus, Wrench, Clock, ChevronRight, Search, X, Calendar, CheckCircle2 } from 'lucide-react-native';

const DEFAULT_STAGE = 'Open';

/* ─────────────── Status config ─────────────── */
const JOB_STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  OPEN:             { label: 'Open',        color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  IN_PROGRESS:      { label: 'In Progress', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  QUALITY_CHECK:    { label: 'QC Check',    color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  READY:            { label: 'Ready',       color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
  COMPLETED:        { label: 'Completed',    color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
  DELIVERED:        { label: 'Delivered',    color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
};

/* Stage id → status values it matches */
const STAGE_STATUS_MAP: Record<string, string[]> = {
  Open:           ['OPEN'],
  'In Progress':  ['IN_PROGRESS'],
  'Quality Check':['QUALITY_CHECK'],
  Ready:          ['READY'],
  Delivered:      ['COMPLETED', 'DELIVERED'],
};

const STAGES = ['Open', 'In Progress', 'Quality Check', 'Ready', 'Delivered'];

/* ─────────────── FAB Shadow ─────────────── */
const FAB_SHADOW = Platform.select({
  ios:     { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  android: { elevation: 8 },
  default: {},
});

/* ─────────────── Helpers ─────────────── */
function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

const AVATAR_PALETTE = [
  { bg: '#EFF6FF', fg: '#2563EB' },
  { bg: '#ECFDF5', fg: '#059669' },
  { bg: '#FFFBEB', fg: '#D97706' },
  { bg: '#F5F3FF', fg: '#7C3AED' },
  { bg: '#F0F9FF', fg: '#0284C7' },
  { bg: '#EEF2FF', fg: '#4F46E5' },
];

function getAvatarColor(name?: string): { bg: string; fg: string } {
  if (!name) return { bg: '#F3F4F6', fg: '#6B7280' };
  const idx = name.charCodeAt(0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

function parseJobDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'number') {
    const ms = val < 10000000000 ? val * 1000 : val;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const str = val.trim();
    if (!str) return null;
    if (/^\d+$/.test(str)) {
      const num = parseInt(str, 10);
      const ms = num < 10000000000 ? num * 1000 : num;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    const dateOnlyMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (dateOnlyMatch) {
      const [, y, m, day] = dateOnlyMatch;
      const d = new Date(Number(y), Number(m) - 1, Number(day));
      return isNaN(d.getTime()) ? null : d;
    }
    let normalizedStr = str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str;
    normalizedStr = normalizedStr.replace(/(\.\d{3})\d+/, '$1');
    let d = new Date(normalizedStr);
    if (!isNaN(d.getTime())) return d;
    d = new Date(str.replace(/-/g, '/'));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isToday(d: Date | null): boolean {
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatJobDate(rawDate: any, isDelivered?: boolean): string {
  const parsed = parseJobDate(rawDate);
  if (!parsed) return '';
  if (isToday(parsed)) {
    return isDelivered ? 'Delivered Today' : 'Today';
  }
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ─────────────── Component ─────────────── */
export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ stage?: string }>();
  const [activeStage, setActiveStage] = useState(DEFAULT_STAGE);
  const [search,     setSearch]       = useState('');
  const [searchOpen, setSearchOpen]   = useState(false);

  useEffect(() => {
    if (params.stage && STAGES.includes(params.stage)) {
      setActiveStage(params.stage);
    }
  }, [params.stage]);

  const isFiltered = activeStage !== DEFAULT_STAGE || !!search || searchOpen;

  function resetFilters() {
    setActiveStage(DEFAULT_STAGE);
    setSearch('');
    setSearchOpen(false);
  }

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOBS({}),
    queryFn: () => JobService.list({}),
  });

  const allItems: JobResponse[] = Array.isArray(data)
    ? data
    : data?.items ?? (data as any)?.jobs ?? (data as any)?.results ?? (data as any)?.data ?? [];

  /* Count per stage */
  const stageCount = (stage: string) => {
    const statuses = STAGE_STATUS_MAP[stage] ?? [];
    return allItems.filter(j => statuses.includes(j.status)).length;
  };

  /* Filtered & Sorted jobs: Today's delivered jobs always stay at the top */
  const activeStatuses = STAGE_STATUS_MAP[activeStage] ?? [];
  const filteredJobs = allItems
    .filter(j => activeStatuses.includes(j.status))
    .filter(j => {
      if (!search) return true;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const qNoSpace = q.replace(/\s+/g, '');
      const regNoSpace = (j.registration_number ?? '').replace(/\s+/g, '').toLowerCase();
      const vehicleStr = `${j.brand ?? ''} ${j.vehicle_model ?? ''}`.toLowerCase();
      const servicesStr = j.services?.map((s: any) => s.name).join(' ').toLowerCase() ?? '';

      return (
        (j.registration_number ?? '').toLowerCase().includes(q) ||
        (regNoSpace && qNoSpace && regNoSpace.includes(qNoSpace)) ||
        (j.customer_name ?? '').toLowerCase().includes(q) ||
        (j.customer_mobile ?? '').toLowerCase().includes(q) ||
        (j.job_number ?? '').toLowerCase().includes(q) ||
        vehicleStr.includes(q) ||
        servicesStr.includes(q) ||
        j.id.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const isDeliveredA = (a.status || '').toString().toUpperCase().includes('DELIVER') || (a.status || '').toString().toUpperCase().includes('COMPLETE');
      const isDeliveredB = (b.status || '').toString().toUpperCase().includes('DELIVER') || (b.status || '').toString().toUpperCase().includes('COMPLETE');

      const rawDateA = isDeliveredA
        ? (a.completed_at || (a as any).completed_date || a.updated_at || (a as any).updated_date || a.created_at || (a as any).created_date)
        : (a.created_at || (a as any).created_date || a.updated_at || (a as any).updated_date);
      const rawDateB = isDeliveredB
        ? (b.completed_at || (b as any).completed_date || b.updated_at || (b as any).updated_date || b.created_at || (b as any).created_date)
        : (b.created_at || (b as any).created_date || b.updated_at || (b as any).updated_date);

      const dateA = parseJobDate(rawDateA);
      const dateB = parseJobDate(rawDateB);

      const isTodayA = isToday(dateA);
      const isTodayB = isToday(dateB);

      // 1. Today's delivered/completed jobs always come first at the very top!
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // 2. Otherwise sort by date descending (most recent first)
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      return timeB - timeA;
    });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? 20 : 12) + insets.top }]}>
        <Text style={styles.headerTitle}>Workshop</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerSub}>Today, {allItems.length} jobs</Text>
          <TouchableOpacity
            style={[styles.filterBtn, (searchOpen || isFiltered) && styles.filterBtnActive]}
            activeOpacity={0.7}
            onPress={() => { setSearchOpen(v => !v); if (searchOpen) setSearch(''); }}
          >
            <Search size={16} color={searchOpen || isFiltered ? '#2563EB' : '#64748B'} strokeWidth={2} />
            {isFiltered && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: insets.bottom + 140 },
        ]}
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
                placeholder="Search plate, customer name, or job #..."
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
                <Text style={styles.searchResultText}>{filteredJobs.length} found</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Pipeline strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stageScroll}
          contentContainerStyle={styles.stageRow}
        >
          {/* Reset pill — shown when any filter or search is active */}
          {isFiltered && (
            <TouchableOpacity style={styles.resetPill} onPress={resetFilters} activeOpacity={0.75}>
              <X size={11} color="#2563EB" strokeWidth={3} />
              <Text style={styles.resetPillText}>Reset</Text>
            </TouchableOpacity>
          )}
          {STAGES.map(stage => {
            const isActive = activeStage === stage;
            const count = stageCount(stage);
            return (
              <TouchableOpacity
                key={stage}
                activeOpacity={0.7}
                style={[
                  styles.stagePill,
                  isActive ? styles.stagePillActive : styles.stagePillInactive,
                ]}
                onPress={() => setActiveStage(stage)}
              >
                <Text
                  style={[
                    styles.stagePillText,
                    isActive ? styles.stagePillTextActive : styles.stagePillTextInactive,
                  ]}
                >
                  {stage}
                </Text>
                <View
                  style={[
                    styles.stageBadge,
                    isActive ? styles.stageBadgeActive : styles.stageBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stageBadgeText,
                      isActive ? styles.stageBadgeTextActive : styles.stageBadgeTextInactive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Job List ── */}
        <View style={styles.jobList}>
          {isLoading ? (
            /* Skeleton rows */
            [0, 1, 2].map(i => (
              <View key={i} style={styles.skeleton} />
            ))
          ) : filteredJobs.length === 0 ? (
            /* Empty state */
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Wrench size={26} color="#2563EB" strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>No {activeStage} Jobs</Text>
              <Text style={styles.emptySubtitle}>
                There are currently no job cards in {activeStage.toLowerCase()} stage.
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => router.push('/jobs/create' as any)}
                activeOpacity={0.8}
              >
                <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.emptyCreateText}>Create Job Card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredJobs.map(item => {
              const st = JOB_STATUS[item.status] ?? { label: item.status, color: '#475569', bg: '#F3F4F6', dot: '#94A3B8' };
              const vehicleLine = [item.brand, item.vehicle_model].filter(Boolean).join(' ');
              const serviceNames = item.services?.map((s: any) => s.name).join(' · ') || item.description || '';
              const customerName = item.customer_name ?? 'Walk-in Customer';
              const jobRef = item.job_number ?? `#${item.id.substring(0, 6).toUpperCase()}`;
              const plate = item.registration_number
                ? item.registration_number.toUpperCase().replace(/([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})/, '$1 $2 $3 $4')
                : null;
              const avatar = getAvatarColor(customerName);
              const estAmount = item.estimated_amount ?? item.final_amount ?? null;

              const isDelivered = (item.status || '').toString().toUpperCase().includes('DELIVER') ||
                                  (item.status || '').toString().toUpperCase().includes('COMPLETE');
              const rawCreatedDate = item.created_at || (item as any).created_date;
              const rawCompletedDate = isDelivered
                ? (item.completed_at || (item as any).completed_date || item.updated_at || (item as any).updated_date)
                : null;

              const formattedCreatedDate = formatJobDate(rawCreatedDate, false);
              const formattedCompletedDate = rawCompletedDate ? formatJobDate(rawCompletedDate, true) : null;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  style={styles.card}
                  onPress={() => router.push(`/(tabs)/jobs/${item.id}` as any)}
                >
                  {/* Status Indicator Bar */}
                  <View style={[styles.cardBar, { backgroundColor: st.dot }]} />

                  <View style={styles.cardInner}>
                    {/* Header: Title + Status */}
                    <View style={styles.cardHeader}>
                      <Text style={styles.vehicleTitle} numberOfLines={1}>
                        {vehicleLine || 'Vehicle Job Card'}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                        <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    {/* Badges: Plate + Ref */}
                    <View style={styles.badgeRow}>
                      {!!plate && (
                        <View style={styles.plateBadge}>
                          <Text style={styles.plateText}>{plate}</Text>
                        </View>
                      )}
                      <View style={styles.refBadge}>
                        <Text style={styles.refText}>{jobRef}</Text>
                      </View>
                    </View>

                    {/* Footer Row */}
                    <View style={styles.cardFooter}>
                      <View style={styles.customerRow}>
                        <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                          <Text style={[styles.avatarText, { color: avatar.fg }]}>
                            {getInitials(customerName)}
                          </Text>
                        </View>
                        <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
                      </View>

                      <View style={styles.footerRight}>
                        {estAmount ? (
                          <Text style={styles.amountText}>{formatCurrency(estAmount)}</Text>
                        ) : null}
                        <View style={styles.chevronCircle}>
                          <ChevronRight size={14} color="#64748B" strokeWidth={2.5} />
                        </View>
                      </View>
                    </View>

                    {/* Date Subtitle Line at bottom under customer name: Created left, Delivered right */}
                    <View style={styles.bottomDateRow}>
                      {!!formattedCreatedDate ? (
                        <View style={styles.dateItem}>
                          <Clock size={11} color="#64748B" strokeWidth={2} />
                          <Text style={styles.dateSubText}>Created: {formattedCreatedDate}</Text>
                        </View>
                      ) : <View />}

                      {isDelivered && !!formattedCompletedDate ? (
                        <View style={styles.dateItem}>
                          <CheckCircle2 size={11} color="#059669" strokeWidth={2.2} />
                          <Text style={[styles.dateSubText, { color: '#047857', fontWeight: '700' }]}>
                            {formattedCompletedDate.startsWith('Delivered') ? formattedCompletedDate : `Delivered: ${formattedCompletedDate}`}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.fab, { bottom: insets.bottom + 24 }, FAB_SHADOW]}
        onPress={() => router.push('/jobs/create' as any)}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

/* ─────────────── Styles ─────────────── */
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
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
  },
  filterBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterBtnActive: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  filterDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
  },

  /* Search bar */
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
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

  /* Reset pill */
  resetPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  resetPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },

  /* Body */
  body: {
    flex: 1,
  },
  bodyContent: {
    // paddingBottom set dynamically
  },

  /* Pipeline strip */
  stageScroll: {
    marginTop: 12,
    flexGrow: 0,
    flexShrink: 0,
  },
  stageRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    flexDirection: 'row',
  },
  stagePill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  stagePillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  stagePillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  stagePillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stagePillTextActive: {
    color: '#FFFFFF',
  },
  stagePillTextInactive: {
    color: '#64748B',
  },
  stageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  stageBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stageBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  stageBadgeText: {
    fontSize: 10,
  },
  stageBadgeTextActive: {
    color: '#FFFFFF',
  },
  stageBadgeTextInactive: {
    color: '#64748B',
  },

  /* Job list container */
  jobList: {
    marginTop: 10,
  },

  /* Skeleton */
  skeleton: {
    height: 100,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
  },

  /* Empty state */
  empty: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCreateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ── Modern Job Card ────────────────────────────────────── */
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  cardBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardInner: {
    flex: 1,
    padding: 13,
  },

  /* Card Header */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  vehicleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  /* Date Subtitle Line at bottom under customer name */
  bottomDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateSubText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748B',
  },
  dateDividerText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '400',
    letterSpacing: -0.5,
  },

  /* Badges Row */
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  plateBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 1.2,
  },
  refBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  refText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveredDateBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  deliveredDateText: {
    color: '#047857',
    fontWeight: '700',
  },

  /* Service / Complaint Box */
  serviceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  serviceText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },

  /* Card Footer */
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },

  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  chevronCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
