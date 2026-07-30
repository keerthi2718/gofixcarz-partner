import React, { useEffect, useState } from 'react';
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import { STORAGE_KEYS } from '@/src/constants/storage';
import StorageService from '@/src/services/storage.service';
import ProfileService from '@/src/services/profile.service';
import GarageService from '@/src/services/garage.service';
import { useAuth } from '@/src/context/AuthContext';
import Avatar from '@/src/components/ui/Avatar';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const DANGER  = '#EF4444';

interface MenuItem {
  label: string;
  sub: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBg: string;
  iconFg: string;
  route?: string;
  badge?: number;
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  return (
    <View style={groupStyles.wrap}>
      <Text style={groupStyles.groupTitle}>{title}</Text>
      <View style={groupStyles.card}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[
              groupStyles.row,
              i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
            ]}
            onPress={() => item.route && router.push(item.route as never)}
            activeOpacity={0.75}
          >
            <View style={[groupStyles.iconWrap, { backgroundColor: item.iconBg }]}>
              <Feather name={item.icon} size={17} color={item.iconFg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={groupStyles.label}>{item.label}</Text>
              <Text style={groupStyles.sub}>{item.sub}</Text>
            </View>
            {item.badge ? (
              <View style={groupStyles.badge}>
                <Text style={groupStyles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
              </View>
            ) : null}
            <Feather name="chevron-right" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const groupStyles = StyleSheet.create({
  wrap:       { gap: 10 },
  groupTitle: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 0.8, textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14, gap: 14,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  label:     { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  sub:       { fontSize: 11, color: MUTED },
  badge: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, marginRight: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: profile } = useQuery({ queryKey: QUERY_KEYS.PROFILE, queryFn: ProfileService.get });
  const { data: garage  } = useQuery({ queryKey: QUERY_KEYS.GARAGE,  queryFn: GarageService.get });

  const name   = profile?.name ?? garage?.owner ?? 'Garage Owner';
  const mobile = profile?.mobile ?? '';

  /* ── Logo: prefer server URL, fall back to local AsyncStorage cache ── */
  const [logoUri, setLogoUri] = useState<string | null>(null);
  useEffect(() => {
    if (garage?.logo_url) {
      setLogoUri(garage.logo_url);
    } else {
      StorageService.get(STORAGE_KEYS.GARAGE_LOGO).then((cached: string | null) => {
        if (cached) setLogoUri(cached);
      });
    }
  }, [garage]);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Page header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <Text style={styles.pageTitle}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ── */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => router.push('/(tabs)/profile' as never)}
          activeOpacity={0.88}
        >
          <Avatar name={name} uri={logoUri} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{name}</Text>
            {mobile ? <Text style={styles.profileMobile}>{mobile}</Text> : null}
            {garage?.name ? <Text style={styles.garageName}>📍 {garage.name}</Text> : null}
          </View>
          <View style={styles.profileChevron}>
            <Feather name="chevron-right" size={16} color={PRIMARY} />
          </View>
        </TouchableOpacity>

        {/* ── Account ── */}
        <MenuGroup title="Account" items={[
          {
            label: 'Notifications', sub: 'Booking & job alerts',
            icon: 'bell', iconBg: '#FFF7ED', iconFg: '#F97316',
            route: '/(tabs)/more/notifications',
          },
          {
            label: 'Revenue & Analytics', sub: 'Performance reports',
            icon: 'bar-chart-2', iconBg: '#F0FDF4', iconFg: '#10B981',
            route: '/(tabs)/more/analytics',
          },
        ]} />

        {/* ── Support ── */}
        <MenuGroup title="Support" items={[
          {
            label: 'Help & Support', sub: 'FAQs & contact us',
            icon: 'help-circle', iconBg: '#FDF4FF', iconFg: '#8B5CF6',
          },
          {
            label: 'Privacy Policy', sub: 'Terms & conditions',
            icon: 'shield', iconBg: '#F1F5F9', iconFg: MUTED,
          },
        ]} />

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <View style={styles.logoutIconWrap}>
            <Feather name="log-out" size={16} color={DANGER} />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GoFixCarz Partner v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    paddingHorizontal: 20, paddingBottom: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },

  content: { paddingHorizontal: 20, gap: 16 },

  /* Profile card */
  profileCard: {
    backgroundColor: CARD,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center',
    padding: 18, gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  profileName:   { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 3 },
  profileMobile: { fontSize: 12, color: MUTED, marginBottom: 2 },
  garageName:    { fontSize: 11, color: MUTED },
  profileChevron: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Sign out */
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 18, borderWidth: 1, borderColor: '#FECACA',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16, gap: 14,
  },
  logoutIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: DANGER },

  version: { textAlign: 'center', fontSize: 11, color: MUTED, marginTop: 4 },
});
