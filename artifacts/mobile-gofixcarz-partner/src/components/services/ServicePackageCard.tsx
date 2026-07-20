import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { ServicePackageResponse } from '@/src/types';

interface ServicePackageCardProps {
  pkg: ServicePackageResponse;
  onPress: () => void;
}

export default function ServicePackageCard({ pkg, onPress }: ServicePackageCardProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
          <Feather name="tool" size={16} color={colors.accent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{pkg.name}</Text>
          {pkg.description ? (
            <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={1}>{pkg.description}</Text>
          ) : null}
          {pkg.duration_minutes ? (
            <Text style={[styles.duration, { color: colors.mutedForeground }]}>
              {pkg.duration_minutes} min
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.price, { color: colors.primary }]}>
          ₹{pkg.price.toLocaleString('en-IN')}
        </Text>
        <View style={[styles.activeBadge, { backgroundColor: pkg.is_active ? colors.successLight : colors.muted }]}>
          <Text style={[styles.activeText, { color: pkg.is_active ? colors.success : colors.mutedForeground }]}>
            {pkg.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 10,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
    gap: 12,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' as const },
  desc: { fontSize: 12, marginTop: 2 },
  duration: { fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 16, fontWeight: '700' as const },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeText: { fontSize: 11, fontWeight: '600' as const },
});
