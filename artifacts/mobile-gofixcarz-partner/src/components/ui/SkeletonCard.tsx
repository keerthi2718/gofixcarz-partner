import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface SkeletonCardProps {
  height?: number;
  lines?: number;
}

function SkeletonLine({ width, style }: { width: string | number; style?: object }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        { width, height: 12, borderRadius: 6, backgroundColor: colors.border, opacity: anim },
        style,
      ]}
    />
  );
}

export default function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
      <SkeletonLine width="60%" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? '90%' : '75%'} style={{ marginTop: 10 }} />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
});
