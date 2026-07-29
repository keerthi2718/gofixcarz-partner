import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import {
  Camera, Mail, Phone, User, Bell, HelpCircle, Shield,
  LogOut, ChevronRight, Star, Info, Lock, BellOff,
} from 'lucide-react-native';

/* ─────────────────────── Tokens ───────────────────────── */
const BG      = '#F2F4F7';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#0D1117';
const MUTED   = '#6B7280';
const BORDER  = '#E5E7EB';
const DANGER  = '#DC2626';
const SUCCESS = '#059669';

/* ─────────────────────── Helpers ──────────────────────── */
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

const AVATAR_COLORS = ['#C41E3A', '#7C3AED', '#0284C7', '#059669', '#D97706', '#DB2777'];
function avatarColor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

/* ─────────────────────── SectionCard ──────────────────── */
function SectionCard({ title, Icon, iconBg, iconColor = PRIMARY, children }: {
  title: string; Icon: any; iconBg: string; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={[sc.iconCircle, { backgroundColor: iconBg }]}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
});

/* ─────────────────────── FieldRow ─────────────────────── */
function FieldRow({
  Icon, iconBg = '#F3F4F6', iconColor = MUTED,
  label, value, onChange, placeholder, keyboard, capitalize = 'sentences',
  readOnly = false, last = false,
}: {
  Icon: any; iconBg?: string; iconColor?: string; label: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
  keyboard?: any; capitalize?: any; readOnly?: boolean; last?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fr.wrap, !last && fr.divider]}>
      <View style={[fr.iconSlot, { backgroundColor: focused && !readOnly ? '#FEF2F2' : iconBg }]}>
        <Icon size={15} color={focused && !readOnly ? PRIMARY : iconColor} strokeWidth={2} />
      </View>
      <View style={fr.mid}>
        <Text style={fr.label}>{label}</Text>
        <TextInput
          style={[fr.input, readOnly && { color: MUTED }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboard}
          autoCapitalize={capitalize}
          editable={!readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {focused && !readOnly && <View style={fr.focusBar} />}
      </View>
      {readOnly && <Lock size={13} color="#D1D5DB" strokeWidth={2} />}
    </View>
  );
}
const fr = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  iconSlot: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mid: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  input: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT, padding: 0 },
  focusBar: { height: 1.5, backgroundColor: PRIMARY, marginTop: 4, borderRadius: 1 },
});

/* ─────────────────────── ToggleRow ────────────────────── */
function ToggleRow({ Icon, iconBg, iconColor, label, sub, value, onChange, last = false }: {
  Icon: any; iconBg: string; iconColor: string; label: string; sub?: string;
  value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[tr.wrap, !last && tr.divider]}>
      <View style={[tr.iconSlot, { backgroundColor: iconBg }]}>
        <Icon size={15} color={iconColor} strokeWidth={2} />
      </View>
      <View style={tr.mid}>
        <Text style={tr.label}>{label}</Text>
        {sub ? <Text style={tr.sub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: PRIMARY + '66' }}
        thumbColor={value ? PRIMARY : '#F3F4F6'}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );
}
const tr = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  iconSlot: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mid: { flex: 1 },
  label: { fontSize: 15, fontWeight: '500', color: TEXT },
  sub: { fontSize: 12, color: MUTED, marginTop: 1 },
});

/* ─────────────────────── LinkRow ──────────────────────── */
function LinkRow({ Icon, iconBg, iconColor, label, value, last = false }: {
  Icon: any; iconBg: string; iconColor: string; label: string; value?: string; last?: boolean;
}) {
  return (
    <TouchableOpacity style={[lr.wrap, !last && lr.divider]} activeOpacity={0.75}>
      <View style={[lr.iconSlot, { backgroundColor: iconBg }]}>
        <Icon size={15} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={lr.label}>{label}</Text>
      {value ? <Text style={lr.value}>{value}</Text> : <ChevronRight size={16} color="#D1D5DB" strokeWidth={2} />}
    </TouchableOpacity>
  );
}
const lr = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  iconSlot: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  label: { flex: 1, fontSize: 15, fontWeight: '500', color: TEXT },
  value: { fontSize: 13, color: MUTED, fontWeight: '500' },
});

