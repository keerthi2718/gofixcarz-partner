import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarClock, Wrench, BarChart2, MoreHorizontal } from 'lucide-react-native';
import { useAuthStore } from '@/src/store/auth.store';
import LoadingState from '@/src/components/ui/LoadingState';

/* ── Tokens ── */
const PRIMARY   = '#2563EB';
const INACTIVE  = '#64748B';
const BORDER    = '#E2E8F0';
const ACTIVE_BG = '#EFF6FF';

const TABS = [
  { name: 'index',     label: 'Home',      Icon: Home          },
  { name: 'bookings',  label: 'Bookings',  Icon: CalendarClock },
  { name: 'jobs',      label: 'Jobs',      Icon: Wrench        },
  { name: 'analytics', label: 'Analytics', Icon: BarChart2     },
  { name: 'more',      label: 'More',      Icon: MoreHorizontal},
];

const HIDDEN_PATH_PREFIXES = [
  '/jobs/create',
  '/services',
  '/profile',
  '/more/privacy',
  '/more/help',
  '/more/notifications',
];

function shouldHideTabBar(pathname: string): boolean {
  if (HIDDEN_PATH_PREFIXES.some(p => pathname.includes(p))) return true;
  // Hide footer on job details screen (/jobs/[id])
  if (pathname.includes('/jobs/') && !pathname.endsWith('/jobs') && !pathname.endsWith('/jobs/index')) {
    return true;
  }
  return false;
}

function getActiveTabName(pathname: string, stateRouteName?: string): string {
  const p = (pathname || '').toLowerCase();

  if (p === '/' || p === '/index' || p.endsWith('/(tabs)') || p.endsWith('/(tabs)/index')) {
    return 'index';
  }
  if (p.includes('/bookings')) {
    return 'bookings';
  }
  if (p.includes('/jobs')) {
    return 'jobs';
  }
  if (p.includes('/analytics')) {
    return 'analytics';
  }
  if (p.includes('/more')) {
    return 'more';
  }

  if (stateRouteName && TABS.some(t => t.name === stateRouteName)) {
    return stateRouteName;
  }

  return 'index';
}

function TabBar({ state, descriptors, navigation }: any) {
  const insets   = useSafeAreaInsets();
  const pathname = usePathname();

  const currentRouteName = state.routes[state.index]?.name;
  const activeTabName = getActiveTabName(pathname, currentRouteName);

  // Filter visible tabs (excluding href === null)
  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    return options.href !== null && TABS.some(t => t.name === route.name);
  });

  const activeIndex = Math.max(0, visibleRoutes.findIndex((r: any) => r.name === activeTabName));
  const tabCount = visibleRoutes.length || 5;

  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const tabWidth = barWidth > 0 ? barWidth / tabCount : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      const targetPos = activeIndex * tabWidth;
      translateX.stopAnimation();
      Animated.spring(translateX, {
        toValue: targetPos,
        useNativeDriver: true,
        stiffness: 350,
        damping: 30,
        mass: 0.5,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      }).start();
    }
  }, [activeIndex, tabWidth]);

  if (shouldHideTabBar(pathname)) return null;

  return (
    <View
      style={[styles.bar, { paddingBottom: insets.bottom || 8 }]}
      onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {/* ── Animated Sliding Active Pill Indicator ── */}
      {tabWidth > 0 && (
        <Animated.View
          style={[
            styles.activePill,
            {
              width: tabWidth - 12,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {visibleRoutes.map((route: any) => {
        const focused = route.name === activeTabName;
        const tabDef = TABS.find(t => t.name === route.name)!;
        const color = focused ? PRIMARY : INACTIVE;
        const { Icon } = tabDef;

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
              if (!event.defaultPrevented) {
                if (route.name === 'index') {
                  navigation.navigate('index');
                } else {
                  navigation.navigate(route.name, { screen: 'index' });
                }
              }
            }}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tabDef.label}
          >
            <Icon size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            <Text style={[styles.label, { color, fontWeight: focused ? '700' : '500' }]}>
              {tabDef.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingState message="Verifying session..." />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={props => <TabBar {...props} />}
    >
      <Tabs.Screen name="index"     />
      <Tabs.Screen name="bookings"  />
      <Tabs.Screen name="jobs"      />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="more"      />
      <Tabs.Screen name="profile"   options={{ href: null }} />
      <Tabs.Screen name="services"  options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: 'row',
    paddingTop: 8,
    position: 'relative',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  activePill: {
    position: 'absolute',
    top: 5,
    left: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: ACTIVE_BG,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 2,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
