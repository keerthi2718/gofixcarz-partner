import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import { ChevronRight, LogOut, HelpCircle, Shield, Info, Lock } from 'lucide-react-native';

/* ─────────────── Tokens ─────────────── */
const BG      = '#FFFFFF';
const TEXT    = '#1A1A1A';
const MUTED   = '#9CA3AF';
const LABEL   = '#6B7280';
const LINE    = '#D1D5DB';
const PRIMARY = '#C41E3A';
const DANGER  = '#DC2626';
const SUCCESS = '#059669';
const SECTION = '#F9FAFB';

/* ─────────────── Helpers ────────────── */
function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
}

/* ─────────────── UnderlineInput ─────── */
function UnderlineInput({
  label, value, onChange, keyboard, capitalize = 'sentences',
  readOnly = false, half = false, prefix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; capitalize?: any; readOnly?: boolean;
  half?: boolean; prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  const lineColor = focused && !readOnly ? PRIMARY : LINE;
  return (
    <View style={[ui.wrap, half && { flex: 1 }]}>
      <View style={[ui.row, { borderBottomColor: lineColor }]}>
        {prefix ? <Text style={ui.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[ui.input, readOnly && ui.readOnly]}
          value={value}
          onChangeText={onChange}
          placeholder={label}
          placeholderTextColor={MUTED}
          keyboardType={keyboard}
          autoCapitalize={capitalize}
          editable={!readOnly}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}
const ui = StyleSheet.create({
  wrap:    { flex: 1, paddingVertical: 6 },
  row:     { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingBottom: 8, paddingTop: 2 },
  prefix:  { fontSize: 15, color: TEXT, marginRight: 6 },
  input:   { flex: 1, fontSize: 15, color: TEXT, padding: 0 },
  readOnly:{ color: MUTED },
});

/* ─────────────── TwoCol ─────────────── */
function TwoCol({ children }: { children: React.ReactNode }) {
  return <View style={tc.row}>{children}</View>;
}
const tc = StyleSheet.create({ row: { flexDirection: 'row', gap: 20, marginBottom: 4 } });

/* ─────────────── SectionHeader ─────── */
function SectionHeader({ title }: { title: string }) {
  return <Text style={sh.text}>{title}</Text>;
}
const sh = StyleSheet.create({ text: { fontSize: 13, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16, marginTop: 28 } });

/* ─────────────── ToggleRow ──────────── */
function ToggleRow({ label, sub, value, onChange, last = false }: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[tg.row, !last && tg.border]}>
      <View style={tg.mid}>
        <Text style={tg.label}>{label}</Text>
        {sub ? <Text style={tg.sub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value} onValueChange={onChange}
        trackColor={{ false: '#E5E7EB', true: PRIMARY + '66' }}
        thumbColor={value ? PRIMARY : '#F3F4F6'}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  );
}
const tg = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  border:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  mid:   { flex: 1, marginRight: 8 },
  label: { fontSize: 15, color: TEXT, fontWeight: '500' },
  sub:   { fontSize: 12, color: MUTED, marginTop: 2 },
});

/* ─────────────── LinkRow ────────────── */
function LinkRow({ label, value, last = false }: { label: string; value?: string; last?: boolean }) {
  return (
    <TouchableOpacity style={[lr.row, !last && lr.border]} activeOpacity={0.75}>
      <Text style={lr.label}>{label}</Text>
      {value ? <Text style={lr.value}>{value}</Text> : <ChevronRight size={16} color={MUTED} strokeWidth={2} />}
    </TouchableOpacity>
  );
}
const lr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  border:{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  label: { flex: 1, fontSize: 15, color: TEXT, fontWeight: '500' },
  value: { fontSize: 14, color: MUTED },
});

/* ════════════════════ Main ══════════════════ */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [notifJobs,  setNotifJobs]  = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const populated = useRef(false);

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

  const profileMut = useMutation({
    mutationFn: ProfileService.update,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }),
  });

  async function save() {
    setSaving(true);
    try {
      await profileMut.mutateAsync({ name: name.trim() || null, email: email.trim() || null });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  }

  const displayName = name || profile?.mobile || 'Partner';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : null;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 10 }]}>
        <Text style={s.headerTitle}>My Account</Text>
        {memberSince && <Text style={s.headerSub}>Partner since {memberSince}</Text>}
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarInitials}>{getInitials(displayName)}</Text>
            </View>
            <Text style={s.avatarName}>{displayName}</Text>
          </View>

          {/* Personal Info */}
          <SectionHeader title="Personal Information" />
          <UnderlineInput label="Full Name*" value={name} onChange={setName} capitalize="words" />
          <View style={s.gap} />
          <UnderlineInput label="Email Address" value={email} onChange={setEmail} keyboard="email-address" capitalize="none" />
          <View style={s.gap} />
          <UnderlineInput label="Mobile Number" value={phone} onChange={() => {}} readOnly prefix="🇮🇳" />

          {/* Notifications */}
          <SectionHeader title="Notifications" />
          <ToggleRow label="Job Alerts" sub="New bookings & status changes" value={notifJobs} onChange={setNotifJobs} />
          <ToggleRow label="Promotions & Updates" sub="GoFixCarz news and offers" value={notifPromo} onChange={setNotifPromo} last />

          {/* Account */}
          <SectionHeader title="Account" />
          <LinkRow label="Change Password" />
          <LinkRow label="Help & Support" />
          <LinkRow label="Privacy Policy" />
          <LinkRow label="App Version" value="1.0.0" last />

          {/* Sign out */}
          <TouchableOpacity style={s.logout} onPress={logout} activeOpacity={0.8}>
            <LogOut size={15} color="#fff" strokeWidth={2.5} />
            <Text style={s.logoutTxt}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      )}

      {/* Footer */}
      {!isLoading && (
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            onPress={save} disabled={saving} activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveTxt}>Save Changes</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: BG, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  headerSub:   { fontSize: 12, color: MUTED, marginTop: 3 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: 20, paddingTop: 10 },
  gap:  { height: 10 },

  /* Avatar */
  avatarWrap:     { alignItems: 'center', paddingTop: 24, paddingBottom: 8 },
  avatarCircle:   { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  avatarName:     { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },

  /* Logout */
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: DANGER, borderRadius: 10, paddingVertical: 14, marginTop: 32, marginBottom: 8,
  },
  logoutTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Footer */
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: BG, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE,
  },
  saveBtn: {
    backgroundColor: PRIMARY, borderRadius: 10, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
