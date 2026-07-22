import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import JobService from '@/src/services/job.service';
import InputField from '@/src/components/ui/InputField';
import { formatCurrency } from '@/src/utils/helpers';
import { QUERY_KEYS } from '@/src/constants/api';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';
const DANGER  = '#EF4444';
const WARNING = '#F59E0B';

/* ── Step config ── */
const STEPS = [
  { key: 'customer',   label: 'Customer',   subtitle: 'Customer & vehicle details',   icon: 'user'      as const },
  { key: 'inspection', label: 'Inspection', subtitle: 'Vehicle condition & complaint', icon: 'clipboard' as const },
  { key: 'services',   label: 'Services',   subtitle: 'Services to be performed',      icon: 'tool'      as const },
  { key: 'technician', label: 'Technician', subtitle: 'Assign & schedule work',        icon: 'users'     as const },
  { key: 'review',     label: 'Review',     subtitle: 'Confirm & create job card',     icon: 'file-text' as const },
];

const FUEL_TYPES  = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];
const FUEL_LEVELS = ['E', '1/4', '1/2', '3/4', 'F'];

const INSPECTION_ITEMS = [
  { key: 'tyres',      label: 'Tyres',      icon: 'circle'       as const },
  { key: 'brakes',     label: 'Brakes',     icon: 'alert-circle' as const },
  { key: 'lights',     label: 'Lights',     icon: 'sun'          as const },
  { key: 'battery',    label: 'Battery',    icon: 'zap'          as const },
  { key: 'engine',     label: 'Engine',     icon: 'cpu'          as const },
  { key: 'ac',         label: 'A/C',        icon: 'wind'         as const },
  { key: 'suspension', label: 'Suspension', icon: 'activity'     as const },
  { key: 'body',       label: 'Body',       icon: 'shield'       as const },
];

const QUICK_SERVICES = ['Oil Change', 'AC Service', 'Wheel Alignment', 'Brake Service', 'Battery Check', 'Tyre Rotation'];

const MOCK_TECHS = [
  { id: 't1', name: 'Suresh Kumar', role: 'Senior Mechanic',  available: true  },
  { id: 't2', name: 'Mahesh Reddy', role: 'Electrician',      available: true  },
  { id: 't3', name: 'Ganesh Patel', role: 'AC Specialist',    available: false },
];

type InspStatus = 'ok' | 'issue' | 'na';
type ServiceItem = { name: string; price: number; qty: number };

/* ─────────────────────── Shared sub-components ─────────────────────── */

function StepCard({ icon, title, iconBg = '#EEF2FF', iconFg = PRIMARY, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string; iconBg?: string; iconFg?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={[sc.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={15} color={iconFg} />
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 }, default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: TEXT },
  body:  { padding: 18 },
});

function ValidationBanner({ message }: { message: string }) {
  return (
    <View style={vb.wrap}>
      <Feather name="alert-circle" size={14} color={DANGER} />
      <Text style={vb.text}>{message}</Text>
    </View>
  );
}
const vb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA',
    padding: 14, marginBottom: 14,
  },
  text: { flex: 1, fontSize: 13, color: DANGER, lineHeight: 18 },
});

/* ─────────────────────── Main screen ─────────────────────── */

