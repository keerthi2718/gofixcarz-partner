import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import GarageService from '@/src/services/garage.service';
import InputField from '@/src/components/ui/InputField';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { GarageUpdate } from '@/src/types';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';

type FormData = {
  name: string;
  owner: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  alternate_number: string;
};

function SectionCard({ icon, title, iconBg = '#EEF2FF', iconFg = PRIMARY, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  iconBg?: string;
  iconFg?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={cardSt.card}>
      <View style={cardSt.header}>
        <View style={[cardSt.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={cardSt.title}>{title}</Text>
      </View>
      <View style={cardSt.body}>{children}</View>
    </View>
  );
}
const cardSt = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 14, fontWeight: '700', color: TEXT },
  body:     { padding: 18 },
});

export default function GarageScreen() {
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const topPad  = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn:  GarageService.get,
  });

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { name: '', owner: '', address: '', city: '', state: '', zipcode: '', alternate_number: '' },
  });

  useEffect(() => {
    if (data) reset({
      name:             data.name,
      owner:            data.owner,
      address:          data.address ?? '',
      city:             data.city ?? '',
      state:            data.state ?? '',
      zipcode:          data.zipcode ?? '',
      alternate_number: data.alternate_number ?? '',
    });
  }, [data, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: GarageUpdate) => GarageService.update(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE }); setEditMode(false); },
  });

  function onSubmit(d: FormData) {
    mutate({
      name:             d.name,
      owner:            d.owner,
      address:          d.address || null,
      city:             d.city || null,
      state:            d.state || null,
      zipcode:          d.zipcode || null,
      alternate_number: d.alternate_number || null,
    });
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Garage Profile</Text>
        <TouchableOpacity
          style={[styles.editBtn, editMode && styles.editBtnActive]}
          onPress={() => { setEditMode(v => !v); if (editMode && data) reset(); }}
        >
          <Feather name={editMode ? 'x' : 'edit-2'} size={16} color={editMode ? '#EF4444' : PRIMARY} />
        </TouchableOpacity>
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState /> : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 130 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Garage hero card ── */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Feather name="home" size={26} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{data?.name}</Text>
              <Text style={styles.heroSub}>
                {[data?.city, data?.state].filter(Boolean).join(', ') || 'Location not set'}
              </Text>
            </View>
            {editMode && (
              <View style={styles.editingBadge}>
                <Feather name="edit-2" size={10} color={PRIMARY} />
                <Text style={styles.editingBadgeText}>Editing</Text>
              </View>
            )}
          </View>

          {/* ── Basic Info ── */}
          <SectionCard icon="briefcase" title="Business Details">
            <Controller
              control={control} name="name"
              rules={{ required: 'Garage name is required.' }}
              render={({ field: { value, onChange }, fieldState: { error: e } }) => (
                <InputField
                  label="Garage Name *"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="e.g. Sharma Auto Works"
                  leadingIcon="home"
                  error={e?.message}
                />
              )}
            />
            <Controller
              control={control} name="owner"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Owner Name"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="e.g. Ramesh Sharma"
                  leadingIcon="user"
                />
              )}
            />
            <Controller
              control={control} name="alternate_number"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Alternate Phone"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="10-digit number"
                  keyboardType="phone-pad"
                  leadingIcon="phone"
                />
              )}
            />
          </SectionCard>

          {/* ── Address ── */}
          <SectionCard icon="map-pin" title="Location" iconBg="#F0FDF4" iconFg="#10B981">
            <Controller
              control={control} name="address"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="Street Address"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="Plot / Door no, Street name"
                  leadingIcon="map-pin"
                  multiline
                />
              )}
            />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control} name="city"
                  render={({ field: { value, onChange } }) => (
                    <InputField
                      label="City"
                      value={value}
                      onChangeText={onChange}
                      editable={editMode}
                      placeholder="City"
                      leadingIcon="navigation"
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control} name="state"
                  render={({ field: { value, onChange } }) => (
                    <InputField
                      label="State"
                      value={value}
                      onChangeText={onChange}
                      editable={editMode}
                      placeholder="State"
                      leadingIcon="flag"
                    />
                  )}
                />
              </View>
            </View>
            <Controller
              control={control} name="zipcode"
              render={({ field: { value, onChange } }) => (
                <InputField
                  label="PIN Code"
                  value={value}
                  onChangeText={onChange}
                  editable={editMode}
                  placeholder="6-digit PIN"
                  keyboardType="number-pad"
                  leadingIcon="hash"
                />
              )}
            />
          </SectionCard>

          {/* ── Info chip ── */}
          {!editMode && (
            <View style={styles.infoChip}>
              <Feather name="info" size={13} color={PRIMARY} />
              <Text style={styles.infoChipText}>
                Tap the edit icon above to update your garage details.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Footer (edit mode only) ── */}
      {editMode && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={styles.footerCancel}
            onPress={() => { setEditMode(false); if (data) reset(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.footerCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerSave, isPending && { opacity: 0.6 }]}
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <><Feather name="check" size={16} color="#fff" /><Text style={styles.footerSaveText}>Save Changes</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pageTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: TEXT },
  editBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  editBtnActive: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },

  body: { paddingHorizontal: 20 },

  /* Hero card */
  heroCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: CARD,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  heroIcon: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 3 },
  heroSub:  { fontSize: 13, color: MUTED },
  editingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: '#EEF2FF', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
  },
  editingBadgeText: { fontSize: 10, fontWeight: '700', color: PRIMARY },

  twoCol: { flexDirection: 'row', gap: 10 },

  infoChip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
    padding: 14, marginBottom: 14,
  },
  infoChipText: { flex: 1, fontSize: 13, color: PRIMARY, lineHeight: 18 },

  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  footerCancel: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: BG, alignItems: 'center',
  },
  footerCancelText: { fontSize: 14, fontWeight: '600', color: TEXT },
  footerSave: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
