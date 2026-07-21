import React, { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

export default function WelcomeScreen() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(auth)/login'), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <TouchableOpacity
      style={styles.root}
      activeOpacity={1}
      onPress={() => router.replace('/(auth)/login')}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.logoWrap}>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.appName}>GoFixAuto</Text>
      <Text style={styles.tagline}>GARAGE OWNER PORTAL</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logoWrap: {
    width: 140,
    height: 140,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  logo: { width: '100%', height: '100%' },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
