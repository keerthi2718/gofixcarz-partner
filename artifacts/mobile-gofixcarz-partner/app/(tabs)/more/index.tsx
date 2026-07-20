import React from 'react';
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import GarageService from '@/src/services/garage.service';
import { useAuth } from '@/src/context/AuthContext';

interface MenuItem {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  route: string;
  badge?: number;
}

function MenuGroup({ title, items }: { title: string; items: MenuItem[] }) {
  const colors = useColors();
  return (
    <View style={menuGroupStyles.section}>
      <Text style={[menuGroupStyles.groupTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[menuGroupStyles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[menuGroupStyles.item, i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={() => router.push(item.route as never)}
            activeOpacity={0.8}
          >
            <View style={[menuGroupStyles.iconWrap, { backgroundColor: (item.iconColor ?? '#1B3A6B') + '18' }]}>
              <Feather name={item.icon} size={18} color={item.iconColor ?? '#1B3A6B'} />
            </View>
            <Text style={[menuGroupStyles.label, { color: colors.foreground }]}>{item.label}</Text>
            {item.badge ? (
              <View style={[menuGroupStyles.badge, { backgroundColor: '#FF6B2B' }]}>
                <Text style={menuGroupStyles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
              </View>
            ) : null}
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const menuGroupStyles = StyleSheet.create({
  section: { marginBottom: 8 },
  groupTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4, marginBottom: 8 },
  card: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 14, fontWeight: '500' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { logout } = useAuth();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data: profile } = useQuery({ queryKey: QUERY_KEYS.PROFILE, queryFn: ProfileService.get });
  const { data: garage } = useQuery({ queryKey: QUERY_KEYS.GARAGE, queryFn: GarageService.get });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>More</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/more/profile')} activeOpacity={0.9}
        >
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {(profile?.name ?? garage?.owner ?? 'G').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.name ?? garage?.owner ?? 'Garage Owner'}</Text>
            <Text style={styles.profileMobile}>{profile?.mobile ?? ''}</Text>
            {garage?.name ? <Text style={styles.garageName}>{garage.name}</Text> : null}
          </View>
          <Feather name="edit-2" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <MenuGroup title="Garage" items={[
          { label: 'Garage Profile', icon: 'home', route: '/(tabs)/more/garage' },
        ]} />
        <MenuGroup title="Account" items={[
          { label: 'My Profile', icon: 'user', route: '/(tabs)/more/profile' },
          { label: 'Notifications', icon: 'bell', iconColor: '#FF6B2B', route: '/(tabs)/more/notifications' },
          { label: 'Revenue & Analytics', icon: 'bar-chart-2', iconColor: '#10B981', route: '/(tabs)/more/analytics' },
        ]} />
        <MenuGroup title="Support" items={[
          { label: 'Help & Support', icon: 'help-circle', route: '/(tabs)/more/garage' },
          { label: 'Privacy Policy', icon: 'shield', route: '/(tabs)/more/garage' },
        ]} />

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
          onPress={logout} activeOpacity={0.8}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>GoFixCarz Partner v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  content: { padding: 16, gap: 16 },
  profileCard: { borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  avatarWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,107,43,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  profileMobile: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  garageName: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  logoutBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  logoutText: { fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 4 },
});
