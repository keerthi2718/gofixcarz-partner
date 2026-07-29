import React, { useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import { Filter, Plus, Wrench, Clock, User } from 'lucide-react-native';

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

/* ─────────────── Component ─────────────── */
export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const [activeStage, setActiveStage] = useState('In Progress');
  const [activeTech, setActiveTech] = useState('All Techs');

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
  const filteredJobs = allItems.filter(j => activeStatuses.includes(j.status));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: 40 + insets.top }]}>
        <Text style={styles.headerTitle}>Workshop</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerSub}>Today, {allItems.length} jobs</Text>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <Filter size={16} color="#64748B" strokeWidth={2} />
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
        {/* ── Pipeline strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.stageScroll}
          contentContainerStyle={styles.stageRow}
        >
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
              const jobRef = item.job_number ?? `JC-${item.id.substring(0, 4).toUpperCase()}`;
              // Format plate with spaces for readability
              const plate = item.registration_number
                ? item.registration_number.toUpperCase().replace(/([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})/, '$1 $2 $3 $4')
                : null;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.78}
                  style={styles.card}
                  onPress={() => router.push(`/(tabs)/jobs/${item.id}` as any)}
                >
                  {/* Top strip: status property (plain text, no chip) + job ref */}
                  <View style={styles.cardTop}>
                    <View style={styles.statusInline}>
                      <View style={[styles.statusDot, { backgroundColor: st.dot }]} />
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Text style={styles.jobRef}>{jobRef}</Text>
                  </View>

                  {/* Vehicle — dominant headline, largest element */}
                  <Text style={styles.vehicleName} numberOfLines={1}>
                    {vehicleLine || 'Vehicle'}
                  </Text>

                  {/* Plate — styled like an actual plate number */}
                  {!!plate && (
                    <Text style={styles.plateBadge}>{plate}</Text>
                  )}

                  {/* Services — inline, muted, dot-separated */}
                  {!!serviceNames && (
                    <Text style={styles.serviceText} numberOfLines={1}>{serviceNames}</Text>
                  )}

                  {/* Footer — meta strip: tech + time, minimal */}
                  <View style={styles.cardFooter}>
                    <View style={styles.cardTechRow}>
                      <View style={styles.techAvatar}>
                        <Text style={styles.techInitials}>{getInitials(techName)}</Text>
                      </View>
                      <Text style={styles.techName} numberOfLines={1}>{techName}</Text>
                    </View>
                    <View style={styles.estWrap}>
                      <Clock size={10} color="#94A3B8" strokeWidth={2} />
                      <Text style={styles.estTime}>2h</Text>
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
  filterBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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

  /* ── Job card ─────────────────────────────────────────────
     Designed to be scanned in 0.5 seconds.
     Eye lands on: vehicle → plate → service → tech
     Status is a property, not a badge. No chips, no accent bars.
  ────────────────────────────────────────────────────────── */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingTop: 13,
    paddingHorizontal: 15,
    paddingBottom: 13,
    borderWidth: 1,
    borderColor: '#EAECF0',
    ...Platform.select({
      ios:     { shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },

  /* Status + job ref — both tertiary, never compete with content */
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  statusInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  jobRef: {
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'] as any,
  },

  /* Vehicle — the loudest element on the card */
  vehicleName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.4,
    lineHeight: 22,
  },

  /* Plate — spaced like a physical plate, distinct from other text */
  plateBadge: {
    fontSize: 12,
    color: '#6B7280',
    letterSpacing: 1.8,
    marginTop: 4,
    fontVariant: ['tabular-nums'] as any,
  },

  /* Services — compact, one line, separator dot from the data */
  serviceText: {
    fontSize: 12.5,
    color: '#4B5563',
    marginTop: 7,
    lineHeight: 17,
  },

  /* Footer — the quietest row. Not a feature, a footnote. */
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  cardTechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  techAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  techInitials: {
    fontSize: 8,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  techName: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
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
