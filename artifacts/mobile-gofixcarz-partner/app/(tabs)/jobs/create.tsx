import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useColors } from '@/hooks/useColors';
import { QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import type { JobCreate } from '@/src/types';

type FormData = {
  customer_name: string;
  customer_mobile: string;
  registration_number: string;
  brand: string;
  vehicle_model: string;
  fuel_type: string;
  odometer_km: string;
  description: string;
  estimated_amount: string;
};

const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

export default function CreateJobScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: { customer_name: '', customer_mobile: '', registration_number: '', brand: '', vehicle_model: '', fuel_type: '', odometer_km: '', description: '', estimated_amount: '' },
  });

  const { mutate, isPending, error: mutError } = useMutation({
    mutationFn: (payload: JobCreate) => JobService.create(payload),
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.JOBS() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      router.replace(`/(tabs)/jobs/${job.id}`);
    },
  });

  function onSubmit(data: FormData) {
    const payload: JobCreate = {
      customer_name: data.customer_name || null,
      customer_mobile: data.customer_mobile || null,
      registration_number: data.registration_number || null,
      brand: data.brand || null,
      vehicle_model: data.vehicle_model || null,
      fuel_type: data.fuel_type || null,
      odometer_km: data.odometer_km ? parseInt(data.odometer_km) : null,
      description: data.description || null,
      estimated_amount: data.estimated_amount ? parseFloat(data.estimated_amount) : null,
    };
    mutate(payload);
  }

  const inputStyle = [styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.foreground }];
  const labelStyle = [styles.label, { color: colors.primary }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Job Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mutError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.destructiveLight }]}>
            <Text style={[styles.errorText, { color: colors.destructive }]}>{(mutError as Error).message}</Text>
          </View>
        ) : null}

        {/* Customer */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Customer Details</Text>
        <Controller control={control} name="customer_name" render={({ field: { value, onChange } }) => (
          <View style={styles.field}>
            <Text style={labelStyle}>Customer Name</Text>
            <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="Full name" placeholderTextColor={colors.mutedForeground} />
          </View>
        )} />
        <Controller control={control} name="customer_mobile" render={({ field: { value, onChange } }) => (
          <View style={styles.field}>
            <Text style={labelStyle}>Mobile Number</Text>
            <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="10-digit mobile" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" maxLength={10} />
          </View>
        )} />

        {/* Vehicle */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Vehicle Details</Text>
        <Controller control={control} name="registration_number" render={({ field: { value, onChange } }) => (
          <View style={styles.field}>
            <Text style={labelStyle}>Registration Number</Text>
            <TextInput style={inputStyle} value={value} onChangeText={t => onChange(t.toUpperCase())} placeholder="e.g. MH 02 AB 1234" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters" />
          </View>
        )} />
        <View style={styles.row}>
          <Controller control={control} name="brand" render={({ field: { value, onChange } }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={labelStyle}>Brand</Text>
              <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="e.g. Maruti" placeholderTextColor={colors.mutedForeground} />
            </View>
          )} />
          <Controller control={control} name="vehicle_model" render={({ field: { value, onChange } }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={labelStyle}>Model</Text>
              <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="e.g. Swift" placeholderTextColor={colors.mutedForeground} />
            </View>
          )} />
        </View>
        <View style={styles.row}>
          <Controller control={control} name="fuel_type" render={({ field: { value, onChange } }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={labelStyle}>Fuel Type</Text>
              <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="Petrol / Diesel" placeholderTextColor={colors.mutedForeground} />
            </View>
          )} />
          <Controller control={control} name="odometer_km" render={({ field: { value, onChange } }) => (
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={labelStyle}>Odometer (km)</Text>
              <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="e.g. 45000" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" />
            </View>
          )} />
        </View>

        {/* Job Info */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Job Details</Text>
        <Controller control={control} name="description" render={({ field: { value, onChange } }) => (
          <View style={styles.field}>
            <Text style={labelStyle}>Description / Complaint</Text>
            <TextInput style={[inputStyle, styles.textarea]} value={value} onChangeText={onChange} placeholder="Describe the issue or work required..." placeholderTextColor={colors.mutedForeground} multiline numberOfLines={4} textAlignVertical="top" />
          </View>
        )} />
        <Controller control={control} name="estimated_amount" render={({ field: { value, onChange } }) => (
          <View style={styles.field}>
            <Text style={labelStyle}>Estimated Amount (₹)</Text>
            <TextInput style={inputStyle} value={value} onChangeText={onChange} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" />
          </View>
        )} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: isPending ? 0.7 : 1 }]} onPress={handleSubmit(onSubmit)} disabled={isPending} activeOpacity={0.85}>
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Job Card</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  content: { padding: 16, gap: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  field: { marginBottom: 12, gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  textarea: { minHeight: 90, paddingTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
  errorBox: { borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 13 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: '600' },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
