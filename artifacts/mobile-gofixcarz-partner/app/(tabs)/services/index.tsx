import React, { useState } from 'react';
import {
  FlatList, Platform, RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import ServicePackageCard from '@/src/components/services/ServicePackageCard';
import SearchBar from '@/src/components/ui/SearchBar';
import { SkeletonList } from '@/src/components/ui/SkeletonCard';
import EmptyState from '@/src/components/ui/EmptyState';
import ErrorState from '@/src/components/ui/ErrorState';

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGES({ search: search || undefined, active_only: activeOnly || undefined }),
    queryFn: () => ServicePackageService.list({ search: search || undefined, active_only: activeOnly || undefined, page_size: 50 }),
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Services</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/(tabs)/services/create')} activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.createBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search service packages..." />
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: activeOnly ? colors.success : colors.secondary }]}
          onPress={() => setActiveOnly(v => !v)} activeOpacity={0.8}
        >
          <View style={[styles.toggleDot, { backgroundColor: activeOnly ? '#fff' : colors.mutedForeground }]} />
          <Text style={[styles.toggleText, { color: activeOnly ? '#fff' : colors.mutedForeground }]}>
            {activeOnly ? 'Active Only' : 'All Packages'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.list}><SkeletonList count={5} /></ScrollView>
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ServicePackageCard pkg={item} onPress={() => router.push(`/(tabs)/services/${item.id}`)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="package" title="No Service Packages" description="Add service packages to attach them to job cards." actionLabel="Add Package" onAction={() => router.push('/(tabs)/services/create')} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 16 },
});
