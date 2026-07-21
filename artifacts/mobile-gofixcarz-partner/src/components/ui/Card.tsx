import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radius, shadow, spacing } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function Card({ children, style, padding }: Props) {
  const colors = useColors();
  return (
    <View style={[
      styles.card,
      shadow.sm,
      { backgroundColor: colors.surface, borderColor: colors.border },
      padding !== undefined ? { padding } : null,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
  },
});
