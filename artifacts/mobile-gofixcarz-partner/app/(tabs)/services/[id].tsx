import React, { useEffect } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import type { ServicePackageUpdate } from '@/src/types';

type FormData = { name: string; description: string; price: string; duration_minutes: string; is_active: boolean };

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [showDelete, setShowDelete] = React.useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGE(id),
    queryFn: () => ServicePackageService.getById(id),
  });

  const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: { name: '', description: '', price: '', duration_minutes: '', is_active: true },
  });
  const isActive = watch('is_active');

  useEffect(() => {
    if (data) reset({ name: data.name, description: data.description ?? '', price: String(data.price), duration_minutes: data.duration_minutes ? String(data.duration_minutes) : '', is_active: data.is_active });
  }, [data, reset]);

  const invalidate = () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGES() }); qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGE(id) }); };
  const updateMut = useMutation({ mutationFn: (p: ServicePackageUpdate) => ServicePackageService.update(id, p), onSuccess: () => { invalidate(); router.back(); } });
  const deleteMut = useMutation({ mutationFn: () => ServicePackageService.delete(id), onSuccess: () => { invalidate(); router.back(); } });

  function onSubmit(data: FormData) {
    updateMut.mutate({ name: data.name, description: data.description || null, price: parseFloat(data.price) || 0, duration_minutes: data.duration_minutes ? parseInt(data.duration_minutes) : null, is_active: data.is_active });
  }

  const inputStyle = [styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.foreground }];
  const labelStyle = [styles.label, { color: colors.primary }];
  const isPending = updateMut.isPending || deleteMut.isPending;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Package</Text>
        <TouchableOpacity style={styles.deleteIcon} onPress={() => setShowDelete(true)}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState /> : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled">
          <Controller control={control} name="name" rules={{ required: 'Required.' }}
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Service Name *</Text>
                <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="e.g. Full Car Service" placeholderTextColor={colors.mutedForeground} />
                {errors.name ? <Text style={styles.errText}>{errors.name.message}</Text> : null}
              </View>
            )}
          />
          <Controller control={control} name="description"
            render={({ field: { value, onChange } }) => (
              <View style={styles.field}>
                <Text style={labelStyle}>Description</Text>
                <TextInput style={[inputStyle, { minHeight: 80 }]} value={value} onChangeText={onChange} placeholder="What's included?" placeholderTextColor={colors.mutedForeground} multiline textAlignVertical="top" />
              </View>
            )}
          />
          <View style={styles.row}>
            <Controller control={control} name="price" rules={{ required: 'Required.' }}
              render={({ field: { value, onChange } }) => (
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={labelStyle}>Price (₹) *</Text>
                  <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
                </View>
              )}
            />
            <Controller control={control} name="duration_minutes"
              render={({ field: { value, onChange } }) => (
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={labelStyle}>Duration (min)</Text>
                  <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="e.g. 60" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" />
                </View>
              )}
            />
          </View>
          <View style={styles.field}>
            <Text style={labelStyle}>Status</Text>
            <TouchableOpacity
              style={[styles.toggle, { backgroundColor: isActive ? colors.success + '20' : colors.muted, borderColor: isActive ? colors.success : colors.border }]}
              onPress={() => setValue('is_active', !isActive)} activeOpacity={0.8}
            >
              <View style={[styles.toggleDot, { backgroundColor: isActive ? colors.success : colors.mutedForeground }]} />
              <Text style={[styles.toggleText, { color: isActive ? colors.success : colors.mutedForeground }]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => router.back()}>
          <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isPending ? 0.7 : 1 }]} onPress={handleSubmit(onSubmit)} disabled={isPending}>
          {updateMut.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>

      <ConfirmDialog visible={showDelete} title="Delete Package" message="Are you sure you want to delete this service package? This cannot be undone." destructive confirmLabel="Delete" onConfirm={() => deleteMut.mutate()} onCancel={() => setShowDelete(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  deleteIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 4 },
  field: { marginBottom: 14, gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleText: { fontSize: 13, fontWeight: '600' },
  errText: { fontSize: 12, color: '#EF4444' },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
