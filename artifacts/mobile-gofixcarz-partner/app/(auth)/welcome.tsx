import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '@/constants/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const logoAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(textAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => router.replace('/(auth)/login'), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <TouchableOpacity
      style={[styles.root, { paddingBottom: insets.bottom + 32 }]}
      activeOpacity={1}
      onPress={() => router.replace('/(auth)/login')}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <Animated.View style={{ opacity: logoAnim, transform: [{ scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }}>
        <Image
          source={require('../../assets/images/logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={{ opacity: textAnim, alignItems: 'center', gap: 8 }}>
        <Text style={styles.tagline}>GARAGE OWNER PORTAL</Text>
        <View style={styles.dot} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  logo: { width: 280, height: 200 },
  tagline: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#C62839', marginTop: 4,
  },
});
