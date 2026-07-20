import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

const isIOS = Platform.OS === 'ios';
const isWeb = Platform.OS === 'web';

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 0,
          elevation: 0,
          height: isWeb ? 84 : 60,
          paddingBottom: isWeb ? 34 : 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={95}
              tint={isDark ? 'dark' : 'light'}
              style={[
                StyleSheet.absoluteFill,
                { borderTopWidth: 0.5, borderTopColor: colors.border },
              ]}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            />
          ) : null,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="house.fill" tintColor={color} size={22} />
              : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="calendar" tintColor={color} size={22} />
              : <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="wrench.and.screwdriver" tintColor={color} size={22} />
              : <Feather name="tool" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="tag" tintColor={color} size={22} />
              : <Feather name="package" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) =>
            isIOS
              ? <SymbolView name="ellipsis.circle" tintColor={color} size={22} />
              : <Feather name="more-horizontal" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
