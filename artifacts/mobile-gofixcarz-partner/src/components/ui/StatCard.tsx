import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface StatCardProps {
  label: string;
  value: string | number;
  iconBg?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ label, value, icon, iconBg, trend, trendUp }: StatCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg ?? colors.accentLight }]}>
        {icon}
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {trend ? (
        <Text style={[styles.trend, { color: trendUp ? colors.success : colors.destructive }]}>
          {trendUp ? '↑' : '↓'} {trend}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    gap: 4,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: { fontSize: 22, fontWeight: '700' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
  trend: { fontSize: 11, fontWeight: '600' as const, marginTop: 2 },
});
