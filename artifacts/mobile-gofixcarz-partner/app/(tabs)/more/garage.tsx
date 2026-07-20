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
import GarageService from '@/src/services/garage.service';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import type { GarageUpdate } from '@/src/types';

type FormData = { name: string; owner: string; address: string; city: string; state: string; zipcode: string; alternate_number: string };

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [editMode, setEditMode] = React.useState(false);

  const { data, isLoading, error } = useQuery({ queryKey: QUERY_KEYS.GARAGE, queryFn: GarageService.get });

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: { name: '', owner: '', address: '', city: '', state: '', zipcode: '', alternate_number: '' },
  });

  useEffect(() => {
    if (data) reset({ name: data.name, owner: data.owner, address: data.address ?? '', city: data.city ?? '', state: data.state ?? '', zipcode: data.zipcode ?? '', alternate_number: data.alternate_number ?? '' });
  }, [data, reset]);

  const { mutate, isPending } = useMutation({
    mutationFn: (p: GarageUpdate) => GarageService.update(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.GARAGE }); setEditMode(false); },
  });

  function onSubmit(d: FormData) {
    mutate({ name: d.name, owner: d.owner, address: d.address || null, city: d.city || null, state: d.state || null, zipcode: d.zipcode || null, alternate_number: d.alternate_number || null });
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Garage Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(v => !v)}>
          <Feather name={editMode ? 'x' : 'edit-2'} size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState /> : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
          {/* Banner */}
          <View style={[styles.banner, { backgroundColor: colors.primary }]}>
            <View style={styles.bannerIcon}>
              <Feather name="home" size={28} color="#fff" />
            </View>
            <Text style={styles.bannerName}>{data?.name}</Text>
            <Text style={styles.bannerSub}>{data?.city}{data?.city && data?.state ? ', ' : ''}{data?.state}</Text>
          </View>

          <Controller control={control} name="name" rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Garage Name</Text>
                <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} placeholderTextColor={colors.mutedForeground} />
              </View>
            )}
          />
          <Controller control={control} name="owner"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Owner Name</Text>
                <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} placeholderTextColor={colors.mutedForeground} />
              </View>
            )}
          />
          <Controller control={control} name="alternate_number"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Alternate Phone</Text>
                <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} keyboardType="phone-pad" placeholderTextColor={colors.mutedForeground} />
              </View>
            )}
          />
          <Controller control={control} name="address"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Address</Text>
                <TextInput style={[inputStyle, { minHeight: 70 }]} value={value} onChangeText={onChange} editable={editMode} multiline textAlignVertical="top" placeholderTextColor={colors.mutedForeground} />
              </View>
            )}
          />
          <View style={styles.row}>
            <Controller control={control} name="city"
              render={({ field: { value, onChange } }) => (
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={labelStyle}>City</Text>
                  <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} placeholderTextColor={colors.mutedForeground} />
                </View>
              )}
            />
            <Controller control={control} name="state"
              render={({ field: { value, onChange } }) => (
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={labelStyle}>State</Text>
                  <TextInput style={inputStyle} value={value} onChangeText={onChange} editable={editMode} placeholderTextColor={colors.mutedForeground} />
                </View>
              )}
            />
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
  banner: { borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 20, gap: 6 },
  bannerIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bannerName: { fontSize: 20, fontWeight: '800', color: '#fff' },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  field: { marginBottom: 12, gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
