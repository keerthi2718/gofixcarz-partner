import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@/src/components/ui/FeatherIcon';
import type { ServicePackageResponse } from '@/src/types';

/* ── Design tokens ── */
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';

/* Service category → icon + colour mapping */
const CATEGORY_MAP: Record<string, { icon: React.ComponentProps<typeof Feather>['name']; bg: string; fg: string }> = {
  'oil':       { icon: 'droplet',    bg: '#FFF7ED', fg: '#F97316' },
  'brake':     { icon: 'alert-circle', bg: '#FEF2F2', fg: '#EF4444' },
  'tyre':      { icon: 'circle',     bg: '#F0FDF4', fg: '#10B981' },
  'ac':        { icon: 'wind',       bg: '#EFF6FF', fg: '#3B82F6' },
  'battery':   { icon: 'zap',        bg: '#FFFBEB', fg: '#F59E0B' },
  'wash':      { icon: 'droplet',    bg: '#F0FDFA', fg: '#14B8A6' },
  'wheel':     { icon: 'settings',   bg: '#F5F3FF', fg: '#8B5CF6' },
  'engine':    { icon: 'cpu',        bg: '#FEF2F2', fg: '#EF4444' },
  'body':      { icon: 'shield',     bg: '#EFF6FF', fg: '#3B82F6' },
  default:     { icon: 'tool',       bg: '#EEF2FF', fg: PRIMARY },
};

function getCategory(name: string) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (key !== 'default' && lower.includes(key)) return val;
  }
  return CATEGORY_MAP.default;
}

interface Props {
  pkg: ServicePackageResponse;
  onPress: () => void;
}

export default function ServicePackageCard({ pkg, onPress }: Props) {
  const cat = getCategory(pkg.name);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(37,99,235,0.06)' }}
    >
      {/* Left: icon + info */}
      <View style={[styles.iconWrap, { backgroundColor: cat.bg }]}>
        <Feather name={cat.icon} size={18} color={cat.fg} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{pkg.name}</Text>
        {pkg.description ? (
          <Text style={styles.desc} numberOfLines={1}>{pkg.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          {pkg.duration_minutes ? (
            <View style={styles.metaChip}>
              <Feather name="clock" size={10} color={MUTED} />
              <Text style={styles.metaChipText}>{pkg.duration_minutes} min</Text>
            </View>
          ) : null}
          <View style={[
            styles.statusChip,
            { backgroundColor: pkg.is_active ? '#ECFDF5' : '#F1F5F9' },
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: pkg.is_active ? SUCCESS : '#CBD5E1' },
            ]} />
            <Text style={[
              styles.statusChipText,
              { color: pkg.is_active ? SUCCESS : MUTED },
            ]}>
              {pkg.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {/* Right: price + chevron */}
      <View style={styles.right}>
        <Text style={styles.price}>₹{pkg.price.toLocaleString('en-IN')}</Text>
        <View style={styles.chevronWrap}>
          <Feather name="chevron-right" size={14} color={PRIMARY} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18, borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 12, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },

  iconWrap: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: '700', color: TEXT },
  desc: { fontSize: 12, color: MUTED },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F1F5F9', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  metaChipText: { fontSize: 10, color: MUTED, fontWeight: '500' },

  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  statusDot:      { width: 5, height: 5, borderRadius: 3 },
  statusChipText: { fontSize: 10, fontWeight: '600' },

  right: { alignItems: 'flex-end', gap: 8 },
  price: { fontSize: 16, fontWeight: '800', color: PRIMARY, letterSpacing: -0.3 },
  chevronWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
});
