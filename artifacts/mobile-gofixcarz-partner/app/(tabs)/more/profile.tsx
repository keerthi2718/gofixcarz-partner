import React, { useEffect } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import ProfileService from '@/src/services/profile.service';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { ProfileUpdate } from '@/src/types';

type FormData = { name: string; email: string; mobile: string };

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const [editMode, setEditMode] = React.useState(false);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error } = useQuery({ queryKey: QUERY_KEYS.PROFILE, queryFn: ProfileService.get });

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { name: '', email: '', mobile: '' },
  });

  useEffect(() => {
    if (data) reset({ name: data.name ?? '', email: data.email ?? '', mobile: data.mobile ?? '' });
  }, [data, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: ProfileUpdate) => ProfileService.update(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE }); setEditMode(false); },
  });

  function onSubmit(d: FormData) {
    mutate({ name: d.name || null, email: d.email || null, mobile: d.mobile || null });
  }

  const inputStyle = [styles.input, { backgroundColor: editMode ? colors.inputBackground : colors.secondary, borderColor: colors.border, color: colors.foreground }];
  const labelStyle = [styles.label, { color: colors.mutedForeground }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(v => !v)}>
          <Feather name={editMode ? 'x' : 'edit-2'} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState /> : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={[styles.avatarSection, { backgroundColor: colors.primary }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(data?.name ?? data?.mobile ?? 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.avatarName}>{data?.name ?? 'Garage Owner'}</Text>
            <Text style={styles.avatarMobile}>{data?.mobile}</Text>
          </View>

          <Controller control={control} name="name"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Full Name</Text>
                <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} placeholder="Your name" placeholderTextColor={colors.mutedForeground} />
              </View>
            )}
          />
          <Controller control={control} name="email"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Email Address</Text>
                <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} keyboardType="email-address" autoCapitalize="none" placeholder="your@email.com" placeholderTextColor={colors.mutedForeground} />
              </View>
            )}
          />
          <Controller control={control} name="mobile"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Mobile Number</Text>
                <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} keyboardType="phone-pad" placeholder="10-digit mobile" placeholderTextColor={colors.mutedForeground} />
              </View>
            )}
          />

          <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              Member since {data?.created_at ? new Date(data.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
            </Text>
          </View>
        </ScrollView>
      )}

      {editMode && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setEditMode(false); if (data) reset(); }}>
            <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]} onPress={handleSubmit(onSubmit)} disabled={isPending}>
            {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  editBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 4 },
  avatarSection: { borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 20, gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,107,43,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  avatarName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  avatarMobile: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  field: { marginBottom: 14, gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginTop: 8 },
  infoText: { fontSize: 12 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
