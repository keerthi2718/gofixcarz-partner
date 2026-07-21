import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import JobService from '@/src/services/job.service';
import { QUERY_KEYS } from '@/src/constants/api';
import { formatCurrency } from '@/src/utils/helpers';

const RED = '#C62828';
const STEPS = ['Customer &\nVehicle', 'Vehicle\nInspection', 'Services', 'Labour &\nTechnician', 'Job\nProgress', 'Final\nInvoice'];
const FUEL_LEVELS = ['E', '1/4', '1/2', '3/4', 'F'];

type ServiceItem = { name: string; price: number; qty: number };

export default function CreateJobScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [step, setStep] = useState(0);

  // Step 1 — Customer & Vehicle
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [odometer, setOdometer] = useState('');

  // Step 2 — Inspection
  const [fuelLevel, setFuelLevel] = useState('1/2');
  const [complaint, setComplaint] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');

  // Step 3 — Services
  const [serviceSearch, setServiceSearch] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Step 4 — Labour
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedTechName, setSelectedTechName] = useState('');
  const [estHours, setEstHours] = useState('');
  const [labourCharge, setLabourCharge] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Step 5/6 — created job
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // Mock customers for Step 1 demo (replace with real API query)
  const mockCustomers = [
    { id: '1', name: 'Rajesh Kumar', mobile: '+91 98765 43210' },
    { id: '2', name: 'Priya Sharma', mobile: '+91 87654 32100' },
    { id: '3', name: 'Amit Patel', mobile: '+91 76543 21000' },
  ].filter(c => customerSearch ? c.name.toLowerCase().includes(customerSearch.toLowerCase()) : true);

  // Mock technicians for Step 4
  const mockTechs = [
    { id: 't1', name: 'Suresh Kumar', role: 'Senior Mechanic', available: true },
    { id: 't2', name: 'Mahesh Reddy', role: 'Electrician', available: true },
    { id: 't3', name: 'Ganesh Patel', role: 'AC Specialist', available: false },
  ];

  const servicesTotal = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const labourTotal = parseFloat(labourCharge) || 0;
  const subtotal = servicesTotal + labourTotal;
  const gst = subtotal * 0.18;
  const grandTotal = subtotal + gst;

  const { mutate: createJob, isPending } = useMutation({
    mutationFn: () => JobService.create({
      customer_id: selectedCustomerId,
      customer_name: selectedCustomerName || null,
      registration_number: regNumber || null,
      brand: brand || null,
      vehicle_model: model || null,
      fuel_type: fuelType || null,
      odometer_km: parseFloat(odometer) || null,
      description: [
        complaint && `Complaint: ${complaint}`,
        inspectionNotes && `Notes: ${inspectionNotes}`,
        additionalNotes,
      ].filter(Boolean).join('\n') || null,
      estimated_amount: (servicesTotal + labourTotal) * 1.18 || null,
    }),
    onSuccess: (job) => {
      setCreatedJobId(job?.id ?? null);
      setStep(4);
    },
  });

  function addService() {
    if (!serviceSearch.trim()) return;
    setServices(s => [...s, { name: serviceSearch.trim(), price: 0, qty: 1 }]);
    setServiceSearch('');
  }

  function updateServicePrice(i: number, price: string) {
    setServices(s => s.map((item, idx) => idx === i ? { ...item, price: parseFloat(price) || 0 } : item));
  }

  function updateQty(i: number, delta: number) {
    setServices(s => s.map((item, idx) => idx === i ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  }

  function removeService(i: number) {
    setServices(s => s.filter((_, idx) => idx !== i));
  }

  function canProceed() {
    if (step === 0) return !!(selectedCustomerId && regNumber && brand && model);
    if (step === 1) return !!complaint;
    if (step === 2) return services.length > 0;
    if (step === 3) return !!selectedTechId;
    return true;
  }

  function handleNext() {
    if (step === 3) { createJob(); return; }
    if (step < 5) setStep(s => s + 1);
  }

  function handleBack() {
    if (step === 0) { router.back(); return; }
    setStep(s => s - 1);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F5F5F5' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerStep}>Step {step + 1} of {STEPS.length}</Text>
          <Text style={styles.headerTitle}>{STEPS[step].replace('\n', ' ')}</Text>
        </View>
      </View>

      {/* Step dots */}
      <View style={styles.stepDots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < step && styles.dotDone,
              i === step && styles.dotActive,
            ]}
          >
            {i < step
              ? <Feather name="check" size={10} color="#fff" />
              : <Text style={[styles.dotText, i === step && { color: '#fff' }]}>{i + 1}</Text>
            }
          </View>
        ))}
        {STEPS.map((_, i) => i < STEPS.length - 1 && (
          <View key={`line-${i}`} style={[styles.dotLine, i < step && styles.dotLineDone]} />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step 0: Customer & Vehicle ── */}
        {step === 0 && (
          <>
            <Text style={styles.sectionLabel}>CUSTOMER</Text>
            <View style={styles.searchBox}>
              <Feather name="search" size={14} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search by name or phone..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
            {mockCustomers.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.customerRow, selectedCustomerId === c.id && styles.customerRowSelected]}
                onPress={() => { setSelectedCustomerId(c.id); setSelectedCustomerName(c.name); }}
                activeOpacity={0.8}
              >
                <View style={[styles.customerAvatar, selectedCustomerId === c.id && { backgroundColor: RED }]}>
                  <Text style={[styles.customerAvatarText, selectedCustomerId === c.id && { color: '#fff' }]}>
                    {c.name.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.customerName}>{c.name}</Text>
                  <Text style={styles.customerPhone}>{c.mobile}</Text>
                </View>
                {selectedCustomerId === c.id && <Feather name="check-circle" size={18} color={RED} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addCustomerBtn}>
              <Feather name="plus" size={14} color={RED} />
              <Text style={[styles.addCustomerText, { color: RED }]}>Add New Customer</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>VEHICLE DETAILS</Text>
            <Text style={styles.fieldLabel}>Registration Number *</Text>
            <TextInput style={styles.input} value={regNumber} onChangeText={setRegNumber} placeholder="KA-01-AB-1234" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Brand *</Text>
                <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="Honda" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Model *</Text>
                <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="City" placeholderTextColor="#9CA3AF" />
              </View>
            </View>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Fuel Type</Text>
                <TextInput style={styles.input} value={fuelType} onChangeText={setFuelType} placeholder="Petrol" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Odometer (km)</Text>
                <TextInput style={styles.input} value={odometer} onChangeText={setOdometer} placeholder="45230" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
              </View>
            </View>
          </>
        )}

        {/* ── Step 1: Vehicle Inspection ── */}
        {step === 1 && (
          <>
            <Text style={styles.sectionLabel}>FUEL LEVEL</Text>
            <View style={styles.fuelRow}>
              {FUEL_LEVELS.map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.fuelBtn, fuelLevel === l && styles.fuelBtnActive]}
                  onPress={() => setFuelLevel(l)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.fuelText, fuelLevel === l && styles.fuelTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Customer Complaint *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={complaint}
              onChangeText={setComplaint}
              placeholder="Describe the issue reported by the customer..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>BEFORE SERVICE PHOTOS</Text>
            <View style={styles.photoRow}>
              {['Photo 1', 'Photo 2', 'Photo 3'].map(p => (
                <View key={p} style={styles.photoBox}>
                  <Feather name="camera" size={18} color="#9CA3AF" />
                  <Text style={styles.photoText}>{p}</Text>
                </View>
              ))}
              <TouchableOpacity style={[styles.photoBox, { borderStyle: 'dashed' }]}>
                <Feather name="plus" size={18} color={RED} />
                <Text style={[styles.photoText, { color: RED }]}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Inspection Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={inspectionNotes}
              onChangeText={setInspectionNotes}
              placeholder="Any additional observations..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </>
        )}

        {/* ── Step 2: Services ── */}
        {step === 2 && (
          <>
            <View style={styles.serviceSearchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={serviceSearch}
                onChangeText={setServiceSearch}
                placeholder="Search and add services..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={addService}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addServiceBtn} onPress={addService}>
                <Feather name="plus" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {services.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ADDED SERVICES</Text>
                {services.map((svc, i) => (
                  <View key={i} style={styles.serviceItem}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.serviceName}>{svc.name}</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={svc.price > 0 ? String(svc.price) : ''}
                        onChangeText={v => updateServicePrice(i, v)}
                        placeholder="Price ₹"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(i, -1)}>
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{svc.qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(i, 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.servicePrice}>{formatCurrency(svc.price * svc.qty)}</Text>
                    <TouchableOpacity onPress={() => removeService(i)}>
                      <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Services Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(servicesTotal)}</Text>
                </View>
              </>
            )}
          </>
        )}

        {/* ── Step 3: Labour & Technician ── */}
        {step === 3 && (
          <>
            <Text style={styles.sectionLabel}>ASSIGN TECHNICIAN</Text>
            {mockTechs.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[styles.techCard, selectedTechId === t.id && styles.techCardSelected]}
                onPress={() => { setSelectedTechId(t.id); setSelectedTechName(t.name); }}
                activeOpacity={0.8}
              >
                <View style={[styles.techAvatar, selectedTechId === t.id && { backgroundColor: RED }]}>
                  <Text style={[styles.techAvatarText, selectedTechId === t.id && { color: '#fff' }]}>
                    {t.name.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.techName}>{t.name}</Text>
                  <Text style={styles.techRole}>{t.role}</Text>
                </View>
                <View style={[styles.availBadge, { backgroundColor: t.available ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: t.available ? '#059669' : '#EF4444' }}>
                    {t.available ? 'Available' : 'Busy'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>LABOUR DETAILS</Text>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Estimated Hours</Text>
                <TextInput style={styles.input} value={estHours} onChangeText={setEstHours} placeholder="2" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Labour Charge (₹)</Text>
                <TextInput style={styles.input} value={labourCharge} onChangeText={setLabourCharge} placeholder="500" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
              </View>
            </View>

            <Text style={styles.sectionLabel}>EXPECTED DELIVERY</Text>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput style={styles.input} value={deliveryDate} onChangeText={setDeliveryDate} placeholder="DD-MM-YYYY" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Time</Text>
                <TextInput style={styles.input} value={deliveryTime} onChangeText={setDeliveryTime} placeholder="05:00 PM" placeholderTextColor="#9CA3AF" />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              placeholder="Special instructions..."
              placeholderTextColor="#9CA3AF"
              multiline numberOfLines={3} textAlignVertical="top"
            />
          </>
        )}

        {/* ── Step 4: Job Progress ── */}
        {step === 4 && (
          <>
            <Text style={styles.sectionLabel}>JOB TIMELINE</Text>
            {[
              { label: 'Job Created', desc: 'Job card created', done: true },
              { label: 'Technician Assigned', desc: selectedTechName, done: !!selectedTechId },
              { label: 'Work Started', desc: 'In progress', current: true },
              { label: 'Waiting for Parts', desc: '', done: false },
              { label: 'Quality Check', desc: '', done: false },
              { label: 'Ready for Delivery', desc: '', done: false },
              { label: 'Completed', desc: '', done: false },
            ].map((item, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineCircle,
                    item.done && { backgroundColor: '#10B981', borderColor: '#10B981' },
                    item.current && { backgroundColor: RED, borderColor: RED },
                  ]}>
                    {item.done
                      ? <Feather name="check" size={12} color="#fff" />
                      : <Text style={[styles.timelineNum, (item.done || item.current) && { color: '#fff' }]}>{i + 1}</Text>
                    }
                  </View>
                  {i < 6 && <View style={[styles.timelineLine, item.done && { backgroundColor: '#10B981' }]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, !item.done && !item.current && { color: '#9CA3AF' }]}>
                    {item.label}
                  </Text>
                  {item.desc ? <Text style={styles.timelineDesc}>{item.desc}</Text> : null}
                  {item.current && <Text style={[styles.currentBadge]}>Current</Text>}
                </View>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>ADVANCE TO NEXT STAGE</Text>
            <View style={styles.stageGrid}>
              {['Waiting for Parts', 'Quality Check', 'Ready for Delivery', 'Completed'].map(s => (
                <TouchableOpacity key={s} style={styles.stageBtn} activeOpacity={0.8}>
                  <Text style={styles.stageBtnText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Step 5: Final Invoice ── */}
        {step === 5 && (
          <>
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View>
                  <Text style={styles.invoiceBrand}>GoFixAuto</Text>
                  <Text style={styles.invoiceTagline}>Smart Auto Fixer</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.invoiceLabel}>INVOICE</Text>
                  <Text style={styles.invoiceNum}>INV-{Date.now().toString().slice(-4)}</Text>
                </View>
              </View>
              <View style={styles.invoiceMeta}>
                <Text style={styles.invoiceMetaText}>Customer: {selectedCustomerName || '—'}</Text>
                <Text style={styles.invoiceMetaText}>Vehicle: {regNumber || '—'}</Text>
                <Text style={styles.invoiceMetaText}>Date: {new Date().toLocaleDateString('en-IN')}</Text>
              </View>
            </View>

            {services.length > 0 && (
              <View style={styles.lineItemsCard}>
                <Text style={styles.lineItemHeader}>SERVICES</Text>
                {services.map((s, i) => (
                  <View key={i} style={styles.lineItem}>
                    <Text style={styles.lineItemName}>{s.name}</Text>
                    <Text style={styles.lineItemAmt}>{formatCurrency(s.price * s.qty)}</Text>
                  </View>
                ))}
              </View>
            )}

            {labourTotal > 0 && (
              <View style={styles.lineItemsCard}>
                <Text style={styles.lineItemHeader}>LABOUR</Text>
                <View style={styles.lineItem}>
                  <Text style={styles.lineItemName}>Labour Charge</Text>
                  <Text style={styles.lineItemAmt}>{formatCurrency(labourTotal)}</Text>
                </View>
              </View>
            )}

            <View style={styles.totalCard}>
              <View style={styles.lineItem}>
                <Text style={styles.lineItemName}>Subtotal</Text>
                <Text style={styles.lineItemAmt}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.lineItem}>
                <Text style={styles.lineItemName}>GST 18%</Text>
                <Text style={styles.lineItemAmt}>{formatCurrency(gst)}</Text>
              </View>
              <View style={[styles.lineItem, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalAmt}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>

            <View style={styles.invoiceActions}>
              <TouchableOpacity style={styles.invoiceActionBtn}>
                <Feather name="download" size={14} color="#374151" />
                <Text style={styles.invoiceActionText}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.invoiceActionBtn}>
                <Feather name="share-2" size={14} color="#374151" />
                <Text style={styles.invoiceActionText}>Share Invoice</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer buttons */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backFooterBtn} onPress={handleBack}>
            <Text style={styles.backFooterText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 5 ? (
          <TouchableOpacity
            style={[styles.nextBtn, { opacity: canProceed() && !isPending ? 1 : 0.6 }]}
            onPress={handleNext}
            disabled={!canProceed() || isPending}
            activeOpacity={0.85}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>{step === 3 ? 'Create Job' : 'Next →'}</Text>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => router.replace('/(tabs)/jobs')}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Complete Job ✓</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    backgroundColor: RED, paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerStep: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  stepDots: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    gap: 0, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', zIndex: 1,
  },
  dotDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  dotActive: { backgroundColor: RED, borderColor: RED },
  dotText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  dotLine: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: -1 },
  dotLineDone: { backgroundColor: '#10B981' },
  body: { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 12, fontSize: 14, color: '#111827',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  customerRowSelected: { borderColor: RED, borderWidth: 1.5 },
  customerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center',
  },
  customerAvatarText: { fontSize: 15, fontWeight: '700', color: RED },
  customerName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  customerPhone: { fontSize: 12, color: '#6B7280' },
  addCustomerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addCustomerText: { fontSize: 13, fontWeight: '600' },
  fuelRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  fuelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#fff', alignItems: 'center',
  },
  fuelBtnActive: { backgroundColor: RED, borderColor: RED },
  fuelText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  fuelTextActive: { color: '#fff' },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  photoBox: {
    flex: 1, aspectRatio: 1, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoText: { fontSize: 10, color: '#9CA3AF' },
  serviceSearchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 0 },
  addServiceBtn: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
  },
  serviceItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  serviceName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  priceInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, width: 70,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  qtyValue: { fontSize: 14, fontWeight: '700', color: '#111827', minWidth: 20, textAlign: 'center' },
  servicePrice: { fontSize: 13, fontWeight: '700', color: '#111827', minWidth: 60, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF5F5', borderRadius: 10, padding: 14, marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: RED },
  totalValue: { fontSize: 16, fontWeight: '800', color: RED },
  techCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  techCardSelected: { borderColor: RED, borderWidth: 1.5 },
  techAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  techAvatarText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  techName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  techRole: { fontSize: 12, color: '#6B7280' },
  availBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#D1D5DB',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 24 },
  timelineNum: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  timelineContent: { flex: 1, paddingBottom: 20, paddingTop: 4 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  timelineDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  currentBadge: { fontSize: 11, fontWeight: '700', color: RED, marginTop: 2 },
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff',
  },
  stageBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  invoiceCard: {
    backgroundColor: RED, borderRadius: 14, padding: 18, marginBottom: 12,
  },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  invoiceBrand: { fontSize: 18, fontWeight: '800', color: '#fff' },
  invoiceTagline: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  invoiceLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: 1 },
  invoiceNum: { fontSize: 14, fontWeight: '700', color: '#fff' },
  invoiceMeta: { gap: 2 },
  invoiceMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  lineItemsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  lineItemHeader: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 10 },
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineItemName: { fontSize: 13, color: '#374151' },
  lineItemAmt: { fontSize: 13, fontWeight: '600', color: '#111827' },
  totalCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  grandTotalRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 8, paddingTop: 10 },
  grandTotalLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  grandTotalAmt: { fontSize: 15, fontWeight: '800', color: RED },
  invoiceActions: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  invoiceActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  invoiceActionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  backFooterBtn: {
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  backFooterText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  nextBtn: {
    flex: 1, backgroundColor: RED, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
