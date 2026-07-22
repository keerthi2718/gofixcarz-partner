import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import JobService from '@/src/services/job.service';
import InputField from '@/src/components/ui/InputField';
import { formatCurrency } from '@/src/utils/helpers';

/* ── Design tokens ── */
const BG      = '#EEEEF6';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const INDIGO  = '#6366F1';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';
const DANGER  = '#EF4444';

const STEPS = [
  { label: 'Customer', icon: 'user'      as const },
  { label: 'Inspect',  icon: 'clipboard' as const },
  { label: 'Services', icon: 'tool'      as const },
  { label: 'Labour',   icon: 'users'     as const },
  { label: 'Progress', icon: 'activity'  as const },
  { label: 'Invoice',  icon: 'file-text' as const },
];

const FUEL_LEVELS  = ['E', '1/4', '1/2', '3/4', 'F'];
const FUEL_TYPES   = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

type ServiceItem = { name: string; price: number; qty: number };

/* ── Reusable step section card ── */
function StepCard({ icon, title, children, iconBg = '#EEF2FF', iconFg = PRIMARY }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  children: React.ReactNode;
  iconBg?: string;
  iconFg?: string;
}) {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={16} color={iconFg} />
        </View>
        <Text style={cardStyles.title}>{title}</Text>
      </View>
      <View style={cardStyles.body}>{children}</View>
    </View>
  );
}
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 14,
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
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: TEXT },
  body:  { padding: 18 },
});

/* ── Inline label (replaces raw fieldLabel pattern) ── */
function FieldLabel({ text }: { text: string }) {
  const hasAsterisk = text.endsWith(' *');
  const base = hasAsterisk ? text.slice(0, -2) : text;
  return (
    <Text style={styles.fieldLabel}>
      {base}
      {hasAsterisk && <Text style={{ color: DANGER }}> *</Text>}
    </Text>
  );
}