export default function CreateJobScreen() {
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();
  const topPad  = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [step, setStep]           = useState(0);
  const [validationMsg, setValidationMsg] = useState('');
  const [createdJobId, setCreatedJobId]   = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  /* ── Step 0 — Customer & Vehicle ── */
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [regNumber,     setRegNumber]     = useState('');
  const [brand,         setBrand]         = useState('');
  const [model,         setModel]         = useState('');
  const [fuelType,      setFuelType]      = useState('Petrol');
  const [odometer,      setOdometer]      = useState('');

  /* ── Step 1 — Inspection ── */
  const [fuelLevel,      setFuelLevel]      = useState('1/2');
  const [inspection,     setInspection]     = useState<Record<string, InspStatus>>({});
  const [complaint,      setComplaint]      = useState('');
  const [inspNotes,      setInspNotes]      = useState('');

  /* ── Step 2 — Services ── */
  const [services,      setServices]      = useState<ServiceItem[]>([]);
  const [svcSearch,     setSvcSearch]     = useState('');

  /* ── Step 3 — Technician ── */
  const [selectedTechId,   setSelectedTechId]   = useState<string | null>(null);
  const [selectedTechName, setSelectedTechName] = useState('');
  const [estHours,         setEstHours]         = useState('');
  const [labourCharge,     setLabourCharge]     = useState('');
  const [deliveryDate,     setDeliveryDate]     = useState('');
  const [deliveryTime,     setDeliveryTime]     = useState('');
  const [techNotes,        setTechNotes]        = useState('');

  /* ── Totals ── */
  const servicesTotal = services.reduce((s, i) => s + i.price * i.qty, 0);
  const labourTotal   = parseFloat(labourCharge) || 0;
  const subtotal      = servicesTotal + labourTotal;
  const gst           = subtotal * 0.18;
  const grandTotal    = subtotal + gst;

  /* ── API mutation ── */
  const { mutate: createJob, isPending } = useMutation({
    mutationFn: () => {
      const issueItems = INSPECTION_ITEMS
        .filter(i => inspection[i.key] === 'issue')
        .map(i => i.label).join(', ');
      const descParts = [
        complaint && `Complaint: ${complaint}`,
        issueItems && `Issues found: ${issueItems}`,
        inspNotes  && `Inspection notes: ${inspNotes}`,
        techNotes  && `Tech notes: ${techNotes}`,
        selectedTechName && `Assigned to: ${selectedTechName}`,
        estHours   && `Est. hours: ${estHours}h`,
        deliveryDate && `Expected delivery: ${deliveryDate}${deliveryTime ? ' ' + deliveryTime : ''}`,
      ].filter(Boolean).join('\n');

      return JobService.create({
        customer_name:       customerName  || null,
        customer_mobile:     customerPhone || null,
        registration_number: regNumber     || null,
        brand:               brand         || null,
        vehicle_model:       model         || null,
        fuel_type:           fuelType      || null,
        odometer_km:         parseFloat(odometer) || null,
        description:         descParts     || null,
        estimated_amount:    grandTotal    || null,
      });
    },
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.JOBS() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      setCreatedJobId(job?.id ?? null);
      animateStep(5);
    },
  });

  /* ── Service helpers ── */
  function addService(name: string) {
    if (!name.trim()) return;
    setServices(s => [...s, { name: name.trim(), price: 0, qty: 1 }]);
    setSvcSearch('');
  }
  function setServicePrice(i: number, v: string) {
    setServices(s => s.map((item, idx) => idx === i ? { ...item, price: parseFloat(v) || 0 } : item));
  }
  function setServiceQty(i: number, delta: number) {
    setServices(s => s.map((item, idx) => idx === i ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  }
  function removeService(i: number) {
    setServices(s => s.filter((_, idx) => idx !== i));
  }

  /* ── Inspection toggle ── */
  function toggleInspection(key: string, status: InspStatus) {
    setInspection(prev => ({ ...prev, [key]: prev[key] === status ? undefined as any : status }));
  }

  /* ── Navigation ── */
  function validate(): string {
    if (step === 0) {
      if (!customerName.trim()) return 'Customer name is required.';
      if (!regNumber.trim())     return 'Registration number is required.';
      if (!brand.trim())         return 'Vehicle brand is required.';
      if (!model.trim())         return 'Vehicle model is required.';
    }
    if (step === 1) {
      if (!complaint.trim()) return 'Please describe the customer complaint.';
    }
    if (step === 2) {
      if (services.length === 0) return 'Add at least one service to proceed.';
    }
    if (step === 3) {
      if (!selectedTechId) return 'Please assign a technician.';
    }
    return '';
  }

  function animateStep(next: number) {
    slideAnim.setValue(1);
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    setStep(next);
  }

  function handleNext() {
    const msg = validate();
    if (msg) { setValidationMsg(msg); return; }
    setValidationMsg('');
    if (step === 3) { createJob(); return; }
    if (step < 4)   animateStep(step + 1);
  }

  function handleBack() {
    setValidationMsg('');
    if (step === 0 || step === 5) { router.back(); return; }
    animateStep(step - 1);
  }

  /* ── Fuel gauge percentage ── */
  const fuelPct = (['E','1/4','1/2','3/4','F'].indexOf(fuelLevel) + 1) / 5;
  const fuelColor = fuelPct <= 0.2 ? DANGER : fuelPct <= 0.4 ? WARNING : SUCCESS;

  /* ══════════════════════════════════════════════════════════════════ */
  /* SUCCESS SCREEN                                                     */
  /* ══════════════════════════════════════════════════════════════════ */
  if (step === 5) {
    return (
      <View style={[styles.root, { backgroundColor: BG }]}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <View style={[styles.successWrap, { paddingTop: topPad + 20, paddingBottom: insets.bottom + 30 }]}>
          <LinearGradient colors={['#4F46E5', '#2563EB', '#06B6D4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.successIcon}>
            <Feather name="check" size={36} color="#fff" />
          </LinearGradient>

          <Text style={styles.successTitle}>Job Card Created!</Text>
          <Text style={styles.successSub}>Your job card has been created{'\n'}and is ready for processing.</Text>

          {/* Summary chips */}
          <View style={styles.successChipRow}>
            <View style={styles.successChip}>
              <Feather name="user" size={13} color={PRIMARY} />
              <Text style={styles.successChipText}>{customerName || '—'}</Text>
            </View>
            <View style={styles.successChip}>
              <Feather name="hash" size={13} color={PRIMARY} />
              <Text style={styles.successChipText}>{regNumber || '—'}</Text>
            </View>
          </View>
          <View style={styles.successChipRow}>
            <View style={styles.successChip}>
              <Feather name="tool" size={13} color={PRIMARY} />
              <Text style={styles.successChipText}>{services.length} service{services.length !== 1 ? 's' : ''}</Text>
            </View>
            {grandTotal > 0 && (
              <View style={styles.successChip}>
                <Feather name="credit-card" size={13} color={PRIMARY} />
                <Text style={styles.successChipText}>{formatCurrency(grandTotal)}</Text>
              </View>
            )}
          </View>

          <View style={styles.successActions}>
            {createdJobId && (
              <TouchableOpacity
                style={styles.successViewBtn}
                onPress={() => router.replace(`/(tabs)/jobs/${createdJobId}` as any)}
                activeOpacity={0.85}
              >
                <Feather name="eye" size={16} color="#fff" />
                <Text style={styles.successViewText}>View Job Card</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.successBackBtn}
              onPress={() => router.replace('/(tabs)/jobs')}
              activeOpacity={0.85}
            >
              <Text style={styles.successBackText}>Back to Job Cards</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  /* ══════════════════════════════════════════════════════════════════ */
  /* WIZARD                                                             */
  /* ══════════════════════════════════════════════════════════════════ */
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        {/* Back + title */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Feather name="arrow-left" size={18} color={TEXT} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepMeta}>STEP {step + 1} OF {STEPS.length}</Text>
            <Text style={styles.stepTitle}>{STEPS[step].label}</Text>
            <Text style={styles.stepSub}>{STEPS[step].subtitle}</Text>
          </View>
          <View style={styles.pctBadge}>
            <Text style={styles.pctText}>{pct}%</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>

        {/* Stepper dots */}
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && (
                <View style={[styles.stepLine, i <= step && styles.stepLineDone]} />
              )}
              <View style={[
                styles.stepCircle,
                i < step  && styles.stepCircleDone,
                i === step && styles.stepCircleActive,
              ]}>
                {i < step
                  ? <Feather name="check" size={10} color="#fff" />
                  : <Text style={[styles.stepNum, i === step && { color: '#fff' }]}>{i + 1}</Text>
                }
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Validation banner */}
        {validationMsg ? <ValidationBanner message={validationMsg} /> : null}

        {/* ═══════════════ STEP 0 — Customer & Vehicle ═══════════════ */}
        {step === 0 && (
          <>
            <StepCard icon="user" title="Customer Details">
              <InputField
                label="Customer Name *"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Full name"
                autoCapitalize="words"
                leadingIcon="user"
              />
              <InputField
                label="Phone Number"
                value={customerPhone}
                onChangeText={v => setCustomerPhone(v.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
                leadingIcon="phone"
                prefix="+91"
              />
            </StepCard>

            <StepCard icon="truck" title="Vehicle Details" iconBg="#FFF7ED" iconFg="#F97316">
              <InputField
                label="Registration Number *"
                value={regNumber}
                onChangeText={v => setRegNumber(v.toUpperCase())}
                placeholder="KA-01-AB-1234"
                autoCapitalize="characters"
                leadingIcon="hash"
              />
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <InputField label="Brand *" value={brand} onChangeText={setBrand} placeholder="Honda" autoCapitalize="words" />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField label="Model *" value={model} onChangeText={setModel} placeholder="City" autoCapitalize="words" />
                </View>
              </View>

              {/* Fuel type chips */}
              <Text style={styles.fieldLabel}>Fuel Type</Text>
              <View style={styles.chipWrap}>
                {FUEL_TYPES.map(ft => (
                  <TouchableOpacity
                    key={ft}
                    style={[styles.chip, fuelType === ft && styles.chipActive]}
                    onPress={() => setFuelType(ft)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, fuelType === ft && styles.chipTextActive]}>{ft}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <InputField
                label="Odometer (km)"
                value={odometer}
                onChangeText={setOdometer}
                placeholder="e.g. 45230"
                keyboardType="number-pad"
                leadingIcon="navigation"
              />
            </StepCard>
          </>
        )}

        {/* ═══════════════ STEP 1 — Inspection ═══════════════ */}
        {step === 1 && (
          <>
            {/* Fuel gauge */}
            <StepCard icon="droplet" title="Fuel Level" iconBg="#FFF7ED" iconFg="#F97316">
              <View style={styles.fuelBtnRow}>
                {FUEL_LEVELS.map(l => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.fuelBtn, fuelLevel === l && { backgroundColor: fuelColor, borderColor: fuelColor }]}
                    onPress={() => setFuelLevel(l)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.fuelBtnText, fuelLevel === l && { color: '#fff' }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.gaugeTrack}>
                <View style={[styles.gaugeFill, { width: `${fuelPct * 100}%`, backgroundColor: fuelColor }]} />
              </View>
            </StepCard>

            {/* Inspection checklist */}
            <StepCard icon="clipboard" title="Inspection Checklist">
              <Text style={styles.inspLegend}>
                <Text style={{ color: SUCCESS }}>● OK  </Text>
                <Text style={{ color: DANGER }}>● Issue  </Text>
                <Text style={{ color: MUTED }}>● N/A</Text>
              </Text>
              {INSPECTION_ITEMS.map(item => {
                const status = inspection[item.key];
                return (
                  <View key={item.key} style={styles.inspRow}>
                    <View style={styles.inspLeft}>
                      <Feather name={item.icon} size={14} color={MUTED} />
                      <Text style={styles.inspLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.inspBtns}>
                      {(['ok', 'issue', 'na'] as InspStatus[]).map(s => {
                        const active = status === s;
                        const color  = s === 'ok' ? SUCCESS : s === 'issue' ? DANGER : MUTED;
                        const btnLabel = s === 'ok' ? 'OK' : s === 'issue' ? 'Issue' : 'N/A';
                        return (
                          <TouchableOpacity
                            key={s}
                            style={[styles.inspBtn, active && { backgroundColor: color, borderColor: color }]}
                            onPress={() => toggleInspection(item.key, s)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.inspBtnText, active && { color: '#fff' }]}>{btnLabel}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </StepCard>

            {/* Complaint */}
            <StepCard icon="message-circle" title="Customer Complaint *" iconBg="#FEF2F2" iconFg={DANGER}>
              <View style={styles.textAreaWrap}>
                <TextInput
                  style={styles.textArea}
                  value={complaint}
                  onChangeText={setComplaint}
                  placeholder="Describe the issue reported by the customer…"
                  placeholderTextColor="#94A3B8"
                  multiline numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.fieldLabel}>Additional Notes</Text>
              <View style={[styles.textAreaWrap, { marginBottom: 0 }]}>
                <TextInput
                  style={[styles.textArea, { minHeight: 68 }]}
                  value={inspNotes}
                  onChangeText={setInspNotes}
                  placeholder="Internal observations (optional)…"
                  placeholderTextColor="#94A3B8"
                  multiline numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </StepCard>
          </>
        )}

        {/* ═══════════════ STEP 2 — Services ═══════════════ */}
        {step === 2 && (
          <>
            <StepCard icon="tool" title="Add Services">
              {/* Search + add */}
              <View style={styles.svcSearchRow}>
                <View style={styles.svcSearchBox}>
                  <Feather name="search" size={15} color={MUTED} />
                  <TextInput
                    style={styles.svcSearchInput}
                    value={svcSearch}
                    onChangeText={setSvcSearch}
                    placeholder="Search or type a service…"
                    placeholderTextColor="#94A3B8"
                    onSubmitEditing={() => addService(svcSearch)}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  style={styles.addSvcBtn}
                  onPress={() => addService(svcSearch)}
                  activeOpacity={0.85}
                >
                  <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Quick chips */}
              <Text style={styles.fieldLabel}>Quick add</Text>
              <View style={styles.chipWrap}>
                {QUICK_SERVICES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, styles.chipQuick]}
                    onPress={() => addService(s)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={11} color={PRIMARY} />
                    <Text style={styles.chipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </StepCard>

            {/* Service list */}
            {services.length > 0 && (
              <StepCard icon="list" title={`${services.length} service${services.length !== 1 ? 's' : ''} added`} iconBg="#F0FDF4" iconFg={SUCCESS}>
                {services.map((svc, i) => (
                  <View key={i}>
                    <View style={styles.svcRow}>
                      {/* Name + delete */}
                      <View style={styles.svcNameRow}>
                        <View style={styles.svcDot}>
                          <Feather name="tool" size={11} color={PRIMARY} />
                        </View>
                        <Text style={styles.svcName} numberOfLines={1}>{svc.name}</Text>
                        <TouchableOpacity
                          onPress={() => removeService(i)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Feather name="x" size={14} color={DANGER + '99'} />
                        </TouchableOpacity>
                      </View>

                      {/* Price + qty + total */}
                      <View style={styles.svcControls}>
                        <View style={styles.pricePill}>
                          <Text style={styles.priceRupee}>₹</Text>
                          <TextInput
                            style={styles.priceInput}
                            value={svc.price > 0 ? String(svc.price) : ''}
                            onChangeText={v => setServicePrice(i, v)}
                            placeholder="0"
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={styles.qtyStepper}>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => setServiceQty(i, -1)} activeOpacity={0.8}>
                            <Feather name="minus" size={11} color={TEXT} />
                          </TouchableOpacity>
                          <Text style={styles.qtyVal}>{svc.qty}</Text>
                          <TouchableOpacity style={styles.qtyBtn} onPress={() => setServiceQty(i, 1)} activeOpacity={0.8}>
                            <Feather name="plus" size={11} color={TEXT} />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.svcTotal}>{formatCurrency(svc.price * svc.qty)}</Text>
                      </View>
                    </View>
                    {i < services.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}

                {/* Services subtotal */}
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Services Total</Text>
                  <Text style={styles.subtotalValue}>{formatCurrency(servicesTotal)}</Text>
                </View>
              </StepCard>
            )}
          </>
        )}

        {/* ═══════════════ STEP 3 — Technician ═══════════════ */}
        {step === 3 && (
          <>
            <StepCard icon="users" title="Assign Technician *" iconBg="#F5F3FF" iconFg="#7C3AED">
              {MOCK_TECHS.map(t => {
                const active = selectedTechId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.techCard, active && styles.techCardActive]}
                    onPress={() => { setSelectedTechId(t.id); setSelectedTechName(t.name); }}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.techAvatar, active && { backgroundColor: PRIMARY }]}>
                      <Text style={[styles.techAvatarText, active && { color: '#fff' }]}>
                        {t.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.techName, active && { color: PRIMARY }]}>{t.name}</Text>
                      <Text style={styles.techRole}>{t.role}</Text>
                    </View>
                    <View style={[styles.availPill, { backgroundColor: t.available ? '#ECFDF5' : '#FEF2F2' }]}>
                      <View style={[styles.availDot, { backgroundColor: t.available ? SUCCESS : DANGER }]} />
                      <Text style={[styles.availText, { color: t.available ? SUCCESS : DANGER }]}>
                        {t.available ? 'Free' : 'Busy'}
                      </Text>
                    </View>
                    {active && <Feather name="check-circle" size={20} color={PRIMARY} style={{ marginLeft: 6 }} />}
                  </TouchableOpacity>
                );
              })}
            </StepCard>

            <StepCard icon="clock" title="Labour & Timeline" iconBg="#FFFBEB" iconFg={WARNING}>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Est. Hours"
                    value={estHours}
                    onChangeText={setEstHours}
                    placeholder="2"
                    keyboardType="decimal-pad"
                    leadingIcon="clock"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Labour Charge (₹)"
                    value={labourCharge}
                    onChangeText={setLabourCharge}
                    placeholder="500"
                    keyboardType="number-pad"
                    leadingIcon="dollar-sign"
                  />
                </View>
              </View>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Expected Date"
                    value={deliveryDate}
                    onChangeText={setDeliveryDate}
                    placeholder="DD-MM-YYYY"
                    leadingIcon="calendar"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Expected Time"
                    value={deliveryTime}
                    onChangeText={setDeliveryTime}
                    placeholder="05:00 PM"
                    leadingIcon="clock"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Notes to Technician</Text>
              <View style={[styles.textAreaWrap, { marginBottom: 0 }]}>
                <TextInput
                  style={[styles.textArea, { minHeight: 72 }]}
                  value={techNotes}
                  onChangeText={setTechNotes}
                  placeholder="Special instructions or warnings…"
                  placeholderTextColor="#94A3B8"
                  multiline numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </StepCard>
          </>
        )}

        {/* ═══════════════ STEP 4 — Review ═══════════════ */}
        {step === 4 && (
          <>
            {/* Customer */}
            <StepCard icon="user" title="Customer & Vehicle">
              <ReviewRow label="Customer"     value={customerName} />
              <ReviewRow label="Mobile"       value={customerPhone ? `+91 ${customerPhone}` : null} />
              <ReviewRow label="Registration" value={regNumber} />
              <ReviewRow label="Vehicle"      value={[brand, model].filter(Boolean).join(' ')} />
              <ReviewRow label="Fuel Type"    value={fuelType} />
              <ReviewRow label="Odometer"     value={odometer ? `${odometer} km` : null} last />
            </StepCard>

            {/* Inspection */}
            <StepCard icon="clipboard" title="Inspection" iconBg="#FFF7ED" iconFg="#F97316">
              <ReviewRow label="Fuel Level"  value={fuelLevel} />
              {INSPECTION_ITEMS.filter(i => inspection[i.key]).map((item, idx, arr) => (
                <ReviewRow
                  key={item.key}
                  label={item.label}
                  value={inspection[item.key] === 'ok' ? '✓ OK' : inspection[item.key] === 'issue' ? '⚠ Issue' : '— N/A'}
                  valueColor={inspection[item.key] === 'ok' ? SUCCESS : inspection[item.key] === 'issue' ? DANGER : MUTED}
                  last={idx === arr.length - 1 && !complaint}
                />
              ))}
              {complaint ? <ReviewRow label="Complaint" value={complaint} last /> : null}
            </StepCard>

            {/* Services */}
            {services.length > 0 && (
              <StepCard icon="tool" title="Services" iconBg="#F0FDF4" iconFg={SUCCESS}>
                {services.map((s, i) => (
                  <ReviewRow
                    key={i}
                    label={`${s.name}${s.qty > 1 ? ` ×${s.qty}` : ''}`}
                    value={formatCurrency(s.price * s.qty)}
                    valueColor={PRIMARY}
                    last={i === services.length - 1}
                  />
                ))}
              </StepCard>
            )}

            {/* Technician */}
            {selectedTechName ? (
              <StepCard icon="users" title="Technician" iconBg="#F5F3FF" iconFg="#7C3AED">
                <ReviewRow label="Assigned to" value={selectedTechName} />
                <ReviewRow label="Est. Hours"  value={estHours ? `${estHours}h` : null} />
                {deliveryDate ? <ReviewRow label="Delivery" value={`${deliveryDate}${deliveryTime ? ' · ' + deliveryTime : ''}`} last /> : null}
              </StepCard>
            ) : null}

            {/* Grand total */}
            <View style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Services</Text>
                <Text style={styles.totalRowValue}>{formatCurrency(servicesTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Labour</Text>
                <Text style={styles.totalRowValue}>{formatCurrency(labourTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>Subtotal</Text>
                <Text style={styles.totalRowValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalRowLabel}>GST (18%)</Text>
                <Text style={styles.totalRowValue}>{formatCurrency(gst)}</Text>
              </View>
              <View style={styles.totalDivider} />
              <View style={styles.grandRow}>
                <Text style={styles.grandLabel}>Estimated Total</Text>
                <Text style={styles.grandValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Sticky footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.footerBack} onPress={handleBack} activeOpacity={0.8}>
            <Feather name="arrow-left" size={16} color={TEXT} />
            <Text style={styles.footerBackText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.footerNext, isPending && { opacity: 0.65 }]}
          onPress={handleNext}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : step === 4 ? (
            <><Feather name="check-circle" size={16} color="#fff" /><Text style={styles.footerNextText}>Create Job Card</Text></>
          ) : (
            <><Text style={styles.footerNextText}>Continue</Text><Feather name="arrow-right" size={16} color="#fff" /></>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ── Review row helper ── */
function ReviewRow({ label, value, valueColor, last }: {
  label: string; value?: string | null; valueColor?: string; last?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={[rr.row, !last && rr.border]}>
      <Text style={rr.label}>{label}</Text>
      <Text style={[rr.value, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}
const rr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  border:{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  label: { fontSize: 13, color: MUTED, flex: 1 },
  value: { fontSize: 13, color: TEXT, fontWeight: '600', flex: 1.5, textAlign: 'right' },
});

/* ══════════════════════════════════════════════════════════════════════ */
/* STYLES                                                                 */
/* ══════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    backgroundColor: CARD,
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 4 }, default: {},
    }),
  },
  headerRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  stepMeta:  { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  stepSub:   { fontSize: 12, color: MUTED, marginTop: 2 },
  pctBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: '#EEF2FF', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
    alignSelf: 'flex-start',
  },
  pctText: { fontSize: 13, fontWeight: '800', color: PRIMARY },

  progressTrack: {
    height: 5, backgroundColor: '#E2E8F0',
    borderRadius: 3, marginBottom: 14, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0' },
  stepLineDone: { backgroundColor: PRIMARY },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD,
  },
  stepCircleActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  stepCircleDone:   { backgroundColor: SUCCESS, borderColor: SUCCESS },
  stepNum:          { fontSize: 11, fontWeight: '700', color: MUTED },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 16 },

  /* Form helpers */
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 4 },
  twoCol: { flexDirection: 'row', gap: 10 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: BG,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipQuick:  { backgroundColor: '#EEF2FF', borderColor: 'rgba(37,99,235,0.3)' },
  chipText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff' },

  textAreaWrap: {
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER, marginBottom: 14,
  },
  textArea: { padding: 14, fontSize: 14, color: TEXT, minHeight: 96, textAlignVertical: 'top' },

  /* Fuel gauge */
  fuelBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  fuelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD, alignItems: 'center',
  },
  fuelBtnText: { fontSize: 12, fontWeight: '700', color: MUTED },
  gaugeTrack: {
    height: 8, backgroundColor: '#E2E8F0',
    borderRadius: 4, overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: 4 },

  /* Inspection */
  inspLegend: { fontSize: 11, fontWeight: '600', marginBottom: 10 },
  inspRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  inspLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  inspLabel: { fontSize: 13, fontWeight: '600', color: TEXT },
  inspBtns: { flexDirection: 'row', gap: 6 },
  inspBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1.5, borderColor: '#CBD5E1',
  },
  inspBtnText: { fontSize: 11, fontWeight: '700', color: MUTED },

  /* Services */
  svcSearchRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  svcSearchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, height: 50,
  },
  svcSearchInput: { flex: 1, fontSize: 14, color: TEXT },
  addSvcBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
  },

  svcRow: { paddingVertical: 12 },
  svcNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  svcDot: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  svcName: { flex: 1, fontSize: 13, fontWeight: '600', color: TEXT },

  svcControls: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 34 },
  pricePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 10, height: 36, flex: 1,
  },
  priceRupee: { fontSize: 13, color: MUTED, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 13, color: TEXT },

  qtyStepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F1F5F9', borderRadius: 10, overflow: 'hidden',
  },
  qtyBtn: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  qtyVal: { paddingHorizontal: 10, fontSize: 13, fontWeight: '700', color: TEXT },

  svcTotal: { fontSize: 14, fontWeight: '800', color: PRIMARY, minWidth: 60, textAlign: 'right' },
  divider:  { height: 1, backgroundColor: '#F1F5F9' },
  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 12, marginTop: 6, borderTopWidth: 1.5, borderTopColor: '#E2E8F0',
  },
  subtotalLabel: { fontSize: 13, fontWeight: '700', color: TEXT },
  subtotalValue: { fontSize: 16, fontWeight: '800', color: PRIMARY },

  /* Technician */
  techCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F8FAFC',
  },
  techCardActive: { backgroundColor: '#EEF2FF', borderColor: 'rgba(37,99,235,0.4)' },
  techAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  techAvatarText: { fontSize: 18, fontWeight: '800', color: MUTED },
  techName: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 2 },
  techRole: { fontSize: 12, color: MUTED },
  availPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
  },
  availDot:  { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: '700' },

  /* Review / totals */
  totalCard: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 }, default: {},
    }),
  },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalRowLabel: { fontSize: 13, color: MUTED },
  totalRowValue: { fontSize: 13, color: TEXT, fontWeight: '600' },
  totalDivider:  { height: 1.5, backgroundColor: '#E2E8F0', marginVertical: 10 },
  grandRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel: { fontSize: 16, fontWeight: '800', color: TEXT },
  grandValue: { fontSize: 22, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },

  /* Footer */
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 14,
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 8 }, default: {},
    }),
  },
  footerBack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: BG,
  },
  footerBackText: { fontSize: 14, fontWeight: '600', color: TEXT },
  footerNext: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 }, default: {},
    }),
  },
  footerNextText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Success screen */
  successWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 0,
  },
  successIcon: {
    width: 88, height: 88, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 12 }, default: {},
    }),
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: TEXT, marginBottom: 8 },
  successSub:   { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  successChipRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  successChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: '#EEF2FF', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(37,99,235,0.2)',
  },
  successChipText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  successActions:  { width: '100%', gap: 10, marginTop: 28 },
  successViewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 }, default: {},
    }),
  },
  successViewText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successBackBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: BG,
  },
  successBackText: { fontSize: 15, fontWeight: '600', color: TEXT },
});