/* ════════════════════ Main Screen ═════════════════════════ */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  /* ── State ── */
  const [photoUri,   setPhotoUri]   = useState<string | null>(null);
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [notifJobs,  setNotifJobs]  = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const populated = useRef(false);

  /* ── Query ── */
  const { data: profile, isLoading } = useQuery({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: ProfileService.get,
  });

  useEffect(() => {
    if (populated.current || !profile) return;
    setName(profile.name ?? '');
    setEmail(profile.email ?? '');
    setPhone(profile.mobile ?? '');
    populated.current = true;
  }, [profile]);

  /* ── Mutation ── */
  const profileMut = useMutation({
    mutationFn: ProfileService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }),
  });

  /* ── Photo picker ── */
  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  /* ── Save ── */
  async function save() {
    setSaving(true);
    try {
      await profileMut.mutateAsync({ name: name.trim() || null, email: email.trim() || null });
      Alert.alert('Saved ✓', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  }

  /* ── Derived ── */
  const displayName = name || profile?.mobile || 'Partner';
  const initials    = getInitials(displayName);
  const bgColor     = avatarColor(displayName);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  /* ═══════════════════════════════════════════════════════ */
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD} />

      {/* ── Top bar ── */}
      <View style={[s.topBar, { paddingTop: topPad + 10 }]}>
        <Text style={s.topBarTitle}>My Account</Text>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={s.loadingText}>Loading…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 90 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Personal hero ── */}
          <View style={s.hero}>
            {/* Avatar */}
            <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto} activeOpacity={0.85}>
              {photoUri
                ? <Image source={{ uri: photoUri }} style={s.avatarImg} />
                : (
                  <View style={[s.avatarCircle, { backgroundColor: bgColor }]}>
                    <Text style={s.avatarInitials}>{initials}</Text>
                  </View>
                )
              }
              <View style={s.cameraBadge}>
                <Camera size={11} color="#fff" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            {/* Name + meta */}
            <View style={s.heroMeta}>
              <Text style={s.heroName}>{displayName}</Text>
              {email ? <Text style={s.heroEmail}>{email}</Text> : null}
              <View style={s.heroPhoneRow}>
                <Phone size={10} color={MUTED} strokeWidth={2} />
                <Text style={s.heroPhone}>+91 {phone}</Text>
              </View>
              {memberSince && (
                <View style={s.memberBadge}>
                  <Star size={9} color={PRIMARY} strokeWidth={2} />
                  <Text style={s.memberText}>Partner since {memberSince}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Personal Info ── */}
          <SectionCard title="Personal Info" Icon={User} iconBg="#FEE2E2" iconColor={PRIMARY}>
            <FieldRow Icon={User} iconBg="#FEE2E2" iconColor={PRIMARY}
              label="Full Name" value={name} onChange={setName}
              placeholder="Your full name" capitalize="words" />
            <FieldRow Icon={Mail} iconBg="#F0FDF4" iconColor={SUCCESS}
              label="Email Address" value={email} onChange={setEmail}
              placeholder="you@example.com" keyboard="email-address" capitalize="none" />
            <FieldRow Icon={Phone} iconBg="#F3F4F6" iconColor={MUTED}
              label="Mobile Number" value={`+91 ${phone}`} onChange={() => {}}
              readOnly last />
          </SectionCard>

          {/* ── Notification Preferences ── */}
          <SectionCard title="Notifications" Icon={Bell} iconBg="#FFFBEB" iconColor="#D97706">
            <ToggleRow
              Icon={Bell} iconBg="#FFFBEB" iconColor="#D97706"
              label="Job Alerts"
              sub="New bookings, status changes"
              value={notifJobs}
              onChange={setNotifJobs}
            />
            <ToggleRow
              Icon={BellOff} iconBg="#F3F4F6" iconColor={MUTED}
              label="Promotions & Updates"
              sub="GoFixCarz news and offers"
              value={notifPromo}
              onChange={setNotifPromo}
              last
            />
          </SectionCard>

          {/* ── Account & Support ── */}
          <SectionCard title="Account" Icon={Shield} iconBg="#EDE9FE" iconColor="#7C3AED">
            <LinkRow Icon={Lock}       iconBg="#EDE9FE" iconColor="#7C3AED" label="Change Password" />
            <LinkRow Icon={HelpCircle} iconBg="#F0FDF4" iconColor={SUCCESS}  label="Help & Support" />
            <LinkRow Icon={Shield}     iconBg="#F3F4F6" iconColor={MUTED}    label="Privacy Policy" />
            <LinkRow Icon={Info}       iconBg="#F3F4F6" iconColor={MUTED}    label="App Version" value="1.0.0" last />
          </SectionCard>

          {/* ── Sign out ── */}
          <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <View style={s.logoutIcon}>
              <LogOut size={16} color={DANGER} strokeWidth={2} />
            </View>
            <Text style={s.logoutText}>Sign Out</Text>
            <ChevronRight size={15} color={DANGER + '66'} strokeWidth={2} />
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* ── Footer ── */}
      {!isLoading && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            onPress={save} disabled={saving} activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────── Styles ───────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topBar: {
    backgroundColor: CARD, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  topBarTitle: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: MUTED, fontWeight: '500' },

  body: { paddingHorizontal: 16, paddingTop: 20 },

  /* Hero */
  hero: {
    backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 20, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  avatarWrap:     { position: 'relative', flexShrink: 0 },
  avatarImg:      { width: 72, height: 72, borderRadius: 20 },
  avatarCircle:   { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  cameraBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PRIMARY, borderWidth: 2, borderColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  heroMeta:     { flex: 1, gap: 3 },
  heroName:     { fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.3 },
  heroEmail:    { fontSize: 13, color: MUTED },
  heroPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroPhone:    { fontSize: 12, color: MUTED },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 2,
    backgroundColor: '#FEF2F2', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  memberText: { fontSize: 10.5, color: PRIMARY, fontWeight: '600' },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
  },
  logoutIcon: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '600', color: DANGER },

  /* Footer */
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: CARD, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 14, height: 54,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