/* ── Main screen ── */
export default function CreateJobScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const [step, setStep] = useState(0);

  /* Step 0 — Customer & Vehicle */
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [regNumber,     setRegNumber]     = useState('');
  const [brand,         setBrand]         = useState('');
  const [model,         setModel]         = useState('');
  const [fuelType,      setFuelType]      = useState('Petrol');
  const [odometer,      setOdometer]      = useState('');

  /* Step 1 — Inspection */
  const [fuelLevel,       setFuelLevel]       = useState('1/2');
  const [complaint,       setComplaint]       = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');

  /* Step 2 — Services */
  const [serviceSearch, setServiceSearch] = useState('');
  const [services,      setServices]      = useState<ServiceItem[]>([]);

  /* Step 3 — Labour */
  const [selectedTechId,   setSelectedTechId]   = useState<string | null>(null);
  const [selectedTechName, setSelectedTechName] = useState('');
  const [estHours,         setEstHours]         = useState('');
  const [labourCharge,     setLabourCharge]     = useState('');
  const [deliveryDate,     setDeliveryDate]     = useState('');
  const [deliveryTime,     setDeliveryTime]     = useState('');
  const [additionalNotes,  setAdditionalNotes]  = useState('');

  /* Step 4/5 — created job */
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const mockTechs = [
    { id: 't1', name: 'Suresh Kumar', role: 'Senior Mechanic',  available: true },
    { id: 't2', name: 'Mahesh Reddy', role: 'Electrician',      available: true },
    { id: 't3', name: 'Ganesh Patel', role: 'AC Specialist',    available: false },
  ];

  const servicesTotal = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const labourTotal   = parseFloat(labourCharge) || 0;
  const subtotal      = servicesTotal + labourTotal;
  const gst           = subtotal * 0.18;
  const grandTotal    = subtotal + gst;

  const { mutate: createJob, isPending } = useMutation({
    mutationFn: () => JobService.create({
      customer_name:       customerName  || null,
      customer_mobile:     customerPhone || null,
      registration_number: regNumber     || null,
      brand:               brand         || null,
      vehicle_model:       model         || null,
      fuel_type:           fuelType      || null,
      odometer_km:         parseFloat(odometer) || null,
      description: [
        complaint       && `Complaint: ${complaint}`,
        inspectionNotes && `Notes: ${inspectionNotes}`,
        additionalNotes,
      ].filter(Boolean).join('\n') || null,
      estimated_amount: grandTotal || null,
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
    if (step === 0) return !!(customerName.trim() && regNumber.trim() && brand.trim() && model.trim());
    if (step === 1) return !!complaint.trim();
    if (step === 2) return services.length > 0;
    if (step === 3) return !!selectedTechId;
    return true;
  }

  function handleNext() {
    if (step === 3) { createJob(); return; }
    if (step < 5)   setStep(s => s + 1);
  }
  function handleBack() {
    if (step === 0) { router.back(); return; }
    setStep(s => s - 1);
  }

  const nextLabel =
    step === 3 ? 'Create Job Card' :
    step === 5 ? 'Done ✓'         : 'Continue';

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: BG }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Feather name="arrow-left" size={18} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepMeta}>Step {step + 1} of {STEPS.length}</Text>
          <Text style={styles.stepHeading}>{STEPS[step].label}</Text>
        </View>
        {/* Step progress pill */}
        <View style={styles.progressPill}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      {/* ── Stepper ── */}
      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && (
              <View style={[styles.stepLine, i <= step && styles.stepLineDone]} />
            )}
            <View style={styles.stepNode}>
              <View style={[
                styles.stepCircle,
                i < step  && styles.stepCircleDone,
                i === step && styles.stepCircleActive,
              ]}>
                {i < step
                  ? <Feather name="check" size={11} color="#fff" />
                  : <Feather name={s.icon} size={11} color={i === step ? '#fff' : MUTED} />
                }
              </View>
              <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>
                {s.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════ */}
        {/* STEP 0 — Customer & Vehicle               */}
        {/* ══════════════════════════════════════════ */}
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
                maxLength={10}
              />
            </StepCard>

            <StepCard icon="truck" title="Vehicle Details" iconBg="#FFF7ED" iconFg="#F97316">
              <InputField
                label="Registration Number *"
                value={regNumber}
                onChangeText={setRegNumber}
                placeholder="KA-01-AB-1234"
                autoCapitalize="characters"
                leadingIcon="hash"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Brand *"
                    value={brand}
                    onChangeText={setBrand}
                    placeholder="Honda"
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Model *"
                    value={model}
                    onChangeText={setModel}
                    placeholder="City"
                  />
                </View>
              </View>
              <FieldLabel text="Fuel Type" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                style={{ marginBottom: 14 }}
              >
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
              </ScrollView>
              <InputField
                label="Odometer (km)"
                value={odometer}
                onChangeText={setOdometer}
                placeholder="45230"
                keyboardType="number-pad"
                leadingIcon="navigation"
              />
            </StepCard>
          </>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* STEP 1 — Vehicle Inspection               */}
        {/* ══════════════════════════════════════════ */}
        {step === 1 && (
          <>
            <StepCard icon="droplet" title="Fuel Level" iconBg="#FFF7ED" iconFg="#F97316">
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
              {/* Visual fuel gauge */}
              <View style={styles.gaugeTrack}>
                <View style={[
                  styles.gaugeFill,
                  {
                    width: `${(['E','1/4','1/2','3/4','F'].indexOf(fuelLevel) + 1) / 5 * 100}%`,
                    backgroundColor: fuelLevel === 'E' ? DANGER : fuelLevel === '1/4' ? '#F59E0B' : SUCCESS,
                  },
                ]} />
              </View>
            </StepCard>

            <StepCard icon="clipboard" title="Inspection Details">
              <FieldLabel text="Customer Complaint *" />
              <View style={styles.textAreaWrap}>
                <TextInput
                  style={styles.textArea}
                  value={complaint}
                  onChangeText={setComplaint}
                  placeholder="Describe the issue reported by the customer…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <FieldLabel text="Inspection Notes" />
              <View style={[styles.textAreaWrap, { marginBottom: 0 }]}>
                <TextInput
                  style={[styles.textArea, { minHeight: 72 }]}
                  value={inspectionNotes}
                  onChangeText={setInspectionNotes}
                  placeholder="Any additional observations…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </StepCard>

            <StepCard icon="camera" title="Before Service Photos" iconBg="#F0FDF4" iconFg={SUCCESS}>
              <View style={styles.photoRow}>
                {['Front', 'Rear', 'Side'].map(p => (
                  <View key={p} style={styles.photoBox}>
                    <View style={styles.photoIconWrap}>
                      <Feather name="camera" size={18} color={MUTED} />
                    </View>
                    <Text style={styles.photoLabel}>{p}</Text>
                  </View>
                ))}
                <TouchableOpacity style={[styles.photoBox, styles.photoBoxAdd]} activeOpacity={0.8}>
                  <View style={styles.photoAddWrap}>
                    <Feather name="plus" size={18} color={PRIMARY} />
                  </View>
                  <Text style={[styles.photoLabel, { color: PRIMARY }]}>Add</Text>
                </TouchableOpacity>
              </View>
            </StepCard>
          </>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* STEP 2 — Services                         */}
        {/* ══════════════════════════════════════════ */}
        {step === 2 && (
          <>
            <StepCard icon="tool" title="Add Services">
              <View style={styles.serviceSearchRow}>
                <View style={styles.serviceSearchInput}>
                  <Feather name="search" size={15} color={MUTED} />
                  <TextInput
                    style={styles.serviceSearchText}
                    value={serviceSearch}
                    onChangeText={setServiceSearch}
                    placeholder="Search or type a service…"
                    placeholderTextColor="#94A3B8"
                    onSubmitEditing={addService}
                    returnKeyType="done"
                  />
                </View>
                <TouchableOpacity style={styles.addServiceBtn} onPress={addService} activeOpacity={0.85}>
                  <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Quick service suggestions */}
              <Text style={styles.suggestLabel}>Quick add</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              >
                {['Oil Change', 'AC Service', 'Wheel Alignment', 'Brake Service', 'Battery Check'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestChip}
                    onPress={() => {
                      setServices(prev => [...prev, { name: s, price: 0, qty: 1 }]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={11} color={PRIMARY} />
                    <Text style={styles.suggestChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </StepCard>

            {services.length > 0 && (
              <StepCard icon="list" title={`Services Added (${services.length})`} iconBg="#F0FDF4" iconFg={SUCCESS}>
                {services.map((svc, i) => (
                  <View key={i} style={[styles.serviceItem, i < services.length - 1 && { marginBottom: 12 }]}>
                    {/* Service name + price input */}
                    <View style={styles.serviceTop}>
                      <View style={styles.serviceIconDot}>
                        <Feather name="tool" size={12} color={PRIMARY} />
                      </View>
                      <Text style={styles.serviceItemName} numberOfLines={1}>{svc.name}</Text>
                      <TouchableOpacity onPress={() => removeService(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Feather name="trash-2" size={14} color={DANGER + 'AA'} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.serviceBottom}>
                      {/* Price input */}
                      <View style={styles.priceInputWrap}>
                        <Text style={styles.priceRupee}>₹</Text>
                        <TextInput
                          style={styles.priceInput}
                          value={svc.price > 0 ? String(svc.price) : ''}
                          onChangeText={v => updateServicePrice(i, v)}
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                        />
                      </View>

                      {/* Qty stepper */}
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(i, -1)} activeOpacity={0.8}>
                          <Feather name="minus" size={12} color={TEXT} />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{svc.qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(i, 1)} activeOpacity={0.8}>
                          <Feather name="plus" size={12} color={TEXT} />
                        </TouchableOpacity>
                      </View>

                      {/* Row total */}
                      <Text style={styles.serviceRowTotal}>{formatCurrency(svc.price * svc.qty)}</Text>
                    </View>

                    {i < services.length - 1 && <View style={styles.serviceDivider} />}
                  </View>
                ))}

                {/* Services subtotal */}
                <View style={styles.servicesSummary}>
                  <Text style={styles.servicesSummaryLabel}>Services Total</Text>
                  <Text style={styles.servicesSummaryValue}>{formatCurrency(servicesTotal)}</Text>
                </View>
              </StepCard>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* STEP 3 — Labour & Technician              */}
        {/* ══════════════════════════════════════════ */}
        {step === 3 && (
          <>
            <StepCard icon="users" title="Assign Technician" iconBg="#F5F3FF" iconFg="#7C3AED">
              {mockTechs.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.techCard, selectedTechId === t.id && styles.techCardActive]}
                  onPress={() => { setSelectedTechId(t.id); setSelectedTechName(t.name); }}
                  activeOpacity={0.85}
                >
                  {/* Avatar */}
                  <View style={[styles.techAvatar, selectedTechId === t.id && { backgroundColor: PRIMARY }]}>
                    <Text style={[styles.techAvatarText, selectedTechId === t.id && { color: '#fff' }]}>
                      {t.name.charAt(0)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.techName}>{t.name}</Text>
                    <Text style={styles.techRole}>{t.role}</Text>
                  </View>

                  {/* Available badge */}
                  <View style={[styles.availBadge, { backgroundColor: t.available ? '#ECFDF5' : '#FEF2F2' }]}>
                    <View style={[styles.availDot, { backgroundColor: t.available ? SUCCESS : DANGER }]} />
                    <Text style={[styles.availText, { color: t.available ? SUCCESS : DANGER }]}>
                      {t.available ? 'Free' : 'Busy'}
                    </Text>
                  </View>

                  {selectedTechId === t.id && (
                    <View style={styles.techCheckWrap}>
                      <Feather name="check-circle" size={18} color={PRIMARY} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </StepCard>

            <StepCard icon="clock" title="Labour Details">
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Est. Hours"
                    value={estHours}
                    onChangeText={setEstHours}
                    placeholder="2"
                    keyboardType="number-pad"
                    leadingIcon="clock"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Labour Charge"
                    value={labourCharge}
                    onChangeText={setLabourCharge}
                    placeholder="₹ 500"
                    keyboardType="number-pad"
                    leadingIcon="dollar-sign"
                  />
                </View>
              </View>
            </StepCard>

            <StepCard icon="calendar" title="Expected Delivery" iconBg="#FFF7ED" iconFg="#F97316">
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Date"
                    value={deliveryDate}
                    onChangeText={setDeliveryDate}
                    placeholder="DD-MM-YYYY"
                    leadingIcon="calendar"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField
                    label="Time"
                    value={deliveryTime}
                    onChangeText={setDeliveryTime}
                    placeholder="05:00 PM"
                    leadingIcon="clock"
                  />
                </View>
              </View>
              <FieldLabel text="Additional Notes" />
              <View style={[styles.textAreaWrap, { marginBottom: 0 }]}>
                <TextInput
                  style={[styles.textArea, { minHeight: 72 }]}
                  value={additionalNotes}
                  onChangeText={setAdditionalNotes}
                  placeholder="Special instructions for the technician…"
                  placeholderTextColor="#94A3B8"
                  multiline numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </StepCard>
          </>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* STEP 4 — Job Progress                     */}
        {/* ══════════════════════════════════════════ */}
        {step === 4 && (
          <>
            <StepCard icon="activity" title="Job Timeline" iconBg="#F0FDF4" iconFg={SUCCESS}>
              {[
                { label: 'Job Created',         desc: 'Job card successfully created', done: true  },
                { label: 'Technician Assigned', desc: selectedTechName || '—',         done: !!selectedTechId },
                { label: 'Work Started',         desc: 'Vehicle under service',         current: true },
                { label: 'Waiting for Parts',    desc: '',                              done: false },
                { label: 'Quality Check',        desc: '',                              done: false },
                { label: 'Ready for Delivery',   desc: '',                              done: false },
                { label: 'Completed',            desc: '',                              done: false },
              ].map((item, i, arr) => (
                <View key={i} style={styles.timelineRow}>
                  {/* Left column */}
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineCircle,
                      (item as any).done    && styles.timelineCircleDone,
                      (item as any).current && styles.timelineCircleCurrent,
                    ]}>
                      {(item as any).done
                        ? <Feather name="check" size={11} color="#fff" />
                        : (item as any).current
                          ? <View style={styles.timelinePulse} />
                          : <Text style={styles.timelineNum}>{i + 1}</Text>
                      }
                    </View>
                    {i < arr.length - 1 && (
                      <View style={[styles.timelineLine, (item as any).done && styles.timelineLineDone]} />
                    )}
                  </View>

                  {/* Content */}
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      !(item as any).done && !(item as any).current && { color: MUTED },
                    ]}>
                      {item.label}
                    </Text>
                    {item.desc ? <Text style={styles.timelineDesc}>{item.desc}</Text> : null}
                    {(item as any).current && (
                      <View style={styles.currentBadge}>
                        <View style={styles.currentDot} />
                        <Text style={styles.currentBadgeText}>In Progress</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </StepCard>

            <StepCard icon="zap" title="Advance Status" iconBg="#EEF2FF" iconFg={INDIGO}>
              <View style={styles.stageGrid}>
                {[
                  { label: 'Waiting for Parts', color: '#F59E0B', bg: '#FFFBEB' },
                  { label: 'Quality Check',     color: INDIGO,    bg: '#EEF2FF' },
                  { label: 'Ready',             color: SUCCESS,   bg: '#ECFDF5' },
                  { label: 'Completed',         color: '#059669', bg: '#D1FAE5' },
                ].map(s => (
                  <TouchableOpacity
                    key={s.label}
                    style={[styles.stageBtn, { backgroundColor: s.bg, borderColor: s.color + '40' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.stageBtnText, { color: s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </StepCard>
          </>
        )}

        {/* ══════════════════════════════════════════ */}
        {/* STEP 5 — Final Invoice                    */}
        {/* ══════════════════════════════════════════ */}
        {step === 5 && (
          <>
            {/* Invoice header card */}
            <LinearGradient
              colors={['#4F46E5', '#2563EB', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.invoiceHero}
            >
              <View style={styles.invoiceHeroCircle} />
              <View style={styles.invoiceHeroTop}>
                <View>
                  <Text style={styles.invoiceBrand}>GoFixAuto</Text>
                  <Text style={styles.invoiceTagline}>Smart Garage Management</Text>
                </View>
                <View style={styles.invoiceNumWrap}>
                  <Text style={styles.invoiceNumLabel}>INVOICE</Text>
                  <Text style={styles.invoiceNum}>INV-{Date.now().toString().slice(-4)}</Text>
                </View>
              </View>
              <View style={styles.invoiceMeta}>
                <View style={styles.invoiceMetaRow}>
                  <Feather name="user"     size={11} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.invoiceMetaText}>{customerName || '—'}</Text>
                </View>
                <View style={styles.invoiceMetaRow}>
                  <Feather name="hash"     size={11} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.invoiceMetaText}>{regNumber || '—'}</Text>
                </View>
                <View style={styles.invoiceMetaRow}>
                  <Feather name="calendar" size={11} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.invoiceMetaText}>
                    {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Services line items */}
            {services.length > 0 && (
              <StepCard icon="tool" title="Services">
                {services.map((s, i) => (
                  <View key={i} style={[styles.lineItem, i < services.length - 1 && { marginBottom: 10 }]}>
                    <Text style={styles.lineItemName}>{s.name} {s.qty > 1 ? `×${s.qty}` : ''}</Text>
                    <Text style={styles.lineItemAmt}>{formatCurrency(s.price * s.qty)}</Text>
                  </View>
                ))}
              </StepCard>
            )}

            {/* Labour */}
            {labourTotal > 0 && (
              <StepCard icon="users" title="Labour" iconBg="#F5F3FF" iconFg="#7C3AED">
                <View style={styles.lineItem}>
                  <Text style={styles.lineItemName}>Labour Charge{estHours ? ` (${estHours}h)` : ''}</Text>
                  <Text style={styles.lineItemAmt}>{formatCurrency(labourTotal)}</Text>
                </View>
              </StepCard>
            )}

            {/* Totals */}
            <View style={styles.totalsCard}>
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
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.invoiceActions}>
              <TouchableOpacity style={styles.invoiceActionBtn} activeOpacity={0.8}>
                <View style={[styles.invoiceActionIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Feather name="download" size={16} color={PRIMARY} />
                </View>
                <Text style={styles.invoiceActionText}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.invoiceActionBtn} activeOpacity={0.8}>
                <View style={[styles.invoiceActionIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Feather name="share-2" size={16} color={SUCCESS} />
                </View>
                <Text style={styles.invoiceActionText}>Share Invoice</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.footerBack} onPress={handleBack} activeOpacity={0.8}>
            <Feather name="arrow-left" size={16} color={TEXT} />
            <Text style={styles.footerBackText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.footerNext,
            (!canProceed() || isPending) && { opacity: 0.55 },
            step === 5 && { backgroundColor: SUCCESS },
          ]}
          onPress={step === 5 ? () => router.replace('/(tabs)/jobs') : handleNext}
          disabled={(!canProceed() || isPending) && step < 5}
          activeOpacity={0.85}
        >
          {isPending
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Text style={styles.footerNextText}>{nextLabel}</Text>
                {step < 5 && <Feather name="arrow-right" size={16} color="#fff" />}
                {step === 5 && <Feather name="check" size={16} color="#fff" />}
              </>
            )
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* ── Header ── */
  topBar: {
    paddingHorizontal: 20, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
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
  stepMeta:    { fontSize: 11, color: MUTED, fontWeight: '500', letterSpacing: 0.2 },
  stepHeading: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  progressPill: {
    position: 'absolute', bottom: 0, left: 20, right: 20,
    height: 3, borderRadius: 2, backgroundColor: '#E2E8F0', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 2 },

  /* ── Stepper ── */
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  stepLine:     { flex: 1, height: 1.5, backgroundColor: '#E2E8F0' },
  stepLineDone: { backgroundColor: SUCCESS },
  stepNode:     { alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#CBD5E1',
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleDone:   { backgroundColor: SUCCESS, borderColor: SUCCESS },
  stepCircleActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  stepLabel:        { fontSize: 9, color: MUTED, fontWeight: '500', letterSpacing: 0.1 },
  stepLabelActive:  { color: PRIMARY, fontWeight: '700' },

  /* ── Body ── */
  body: { padding: 20 },

  /* ── Field label ── */
  fieldLabel: {
    fontSize: 15, fontWeight: '600', color: '#475569',
    marginBottom: 8,
  },

  /* ── Layout helpers ── */
  row: { flexDirection: 'row', gap: 10 },

  /* ── Chips ── */
  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD,
  },
  chipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff' },

  /* ── Textarea ── */
  textAreaWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    marginBottom: 14, overflow: 'hidden',
  },
  textArea: {
    padding: 14, fontSize: 15, color: TEXT,
    minHeight: 100, textAlignVertical: 'top',
  },

  /* ── Fuel level ── */
  fuelRow:    { flexDirection: 'row', gap: 8, marginBottom: 12 },
  fuelBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD, alignItems: 'center',
  },
  fuelBtnActive:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  fuelText:       { fontSize: 12, fontWeight: '700', color: MUTED },
  fuelTextActive: { color: '#fff' },
  gaugeTrack: {
    height: 6, borderRadius: 4,
    backgroundColor: '#F1F5F9', overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: 4 },

  /* ── Photo placeholders ── */
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBox: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16,
    borderRadius: 14, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#F8FAFC',
  },
  photoIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  photoBoxAdd:  { borderStyle: 'dashed', borderColor: PRIMARY + '80' },
  photoAddWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  photoLabel: { fontSize: 10, color: MUTED, fontWeight: '500' },

  /* ── Service search ── */
  serviceSearchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  serviceSearchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 50,
  },
  serviceSearchText: { flex: 1, fontSize: 15, color: TEXT },
  addServiceBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  suggestLabel: { fontSize: 11, fontWeight: '600', color: MUTED, letterSpacing: 0.4, marginBottom: 8 },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: PRIMARY + '40',
    backgroundColor: '#EEF2FF',
  },
  suggestChipText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  /* ── Service items ── */
  serviceItem: { marginBottom: 0 },
  serviceTop: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  serviceIconDot: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  serviceItemName: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },
  serviceBottom: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 36,
  },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10, paddingVertical: 6, flex: 1,
  },
  priceRupee: { fontSize: 13, color: MUTED, fontWeight: '600' },
  priceInput: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT, paddingVertical: 0 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 9,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyValue: { fontSize: 14, fontWeight: '700', color: TEXT, minWidth: 22, textAlign: 'center' },
  serviceRowTotal: { fontSize: 14, fontWeight: '700', color: PRIMARY, minWidth: 64, textAlign: 'right' },
  serviceDivider:  { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  servicesSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1.5, borderTopColor: '#F1F5F9',
  },
  servicesSummaryLabel: { fontSize: 13, fontWeight: '700', color: TEXT },
  servicesSummaryValue: { fontSize: 16, fontWeight: '800', color: PRIMARY },

  /* ── Technician cards ── */
  techCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#F8FAFC', marginBottom: 10,
  },
  techCardActive: {
    borderColor: PRIMARY,
    backgroundColor: '#EEF2FF',
  },
  techAvatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  techAvatarText: { fontSize: 18, fontWeight: '700', color: TEXT },
  techName:  { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  techRole:  { fontSize: 12, color: MUTED },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
  },
  availDot:  { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: '600' },
  techCheckWrap: { marginLeft: 4 },

  /* ── Timeline ── */
  timelineRow: { flexDirection: 'row', gap: 14, marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 30 },
  timelineCircle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: '#CBD5E1',
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  timelineCircleDone:    { backgroundColor: SUCCESS, borderColor: SUCCESS },
  timelineCircleCurrent: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  timelinePulse: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff',
  },
  timelineLine:     { width: 1.5, flex: 1, backgroundColor: '#E2E8F0', minHeight: 24 },
  timelineLineDone: { backgroundColor: SUCCESS },
  timelineNum:      { fontSize: 10, fontWeight: '700', color: MUTED },
  timelineContent:  { flex: 1, paddingBottom: 24, paddingTop: 6 },
  timelineLabel:    { fontSize: 14, fontWeight: '600', color: TEXT },
  timelineDesc:     { fontSize: 12, color: MUTED, marginTop: 2 },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  currentDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: PRIMARY },

  /* ── Stage grid ── */
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stageBtn: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
  },
  stageBtnText: { fontSize: 12, fontWeight: '700' },

  /* ── Invoice ── */
  invoiceHero: {
    borderRadius: 22, padding: 22, marginBottom: 14, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: INDIGO, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 18 },
      android: { elevation: 10 },
      default: {},
    }),
  },
  invoiceHeroCircle: {
    position: 'absolute', top: -40, right: -40,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  invoiceHeroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  invoiceBrand:   { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  invoiceTagline: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  invoiceNumWrap: { alignItems: 'flex-end' },
  invoiceNumLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 },
  invoiceNum:     { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 2 },
  invoiceMeta:    { gap: 5 },
  invoiceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  invoiceMetaText:{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  /* ── Line items ── */
  lineItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemName: { fontSize: 13, color: TEXT, flex: 1 },
  lineItemAmt:  { fontSize: 13, fontWeight: '600', color: PRIMARY },

  /* ── Totals card ── */
  totalsCard: {
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 14, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRowLabel: { fontSize: 13, color: MUTED },
  totalRowValue: { fontSize: 13, fontWeight: '600', color: TEXT },
  grandTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1.5, borderTopColor: '#F1F5F9', paddingTop: 12, marginTop: 2,
  },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: TEXT },
  grandTotalValue: { fontSize: 22, fontWeight: '800', color: PRIMARY },

  /* ── Invoice actions ── */
  invoiceActions: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  invoiceActionBtn: {
    flex: 1, backgroundColor: CARD,
    borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  invoiceActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  invoiceActionText: { fontSize: 12, fontWeight: '600', color: TEXT },

  /* ── Footer ── */
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    backgroundColor: CARD,
    borderTopWidth: 1, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 8 },
      default: {},
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
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerNextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
