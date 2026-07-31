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
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import { Filter, Plus, Wrench, Clock, ChevronRight, Search, X } from 'lucide-react-native';

const DEFAULT_STAGE = 'In Progress';

/* ─────────────── Status config ─────────────── */
// Muted, desaturated — status communicates without shouting
const JOB_STATUS: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  OPEN:             { label: 'Open',        color: '#3B5FA0', bg: '#EEF2FB', dot: '#5B8DEF' },
  IN_PROGRESS:      { label: 'In Progress', color: '#0369A1', bg: '#F0F8FF', dot: '#38A0D4' },
  QUALITY_CHECK:    { label: 'QC Check',    color: '#5B4FA0', bg: '#F2F0FB', dot: '#8B80D4' },
  READY:            { label: 'Ready',       color: '#1A6E52', bg: '#EDFAF4', dot: '#34C987' },
  COMPLETED:        { label: 'Done',        color: '#1A6E52', bg: '#EDFAF4', dot: '#34C987' },
  DELIVERED:        { label: 'Done',        color: '#1A6E52', bg: '#EDFAF4', dot: '#34C987' },
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

/* ─────────────── Shadow ─────────────── */
const SHADOW_CARD = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  android: { elevation: 2 },
  default: {},
});

const FAB_SHADOW = Platform.select({
  ios:     { shadowColor: '#C41E3A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
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
  { bg: '#DBEAFE', fg: '#1E40AF' },
  { bg: '#D1FAE5', fg: '#065F46' },
  { bg: '#FEF3C7', fg: '#92400E' },
  { bg: '#FCE7F3', fg: '#9D174D' },
  { bg: '#EDE9FE', fg: '#4C1D95' },
  { bg: '#FEE2E2', fg: '#991B1B' },
];

function getAvatarColor(name?: string): { bg: string; fg: string } {
  if (!name) return { bg: '#F3F4F6', fg: '#6B7280' };
  const idx = name.charCodeAt(0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

/* ─────────────── Component ─────────────── */
export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const [activeStage, setActiveStage] = useState(DEFAULT_STAGE);
  const [activeTech, setActiveTech]   = useState('All Techs');
  const [search,     setSearch]       = useState('');
  const [searchOpen, setSearchOpen]   = useState(false);

  const isFiltered = activeStage !== DEFAULT_STAGE || !!search;

  function resetFilters() {
    setActiveStage(DEFAULT_STAGE);
    setSearch('');
    setSearchOpen(false);
  }

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOBS({}),
    queryFn: () => JobService.list({}),
  });

  const allItems = data?.items ?? [];

  /* Count per stage */
  const stageCount = (stage: string) => {
    const statuses = STAGE_STATUS_MAP[stage] ?? [];
    return allItems.filter(j => statuses.includes(j.status)).length;
  };

  /* Unique tech names — there's no assigned_technician field in the API,
     so we derive from customer_name as a stand-in for demo purposes */
  const techNames: string[] = ['All Techs'];

  /* Filtered jobs */
  const activeStatuses = STAGE_STATUS_MAP[activeStage] ?? [];
  const filteredJobs = allItems
    .filter(j => activeStatuses.includes(j.status))
    .filter(j => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (j.registration_number ?? '').toLowerCase().includes(q) ||
        (j.customer_name ?? '').toLowerCase().includes(q) ||
        (j.job_number ?? '').toLowerCase().includes(q)
      );
    });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <Text style={styles.headerTitle}>Workshop</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerSub}>Today, {allItems.length} jobs</Text>
          {isFiltered && (
            <TouchableOpacity
              onPress={resetFilters}
              activeOpacity={0.7}
              style={styles.headerResetBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={12} color="#C41E3A" strokeWidth={3} />
              <Text style={styles.headerResetText}>Reset</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.filterBtn, (searchOpen || isFiltered) && styles.filterBtnActive]}
            activeOpacity={0.7}
            onPress={() => { setSearchOpen(v => !v); if (searchOpen) setSearch(''); }}
          >
            <Search size={16} color={searchOpen || isFiltered ? '#C41E3A' : '#64748B'} strokeWidth={2} />
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
            tintColor="#C41E3A"
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
            <View style={styles.searchBox}>
              <Search size={15} color="#94A3B8" strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search plate, name, job #..."
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
              <X size={11} color="#C41E3A" strokeWidth={3} />
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

        {/* ── Tech filter row ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.techScroll}
          contentContainerStyle={styles.techRow}
        >
          {techNames.map(tech => {
            const isActive = activeTech === tech;
            return (
              <TouchableOpacity
                key={tech}
                activeOpacity={0.7}
                style={[
                  styles.techPill,
                  isActive ? styles.techPillActive : styles.techPillInactive,
                ]}
                onPress={() => setActiveTech(tech)}
              >
                <Text
                  style={[
                    styles.techPillText,
                    isActive ? styles.techPillTextActive : styles.techPillTextInactive,
                  ]}
                >
                  {tech}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Job Cards ── */}
        <View style={styles.cardList}>
          {isLoading ? (
            /* Skeleton cards */
            [0, 1, 2, 3].map(i => (
              <View key={i} style={styles.skeleton} />
            ))
          ) : filteredJobs.length === 0 ? (
            /* Empty state */
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Wrench size={28} color="#C41E3A" strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>No jobs here</Text>
              <Text style={styles.emptySubtitle}>
                No jobs found for the selected filters
              </Text>
            </View>
          ) : (
            filteredJobs.map(item => {
              const st = JOB_STATUS[item.status] ?? { label: item.status, color: '#475569', bg: '#F3F4F6', dot: '#94A3B8' };
              const vehicleLine = [item.brand, item.vehicle_model].filter(Boolean).join(' ');
              const serviceNames = item.services?.map(s => s.name).join(' · ') ?? '';
              const techName = item.customer_name ?? '—';
              const jobRef = item.job_number ?? `#${item.id.substring(0, 6).toUpperCase()}`;
              const plate = item.registration_number
                ? item.registration_number.toUpperCase().replace(/([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})/, '$1 $2 $3 $4')
                : null;
              const avatar = getAvatarColor(techName);

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  style={styles.card}
                  onPress={() => router.push(`/(tabs)/jobs/${item.id}` as any)}
                >
                  {/* Left accent strip — status at a glance without reading */}
                  <View style={[styles.cardStrip, { backgroundColor: st.dot }]} />

                  {/* Card body — all content indented past the strip */}
                  <View style={styles.cardBody}>

                    {/* Row 1: vehicle name (dominant) + chevron */}
                    <View style={styles.cardHeadRow}>
                      <Text style={styles.vehicleName} numberOfLines={1}>
                        {vehicleLine || 'Unknown Vehicle'}
                      </Text>
                      <ChevronRight size={15} color="#D1D5DB" strokeWidth={2} />
                    </View>

                    {/* Row 2: plate badge + status pill — both on same line */}
                    <View style={styles.cardSubRow}>
                      {!!plate && (
                        <View style={styles.plateBadge}>
                          <Text style={styles.plateText}>{plate}</Text>
                        </View>
                      )}
                      <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    {/* Row 3: services — with wrench icon */}
                    {!!serviceNames && (
                      <View style={styles.servicesRow}>
                        <Wrench size={11} color="#9CA3AF" strokeWidth={2} />
                        <Text style={styles.serviceText} numberOfLines={1}>{serviceNames}</Text>
                      </View>
                    )}

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Footer: tech avatar + name, job ref, est time */}
                    <View style={styles.cardFooter}>
                      <View style={styles.cardTechRow}>
                        <View style={[styles.techAvatar, { backgroundColor: avatar.bg }]}>
                          <Text style={[styles.techInitials, { color: avatar.fg }]}>
                            {getInitials(techName)}
                          </Text>
                        </View>
                        <Text style={styles.techName} numberOfLines={1}>{techName}</Text>
                        <Text style={styles.jobRef}>{jobRef}</Text>
                      </View>
                      <View style={styles.estWrap}>
                        <Clock size={10} color="#9CA3AF" strokeWidth={2.5} />
                        <Text style={styles.estTime}>2h</Text>
                      </View>
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
        style={[styles.fab, { bottom: insets.bottom + 76 }, FAB_SHADOW]}
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
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
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
  headerResetBtn: {
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
  headerResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C41E3A',
  },
  filterBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterBtnActive: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F3',
  },
  filterDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C41E3A',
  },

  /* Search bar */
  searchWrap: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
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
    backgroundColor: '#FFF1F3',
    borderColor: '#FECDD3',
  },
  resetPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C41E3A',
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
    backgroundColor: '#C41E3A',
    borderColor: '#C41E3A',
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

  /* Tech filter */
  techScroll: {
    marginTop: 12,
    flexGrow: 0,
    flexShrink: 0,
  },
  techRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    flexDirection: 'row',
  },
  techPill: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  techPillActive: {
    backgroundColor: '#FFF1F3',
    borderColor: '#C41E3A',
  },
  techPillInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  techPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  techPillTextActive: {
    color: '#C41E3A',
  },
  techPillTextInactive: {
    color: '#64748B',
  },

  /* Card list */
  cardList: {
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },

  /* Skeleton */
  skeleton: {
    height: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    marginHorizontal: 0,
  },

  /* Empty state */
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
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
    textAlign: 'center',
  },

  /* ── Job card ────────────────────────────────────────────
     Structure: left-strip (status color) + card body.
     Scan order: strip color → vehicle name → plate/status → services → tech
  ──────────────────────────────────────────────────────── */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#111827', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },

  /* 3 px left strip — color carries status without text */
  cardStrip: {
    width: 3,
    alignSelf: 'stretch',
    flexShrink: 0,
  },

  /* Everything right of the strip */
  cardBody: {
    flex: 1,
    paddingTop: 12,
    paddingRight: 12,
    paddingBottom: 12,
    paddingLeft: 11,
  },

  /* Row 1: vehicle name + chevron */
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  vehicleName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
    lineHeight: 21,
  },

  /* Row 2: plate badge + status pill */
  cardSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  plateBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 1.4,
    fontVariant: ['tabular-nums'] as any,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  /* Row 3: services */
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  serviceText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },

  /* Hairline divider */
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },

  /* Footer */
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  techAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  techInitials: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  techName: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  jobRef: {
    fontSize: 10.5,
    color: '#9CA3AF',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'] as any,
    flexShrink: 0,
  },
  estWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  estTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#C41E3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
