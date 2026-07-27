import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ── Design tokens ── */
const PRIMARY   = '#C41E3A';
const INACTIVE  = '#94A3B8';
const BG        = 'rgba(255,255,255,0.97)';
const BORDER    = 'rgba(226,232,240,0.9)';

const TABS = [
  { name: 'index',     label: 'Home',      icon: 'home'        as const },
  { name: 'jobs',      label: 'Jobs',      icon: 'briefcase'   as const },
  { name: 'bookings',  label: 'Bookings',  icon: 'calendar'    as const },
  { name: 'analytics', label: 'Analytics', icon: 'bar-chart-2' as const },
  { name: 'profile',   label: 'Profile',   icon: 'user'        as const },
];

function TabBar({ state, descriptors, navigation }: any) {
  const insets  = useSafeAreaInsets();
  const isIOS   = Platform.OS === 'ios';

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 10 }]}>
      {isIOS ? (
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: BG }]} />
      )}

      <View style={styles.inner}>
        {state.routes.map((route: any, idx: number) => {
          const { options } = descriptors[route.key];
          if (options.href === null) return null;

          const tabDef  = TABS.find(t => t.name === route.name);
          if (!tabDef) return null;

          const focused = state.index === idx;

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityLabel={tabDef.label}
            >
              {/* Icon with pill highlight when active */}
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <Feather
                  name={tabDef.icon}
                  size={20}
                  color={focused ? PRIMARY : INACTIVE}
                />
              </View>

              <Text style={[styles.label, focused && styles.labelActive]}>
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
      <Tabs.Screen name="services"  options={{ href: null }} />
      <Tabs.Screen name="more"      options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },

  inner: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 6,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
  },

  /* Pill behind the icon — appears only when focused */
  iconPill: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  iconPillActive: {
    backgroundColor: '#FEE2E2',   // soft indigo tint
  },

  label: {
    fontSize: 10,
    fontWeight: '500',
    color: INACTIVE,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
});
