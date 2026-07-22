import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/auth.store';
import LoadingState from '@/src/components/ui/LoadingState';

const SPLASH_MS = 2400;

function RedSpinner() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={spinner.track}>
      <Animated.View style={[spinner.arc, { transform: [{ rotate }] }]} />
    </View>
  );
}

const spinner = StyleSheet.create({
  track: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2.5, borderColor: 'rgba(198,40,57,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  arc: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2.5, borderColor: 'transparent',
    borderTopColor: '#C62839',
  },
});

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);
  const insets  = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    const t = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!splashDone) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Logo + text — vertically centred, slightly above middle */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Image
            source={require('../assets/images/logo_clean.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Garage Owner Portal</Text>
          <Text style={styles.subtitle}>SMART GARAGE MANAGEMENT</Text>
        </Animated.View>

        {/* Red spinner pinned to bottom */}
        <Animated.View style={[styles.spinnerWrap, { opacity: fadeAnim }]}>
          <RedSpinner />
        </Animated.View>
      </View>
    );
  }

  if (isLoading) return <LoadingState message="Loading..." />;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    alignItems: 'center',
  },

  logo: {
    width: 130,
    height: 130,
    marginBottom: 32,
  },

  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 15,
    color: '#8A8F98',
    letterSpacing: 3,
    textAlign: 'center',
  },

  spinnerWrap: {
    position: 'absolute',
    bottom: 72,
    alignSelf: 'center',
  },
});
