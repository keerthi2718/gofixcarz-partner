import React, { useCallback, useState } from 'react';
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import GarageService from '@/src/services/garage.service';
import { useLogoStore } from '@/src/store/logo.store';
import { useAuth } from '@/src/context/AuthContext';
import Avatar from '@/src/components/ui/Avatar';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';

/* ── Design tokens ── */
const BG      = '#F8FAFC';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#0F172A';
const MUTED   = '#64748B';
const BORDER  = '#E2E8F0';
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
              <Feather name={item.icon} size={16} color={item.iconFg} />
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
            <Feather name="chevron-right" size={15} color="#CBD5E1" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const groupStyles = StyleSheet.create({
  wrap:       { gap: 6 },
  groupTitle: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 0.6, textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  label:     { fontSize: 13.5, fontWeight: '600', color: TEXT, marginBottom: 1 },
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
  const qc     = useQueryClient();

  const { data: profile } = useQuery({ queryKey: QUERY_KEYS.PROFILE, queryFn: ProfileService.get });
  const { data: garage  } = useQuery({ queryKey: QUERY_KEYS.GARAGE,  queryFn: GarageService.get });

  const name   = profile?.name ?? garage?.owner ?? 'Garage Owner';
  const mobile = profile?.mobile ?? '';

  /* ── Re-fetch profile + garage whenever this screen comes into focus ── */
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    }, [qc]),
  );

  const storedLogoUri = useLogoStore(s => s.logoUri);
  const logoUri = storedLogoUri ?? garage?.logo_url ?? null;

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Page header ── */}
      <View style={[styles.topBar, { paddingTop: (Platform.OS === 'web' ? 14 : 10) + insets.top }]}>
        <Text style={styles.pageTitle}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card (Display Only) ── */}
        <View style={styles.profileCard}>
          <Avatar name={name} uri={logoUri} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{name}</Text>
            {mobile ? <Text style={styles.profileMobile}>{mobile}</Text> : null}
            {garage?.name ? <Text style={styles.garageName}>📍 {garage.name}</Text> : null}
          </View>
        </View>

        {/* ── Workshop & Services ── */}
        <MenuGroup title="Workshop & Services" items={[
          {
            label: 'Service Packages', sub: 'Manage pricing & package catalog',
            icon: 'package', iconBg: '#EFF6FF', iconFg: '#3B82F6',
            route: '/(tabs)/services',
          },
          {
            label: 'Revenue & Reports', sub: 'Earnings, job stats & analytics',
            icon: 'bar-chart-2', iconBg: '#ECFDF5', iconFg: '#10B981',
            route: '/(tabs)/analytics',
          },
        ]} />

        {/* ── Account & Settings ── */}
        <MenuGroup title="Account & Settings" items={[
          {
            label: 'Garage Profile & Hours', sub: 'Address, manager info & working hours',
            icon: 'settings', iconBg: '#F5F3FF', iconFg: '#7C3AED',
            route: '/(tabs)/profile',
          },
          {
            label: 'Notifications', sub: 'Booking & job alerts',
            icon: 'bell', iconBg: '#FFF7ED', iconFg: '#F97316',
            route: '/(tabs)/more/notifications',
          },
        ]} />

        {/* ── Support & Legal ── */}
        <MenuGroup title="Support & Legal" items={[
          {
            label: 'Help & Support', sub: 'FAQs & partner assistance',
            icon: 'help-circle', iconBg: '#FDF4FF', iconFg: '#8B5CF6',
            route: '/(tabs)/more/help',
          },
          {
            label: 'Privacy Policy', sub: 'Terms of service & privacy',
            icon: 'shield', iconBg: '#EFF6FF', iconFg: PRIMARY,
            route: '/(tabs)/more/privacy',
          },
        ]} />

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutModal(true)} activeOpacity={0.8}>
          <View style={styles.logoutIconWrap}>
            <Feather name="log-out" size={15} color={DANGER} />
          </View>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>GoFixCarz Partner v1.0.0</Text>
      </ScrollView>

      {/* ── Sign Out Warning Confirmation Modal ── */}
      <ConfirmDialog
        visible={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  pageTitle: { fontSize: 20, fontWeight: '800', color: TEXT },

  content: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },

  /* Profile card */
  profileCard: {
    backgroundColor: CARD,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  profileName:   { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 1 },
  profileMobile: { fontSize: 12, color: MUTED, marginBottom: 1 },
  garageName:    { fontSize: 11, color: MUTED },

  /* Sign out */
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14, borderWidth: 1, borderColor: '#FECACA',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
    marginTop: 2,
  },
  logoutIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: DANGER },

  version: { textAlign: 'center', fontSize: 11, color: MUTED, marginVertical: 4 },
});
