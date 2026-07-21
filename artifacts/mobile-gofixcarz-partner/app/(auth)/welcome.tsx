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
      <Image
        source={require('../../assets/images/logo.jpg')}
        style={styles.logo}
        resizeMode="contain"
      />
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
  logo: {
    width: 280,
    height: 200,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
