import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { shadow, typography } from '@/constants/theme';

const TABS = [
  { name: 'index',     label: 'Home',      icon: 'home' as const },
  { name: 'jobs',      label: 'Jobs',      icon: 'briefcase' as const },
  { name: 'bookings',  label: 'Bookings',  icon: 'calendar' as const },
  { name: 'analytics', label: 'Analytics', icon: 'trending-up' as const },
  { name: 'profile',   label: 'Profile',   icon: 'user' as const },
];

function TabBar({ state, descriptors, navigation }: any) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  const Container = isIOS ? BlurView : View;
  const containerProps = isIOS
    ? { intensity: 90, tint: 'light' as const }
    : {};

  return (
    <View style={[styles.wrapper, shadow.lg, { paddingBottom: insets.bottom || 8 }]}>
      <Container {...containerProps} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
      <View style={styles.inner}>
        {state.routes.map((route: any, idx: number) => {
          const { options } = descriptors[route.key];
          if (options.href === null) return null;

          const tabDef = TABS.find(t => t.name === route.name);
          if (!tabDef) return null;

          const focused = state.index === idx;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityLabel={tabDef.label}
            >
              <View style={[styles.iconWrap, focused && { backgroundColor: colors.primary }]}>
                <Feather
                  name={tabDef.icon}
                  size={20}
                  color={focused ? '#fff' : colors.textSecondary}
                />
              </View>
              <Text style={[
                typography.labelSm,
                { color: focused ? colors.primary : colors.textSecondary, marginTop: 3 },
              ]}>
                {tabDef.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="jobs" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1, borderColor: 'rgba(229,231,235,0.8)',
  },
  inner: {
    flexDirection: 'row', paddingTop: 10, paddingHorizontal: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 4 },
  iconWrap: {
    width: 40, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
});
