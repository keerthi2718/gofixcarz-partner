import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, RefreshControl,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Package, Clock, Edit2, Trash2 } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import { formatCurrency } from '@/src/utils/helpers';

/* ── Design tokens ── */
const BG      = '#F8FAFC';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
const DANGER  = '#EF4444';
const SUCCESS = '#10B981';
const SOFT_BG = '#EFF6FF';

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGES({}),
    queryFn:  () => ServicePackageService.list({ page_size: 50 }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => ServicePackageService.delete(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGES({}) });
      setDeleteItem(null);
    },
  });

  const items = data?.items ?? [];

  function durationLabel(mins: number | null | undefined) {
    if (!mins) return null;
    if (mins < 60) return `${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hr${h > 1 ? 's' : ''}`;
  }

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/(tabs)/more' as never)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Service Packages</Text>
          <Text style={styles.headerSub}>Added Service Catalog</Text>
        </View>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
      >
        {/* Catalog Subheading */}
        <View style={styles.summaryRow}>
          <Text style={styles.sectionHeading}>Catalog ({items.length})</Text>
          <Text style={styles.summarySub}>Active workshop repair packages</Text>
        </View>

        {/* ── Compact Service Cards List ── */}
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={PRIMARY} />
            <Text style={styles.loadingText}>Loading service catalog…</Text>
          </View>
        ) : items.length > 0 ? (
          <View style={styles.cardsWrap}>
            {items.map((item) => {
              const dur = durationLabel(item.duration_minutes);
              return (
                <View key={item.id} style={styles.serviceCard}>
                  {/* Icon Badge */}
                  <View style={styles.packageIconWrap}>
                    <Package size={18} color={PRIMARY} strokeWidth={2.2} />
                  </View>

                  {/* Body Info */}
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>

                      {/* Right Action Icons (Edit & Delete) */}
                      <View style={styles.actionIconGroup}>
                        <TouchableOpacity
                          style={styles.iconBtnEdit}
                          onPress={() => router.push(`/(tabs)/services/${item.id}` as any)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Edit2 size={13} color={PRIMARY} strokeWidth={2.2} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.iconBtnDelete}
                          onPress={() => setDeleteItem({ id: item.id, name: item.name })}
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Trash2 size={13} color={DANGER} strokeWidth={2.2} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {item.description ? (
                      <Text style={styles.serviceDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}

                    {/* Price & Duration Row */}
                    <View style={styles.pillsRow}>
                      <Text style={styles.priceTxt}>{formatCurrency(item.price)}</Text>

                      {dur ? (
                        <View style={styles.durPill}>
                          <Clock size={10} color={MUTED} strokeWidth={2} />
                          <Text style={styles.durTxt}>{dur}</Text>
                        </View>
                      ) : null}

                      <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#ECFDF5' : '#F1F5F9' }]}>
                        <Text style={[styles.statusTxt, { color: item.is_active ? SUCCESS : MUTED }]}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Package size={28} color={PRIMARY} strokeWidth={2} />
            </View>
            <Text style={styles.emptyTitle}>No Service Packages Added</Text>
            <Text style={styles.emptyDesc}>Create custom repair packages to quickly attach services to your job cards.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Delete Confirmation Warning Modal ── */}
      <ConfirmDialog
        visible={!!deleteItem}
        title="Delete Service Package"
        message={deleteItem ? `Are you sure you want to delete "${deleteItem.name}"? This package will be removed from your catalog.` : ''}
        confirmLabel={deleteMut.isPending ? 'Deleting...' : 'Delete Package'}
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (deleteItem) deleteMut.mutate(deleteItem.id);
        }}
        onCancel={() => setDeleteItem(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: TEXT, textAlign: 'center' },
  headerSub:   { fontSize: 11, color: MUTED, marginTop: 1, textAlign: 'center' },

  content: { paddingHorizontal: 16, paddingTop: 14, gap: 12 },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  summarySub: { fontSize: 11, color: MUTED },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: { fontSize: 13, color: MUTED },

  cardsWrap: { gap: 10 },

  /* Compact Service Card */
  serviceCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  packageIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: SOFT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceName: { fontSize: 14, fontWeight: '700', color: TEXT, flex: 1 },

  actionIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtnEdit: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: SOFT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDelete: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceDesc: { fontSize: 11.5, color: MUTED, marginTop: 2 },

  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  priceTxt: { fontSize: 13, fontWeight: '800', color: PRIMARY },

  durPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durTxt: { fontSize: 10.5, fontWeight: '600', color: MUTED },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  statusTxt: { fontSize: 10, fontWeight: '700' },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: SOFT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  emptyDesc:  { fontSize: 11.5, color: MUTED, textAlign: 'center', lineHeight: 16 },
});
