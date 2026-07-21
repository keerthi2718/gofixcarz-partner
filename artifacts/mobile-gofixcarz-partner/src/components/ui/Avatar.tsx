import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { typography } from '@/constants/theme';

interface Props {
  name?: string | null;
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
  color?: string;
}

export default function Avatar({ name, uri, size = 40, style, color }: Props) {
  const colors = useColors();
  const letter = (name ?? '?').trim().charAt(0).toUpperCase();
  const bg = color ?? colors.primaryLight;
  const fg = color ? '#fff' : colors.primary;

  if (uri) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, style]}>
        <Image source={{ uri }} style={{ width: size, height: size }} />
      </View>
    );
  }

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, style]}>
      <Text style={[typography.label, { color: fg, fontSize: size * 0.38 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
});
