import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CalendarClock, Wrench, BarChart2, MoreHorizontal } from 'lucide-react-native';

/* ── Tokens ── */
const PRIMARY  = '#2563EB';
const INACTIVE = '#94A3B8';
const BORDER   = '#E2E8F0';

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

function TabBar({ state, descriptors, navigation }: any) {
  const insets   = useSafeAreaInsets();
  const pathname = usePathname();

  if (HIDDEN_PATH_PREFIXES.some(p => pathname.includes(p))) return null;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || 8 }]}>
      {state.routes.map((route: any, idx: number) => {
        const { options } = descriptors[route.key];
        if (options.href === null) return null;

        const tabDef = TABS.find(t => t.name === route.name);
        if (!tabDef) return null;

        const focused = state.index === idx;
        const color   = focused ? PRIMARY : INACTIVE;
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
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={tabDef.label}
          >
            <Icon size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            <Text style={[styles.label, { color }]}>{tabDef.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
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
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -1 }, shadowOpacity: 0.04, shadowRadius: 4 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
