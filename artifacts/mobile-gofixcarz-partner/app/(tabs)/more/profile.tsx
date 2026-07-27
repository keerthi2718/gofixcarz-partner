import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

/* ── Design tokens ── */
const BG       = '#EEEEF6';
const CARD     = '#FFFFFF';
const PRIMARY  = '#C41E3A';
const INDIGO   = '#921527';
const TEXT     = '#1E293B';
const MUTED    = '#64748B';
const LABEL    = '#64748B';
const BORDER   = '#E2E8F0';
const PLACEHOLDER = '#94A3B8';

/* ── Pre-populated mock data ── */
const INITIAL = {
  garageName:  'AutoCare Garage',
  ownerName:   'Ramesh Patel',
  email:       'ramesh@autocare.com',
  phone:       '9876543210',
  address:     '123 MG Road, Bangalore',
  city:        'Bangalore',
  pincode:     '560001',
};

/* ── Helper: "HH:mm" ↔ Date ── */
function hhmm(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
function dateFromHHMM(s: string): Date {
  const [h, m] = s.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 9, m ?? 0, 0, 0);
  return d;
}

/* ── Flat labeled input (no card wrapper) ── */
interface FlatInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: TextInput['props']['keyboardType'];
  autoCapitalize?: TextInput['props']['autoCapitalize'];
  leadingIcon?: keyof typeof Feather.glyphMap;
  prefix?: string;
  style?: object;
}
function FlatInput({
  label, value, onChangeText, placeholder, keyboardType,
  autoCapitalize = 'sentences', leadingIcon, prefix, style,
}: FlatInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[fi.wrap, style]}>
      <Text style={fi.label}>{label}</Text>
      <View style={[fi.row, focused && fi.rowFocused]}>
        {leadingIcon && (
          <Feather name={leadingIcon} size={16} color={focused ? PRIMARY : PLACEHOLDER} style={fi.icon} />
        )}
        {prefix && <Text style={fi.prefix}>{prefix} </Text>}
        <TextInput
          style={fi.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}
const fi = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: '600', color: LABEL, marginBottom: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, height: 46,
  },
  rowFocused: { borderColor: PRIMARY, borderWidth: 1.5 },
  icon:       { marginRight: 8 },
  prefix:     { fontSize: 14, color: TEXT, fontWeight: '600', marginRight: 4 },
  input:      { flex: 1, fontSize: 14, color: TEXT },
});

/* ── Time picker row ── */
function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [show, setShow] = useState(false);

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    setShow(Platform.OS === 'ios'); // keep open on iOS until dismissed
    if (selected) onChange(selected);
  }

  return (
    <TouchableOpacity
      style={tp.box}
      onPress={() => setShow(true)}
      activeOpacity={0.75}
    >
      <Text style={tp.value}>{hhmm(value)}</Text>
      <Feather name="clock" size={14} color={MUTED} style={{ marginLeft: 6 }} />
      {show && (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </TouchableOpacity>
  );
}
const tp = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, height: 46, flex: 1,
  },
  value: { fontSize: 15, fontWeight: '700', color: TEXT },
});

/* ── Main screen ── */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const [garageName, setGarageName] = useState(INITIAL.garageName);
  const [ownerName,  setOwnerName]  = useState(INITIAL.ownerName);
  const [email,      setEmail]      = useState(INITIAL.email);
  const [phone,      setPhone]      = useState(INITIAL.phone);
  const [address,   setAddress]    = useState(INITIAL.address);
  const [city,      setCity]       = useState(INITIAL.city);
  const [pincode,   setPincode]    = useState(INITIAL.pincode);
  const [openTime,  setOpenTime]   = useState(dateFromHHMM('09:00'));
  const [closeTime, setCloseTime]  = useState(dateFromHHMM('19:00'));
  const [logoUri,   setLogoUri]    = useState<string | null>(null);
  const [saving,    setSaving]     = useState(false);

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to upload a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  }

  function handleSave() {
    if (!garageName.trim()) {
      Alert.alert('Required', 'Please enter the garage name.');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Success', 'Profile saved successfully!');
    }, 1200);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={INDIGO} />

      {/* ── Header ── */}
      <LinearGradient
        colors={[INDIGO, PRIMARY]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 12 }]}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Complete Profile</Text>
          <Text style={styles.headerSub}>Set up your garage details</Text>
        </View>
      </LinearGradient>

      {/* ── Scrollable form ── */}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Logo upload */}
        <View style={styles.logoWrap}>
          <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} activeOpacity={0.75}>
            {logoUri ? (
              <>
                <Image source={{ uri: logoUri }} style={styles.logoImage} />
                {/* Change badge */}
                <View style={styles.logoBadge}>
                  <Feather name="edit-2" size={11} color="#fff" />
                </View>
              </>
            ) : (
              <Feather name="upload" size={22} color={MUTED} />
            )}
          </TouchableOpacity>
          <Text style={styles.logoLabel}>
            {logoUri ? 'Tap to change logo' : 'Upload Logo'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FlatInput
            label="Garage Name"
            value={garageName}
            onChangeText={setGarageName}
            placeholder="AutoCare Garage"
            autoCapitalize="words"
          />
          <FlatInput
            label="Owner Name"
            value={ownerName}
            onChangeText={setOwnerName}
            placeholder="Full name"
            autoCapitalize="words"
          />
          <FlatInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="owner@garage.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leadingIcon="mail"
          />
          <FlatInput
            label="Phone Number"
            value={phone}
            onChangeText={v => setPhone(v.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            leadingIcon="phone"
            prefix="+91"
          />
          <FlatInput
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Street, locality"
            autoCapitalize="words"
            leadingIcon="map-pin"
          />

          {/* City + Pincode row */}
          <View style={styles.row}>
            <FlatInput
              label="City"
              value={city}
              onChangeText={setCity}
              placeholder="City"
              autoCapitalize="words"
              style={{ flex: 1, marginRight: 10 }}
            />
            <FlatInput
              label="Pincode"
              value={pincode}
              onChangeText={v => setPincode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="560001"
              keyboardType="number-pad"
              style={{ flex: 1 }}
            />
          </View>

          {/* Working Hours */}
          <View style={styles.hoursWrap}>
            <View style={styles.hoursHeader}>
              <Feather name="clock" size={14} color={MUTED} />
              <Text style={styles.hoursLabel}>Working Hours</Text>
            </View>
            <View style={styles.timesRow}>
              <TimePicker value={openTime}  onChange={setOpenTime} label="Open" />
              <Text style={styles.timeSep}>—</Text>
              <TimePicker value={closeTime} onChange={setCloseTime} label="Close" />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Save button (fixed at bottom) ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save Profile</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  /* Body */
  body: { paddingHorizontal: 20, paddingTop: 24 },

  /* Logo */
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoBtn: {
    width: 72, height: 72, borderRadius: 16,
    backgroundColor: CARD, borderWidth: 1.5,
    borderColor: BORDER, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  logoLabel: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  logoImage: { width: 72, height: 72, borderRadius: 12 },
  logoBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: CARD,
  },

  /* Form */
  form: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 18,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  /* Working hours */
  hoursWrap:   { marginTop: 2 },
  hoursHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  hoursLabel:  { fontSize: 13, fontWeight: '600', color: LABEL },
  timesRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeSep:     { fontSize: 16, color: MUTED, fontWeight: '700' },

  /* Footer */
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: BG,
  },
  saveBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
