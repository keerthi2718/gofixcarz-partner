import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import JobService from '@/src/services/job.service';
import InputField from '@/src/components/ui/InputField';
import SelectDropdown from '@/src/components/ui/SelectDropdown';
import { VEHICLE_BRANDS, getModelsForBrand } from '@/src/data/vehicleData';
import { formatCurrency } from '@/src/utils/helpers';

/* ── Design tokens ── */
const BG      = '#F5F6F8';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const INDIGO  = '#6366F1';
const TEXT    = '#111827';
const MUTED   = '#6B7280';
const BORDER  = '#E5E7EB';
const SUCCESS = '#059669';
const DANGER  = '#DC2626';
const WARN    = '#D97706';

const STEPS = [
  { label: 'Customer' },
  { label: 'Inspect'  },
  { label: 'Services' },
  { label: 'Labour'   },
  { label: 'Progress' },
  { label: 'Invoice'  },
];

const FUEL_LEVELS = ['E', '1/4', '1/2', '3/4', 'F'];
const FUEL_TYPES  = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

type ServiceItem = { name: string; price: number; qty: number };
type PhotoItem   = { uri: string; name?: string };
type DocItem     = { uri: string; name: string; mimeType?: string };

/* ── Reusable step section card ── */
function StepCard({ icon, title, children, iconBg = '#FEE2E2', iconFg = PRIMARY }: {
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
          <Feather name={icon} size={14} color={iconFg} />
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '700', color: TEXT, letterSpacing: -0.1 },
  body:  { padding: 16 },
});

/* ── Inline label ── */
function FieldLabel({ text }: { text: string }) {
  const hasAsterisk = text.endsWith(' *');
  const base = hasAsterisk ? text.slice(0, -2) : text;
  return (
    <Text style={styles.fieldLabel}>
      {base.toUpperCase()}
      {hasAsterisk && <Text style={{ color: DANGER }}> *</Text>}
    </Text>
  );
}

/* ── Inline error message ── */
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <View style={styles.fieldError}>
      <Feather name="alert-circle" size={12} color={DANGER} />
      <Text style={styles.fieldErrorText}>{msg}</Text>
    </View>
  );
}

/* ── Main screen ── */
export default function CreateJobScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const scrollRef = useRef<ScrollView>(null);

  const [step,        setStep]       = useState(0);
  const [errors,      setErrors]     = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [pdfLoading,  setPdfLoading]  = useState<'download' | 'share' | null>(null);

  // Stable invoice number for this session
  const invoiceNum = useRef(`INV-${Date.now().toString().slice(-6)}`).current;

  /* Step 0 — Customer & Vehicle */
  const [customerName,    setCustomerName]    = useState('');
  const [customerPhone,   setCustomerPhone]   = useState('');
  const [regNumber,      setRegNumber]      = useState('');
  const [brand,          setBrand]          = useState('');
  const [model,          setModel]          = useState('');
  const [fuelType,       setFuelType]       = useState('Petrol');
  const [odometer,       setOdometer]       = useState('');

  /* Step 1 — Inspection */
  const [fuelLevel,       setFuelLevel]       = useState('1/2');
  const [complaint,       setComplaint]       = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [beforePhotos,    setBeforePhotos]    = useState<PhotoItem[]>([]);
  const [documents,       setDocuments]       = useState<DocItem[]>([]);

  /* Step 2 — Services */
  const [serviceSearch, setServiceSearch] = useState('');
  const [services,      setServices]      = useState<ServiceItem[]>([]);

  /* Step 3 — Labour */
  const [selectedTechId,   setSelectedTechId]   = useState<string | null>(null);
  const [selectedTechName, setSelectedTechName] = useState('');
  const [estHours,         setEstHours]         = useState('');
  const [labourCharge,     setLabourCharge]      = useState('');
  const [deliveryDate,     setDeliveryDate]      = useState<Date | null>(null);
  const [deliveryTime,     setDeliveryTime]      = useState<Date | null>(null);
  const [showDatePicker,   setShowDatePicker]    = useState(false);
  const [showTimePicker,   setShowTimePicker]    = useState(false);
  const [additionalNotes,  setAdditionalNotes]   = useState('');

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

  /* ── Invoice HTML template ── */
  function buildInvoiceHtml() {
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const dueStr  = deliveryDate
      ? deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';

    const vehicleLabel = [brand, model, fuelType].filter(Boolean).join(' · ') || '—';

    const serviceRows = services.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#FAFAFA' : '#fff'}">
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9;">
          <div style="font-weight:600;color:#1E293B;font-size:13px;">${s.name}</div>
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9; text-align:center;color:#64748B;font-size:13px;">${s.qty}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9; text-align:right;color:#64748B;font-size:13px;">${formatCurrency(s.price)}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9; text-align:right;font-weight:600;color:#1E293B;font-size:13px;">${formatCurrency(s.price * s.qty)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,Helvetica Neue,Arial,sans-serif;color:#1E293B;background:#F8FAFC;font-size:13px;}
  a{color:inherit;text-decoration:none;}

  /* ── Page wrapper ── */
  .page{max-width:680px;margin:0 auto;background:#fff;box-shadow:0 0 0 1px #E2E8F0;}

  /* ── Header band ── */
  .header{background:linear-gradient(135deg,#7B0E20 0%,#C41E3A 55%,#E11D48 100%);padding:36px 36px 28px;color:#fff;}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;}
  .brand-name{font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1;}
  .brand-tag{font-size:11px;font-weight:500;opacity:0.65;margin-top:5px;letter-spacing:0.4px;}
  .inv-block{text-align:right;}
  .inv-word{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;opacity:0.65;margin-bottom:4px;}
  .inv-number{font-size:22px;font-weight:800;letter-spacing:-0.3px;}
  .inv-date{font-size:11px;opacity:0.7;margin-top:4px;}

  /* ── Status pill ── */
  .status-row{margin-top:22px;display:flex;align-items:center;gap:10px;}
  .status-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;color:#fff;letter-spacing:0.3px;}
  .dot{width:6px;height:6px;border-radius:50%;background:#4ADE80;flex-shrink:0;}
  .due-text{font-size:11px;opacity:0.7;}

  /* ── Two-column info grid ── */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #E2E8F0;}
  .info-cell{padding:20px 28px;}
  .info-cell+.info-cell{border-left:1px solid #E2E8F0;}
  .cell-label{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
  .cell-name{font-size:15px;font-weight:700;color:#1E293B;margin-bottom:3px;}
  .cell-sub{font-size:12px;color:#64748B;line-height:1.5;}

  /* ── Section header ── */
  .section-head{padding:16px 28px 12px;border-bottom:2px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;}
  .section-title{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;}

  /* ── Items table ── */
  .items-table{width:100%;border-collapse:collapse;}
  .items-table thead tr{background:#F8FAFC;}
  .items-table thead th{padding:10px 12px;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #E2E8F0;}
  .items-table thead th:first-child{text-align:left;padding-left:28px;}
  .items-table thead th:last-child{padding-right:28px;}
  .items-table tbody tr:last-child td{border-bottom:none;}
  .items-table tbody td:first-child{padding-left:28px;}
  .items-table tbody td:last-child{padding-right:28px;}

  /* ── Labour row ── */
  .labour-row{display:flex;justify-content:space-between;align-items:center;padding:12px 28px;background:#FFFBEB;border-top:1px solid #FEF3C7;border-bottom:1px solid #FEF3C7;}
  .labour-label{font-size:13px;color:#92400E;font-weight:500;}
  .labour-amount{font-size:13px;font-weight:600;color:#92400E;}

  /* ── Totals box ── */
  .totals-wrap{padding:20px 28px 24px;border-top:2px solid #F1F5F9;}
  .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748B;}
  .total-row span:last-child{font-weight:500;color:#475569;}
  .total-divider{border:none;border-top:1px dashed #CBD5E1;margin:12px 0;}
  .grand-row{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:linear-gradient(135deg,#7B0E20,#C41E3A);border-radius:10px;margin-top:4px;}
  .grand-label{color:#fff;font-size:13px;font-weight:600;opacity:0.85;}
  .grand-amount{color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;}

  /* ── Notes ── */
  .notes-block{margin:0 28px 24px;padding:14px 16px;background:#F8FAFC;border-left:3px solid #C41E3A;border-radius:0 6px 6px 0;}
  .notes-label{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
  .notes-text{font-size:12px;color:#475569;line-height:1.6;}

  /* ── Footer ── */
  .footer{background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 28px;display:flex;justify-content:space-between;align-items:center;}
  .footer-brand{font-size:13px;font-weight:700;color:#C41E3A;}
  .footer-right{font-size:11px;color:#94A3B8;text-align:right;}
  .thank-you{font-size:11px;color:#64748B;margin-top:2px;}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-row">
      <div>
        <div class="brand-name">GoFixCarz</div>
        <div class="brand-tag">Smart Garage Management</div>
      </div>
      <div class="inv-block">
        <div class="inv-word">Tax Invoice</div>
        <div class="inv-number">${invoiceNum}</div>
        <div class="inv-date">Issued ${dateStr}</div>
      </div>
    </div>
    <div class="status-row">
      <div class="status-pill"><div class="dot"></div>Due on Delivery</div>
      ${deliveryDate ? `<div class="due-text">Expected: ${dueStr}</div>` : ''}
    </div>
  </div>

  <!-- Bill To / Vehicle -->
  <div class="info-grid">
    <div class="info-cell">
      <div class="cell-label">Bill To</div>
      <div class="cell-name">${customerName || '—'}</div>
      <div class="cell-sub">${customerPhone || ''}</div>
    </div>
    <div class="info-cell">
      <div class="cell-label">Vehicle</div>
      <div class="cell-name">${regNumber || '—'}</div>
      <div class="cell-sub">${vehicleLabel}</div>
    </div>
  </div>

  <!-- Services -->
  ${services.length > 0 ? `
  <div class="section-head">
    <div class="section-title">Services &amp; Parts</div>
    <div style="font-size:11px;color:#94A3B8;">${services.length} item${services.length !== 1 ? 's' : ''}</div>
  </div>
  <table class="items-table">
    <thead>
      <tr>
        <th style="text-align:left;">Description</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>${serviceRows}</tbody>
  </table>` : ''}

  <!-- Labour -->
  ${labourTotal > 0 ? `
  <div class="labour-row">
    <span class="labour-label">&#9881; Labour Charge${estHours ? ` &mdash; ${estHours} hrs estimated` : ''}</span>
    <span class="labour-amount">${formatCurrency(labourTotal)}</span>
  </div>` : ''}

  <!-- Totals -->
  <div class="totals-wrap">
    <div class="total-row"><span>Services Subtotal</span><span>${formatCurrency(servicesTotal)}</span></div>
    ${labourTotal > 0 ? `<div class="total-row"><span>Labour</span><span>${formatCurrency(labourTotal)}</span></div>` : ''}
    <div class="total-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="total-row"><span>GST @ 18%</span><span>${formatCurrency(gst)}</span></div>
    <hr class="total-divider"/>
    <div class="grand-row">
      <span class="grand-label">Grand Total (INR)</span>
      <span class="grand-amount">${formatCurrency(grandTotal)}</span>
    </div>
  </div>

  <!-- Notes -->
  ${additionalNotes ? `
  <div class="notes-block">
    <div class="notes-label">Workshop Notes</div>
    <div class="notes-text">${additionalNotes}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <div class="footer-brand">GoFixCarz Partner</div>
      <div class="thank-you">Thank you for your business!</div>
    </div>
    <div class="footer-right">
      <div>This is a computer-generated invoice.</div>
      <div style="margin-top:2px;">No signature required.</div>
    </div>
  </div>

</div>
</body>
</html>`;
  }

  /* ── PDF actions ── */
  // Download PDF  → native print/preview dialog (iOS: share ▸ Save as PDF; Android: print preview ▸ Save)
  // Share Invoice → share sheet so the user can send via WhatsApp, email, Drive, etc.
  async function handleDownloadPdf() {
    if (pdfLoading) return;
    setPdfLoading('download');
    try {
      await Print.printAsync({ html: buildInvoiceHtml() });
    } catch (e: any) {
      // User cancelled the dialog — not an error worth alerting
      if (!String(e?.message).toLowerCase().includes('cancel')) {
        Alert.alert('Error', e?.message ?? 'Could not open print dialog.');
      }
    } finally {
      setPdfLoading(null);
    }
  }

  async function handleSharePdf() {
    if (pdfLoading) return;
    setPdfLoading('share');
    try {
      const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(), base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${invoiceNum}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Not available', 'Sharing is not supported on this device.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not generate PDF.');
    } finally {
      setPdfLoading(null);
    }
  }


  /* ── Validation ── */
  function validateStep(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!customerName.trim())  errs.customerName  = 'Customer name is required.';
      if (!regNumber.trim())     errs.regNumber     = 'Registration number is required.';
      if (!brand.trim())         errs.brand         = 'Vehicle brand is required.';
      if (!model.trim())         errs.model         = 'Vehicle model is required.';
      if (customerPhone) {
        const digits = customerPhone.replace(/\D/g, '');
        if (digits.length !== 10) errs.customerPhone = 'Mobile number must be exactly 10 digits.';
      }
      if (odometer && parseFloat(odometer) < 0) errs.odometer = 'Odometer must be a positive number.';
    }
    if (step === 1) {
      if (!complaint.trim()) errs.complaint = 'Customer complaint is required.';
    }
    if (step === 2) {
      if (services.length === 0) errs.services = 'Please add at least one service.';
    }
    // Technician is optional – mock IDs are not sent to the API
    return errs;
  }

  function clearFieldError(key: string) {
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  /* ── Navigation ── */
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
      setCreateError(null);
      setCreatedJobId(job?.id ?? null);
      setStep(4);
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Something went wrong. Please try again.';
      setCreateError(msg);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      Alert.alert('Failed to Create Job', msg);
    },
  });

  function handleNext() {
    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setErrors({});
    setCreateError(null);
    if (step === 3) { createJob(); return; }
    if (step < 5) { setStep(s => s + 1); scrollRef.current?.scrollTo({ y: 0, animated: true }); }
  }

  function handleBack() {
    setErrors({});
    if (step === 0) { router.back(); return; }
    setStep(s => s - 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  const nextLabel =
    step === 3 ? 'Create Job Card' :
    step === 5 ? 'Done ✓' : 'Continue';

  /* ── Service helpers ── */
  function addService() {
    if (!serviceSearch.trim()) return;
    setServices(s => [...s, { name: serviceSearch.trim(), price: 0, qty: 1 }]);
    setServiceSearch('');
    clearFieldError('services');
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

  /* ── Camera / Gallery ── */
  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setBeforePhotos(prev => [...prev, { uri: asset.uri, name: `photo_${Date.now()}.jpg` }]);
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map(a => ({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg` }));
      setBeforePhotos(prev => [...prev, ...newPhotos]);
    }
  }

  function removePhoto(idx: number) {
    setBeforePhotos(prev => prev.filter((_, i) => i !== idx));
  }

  /* ── Document upload (via image picker) ── */
  async function pickDocument() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to attach documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (!result.canceled) {
      const newDocs = result.assets.map(a => ({
        uri:      a.uri,
        name:     a.fileName ?? `doc_${Date.now()}.jpg`,
        mimeType: a.mimeType,
      }));
      setDocuments(prev => [...prev, ...newDocs]);
    }
  }

  function removeDocument(idx: number) {
    setDocuments(prev => prev.filter((_, i) => i !== idx));
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
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
        {/* Progress bar */}
        <View style={styles.progressPill}>
          <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>
      </View>

      {/* ── Numbered stepper ── */}
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
                  : <Text style={[styles.stepNum, i === step && { color: '#fff' }]}>{i + 1}</Text>
                }
              </View>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* KAV only wraps the scroll area so footer stays fixed in the flex column */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.body, { paddingBottom: 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 0 — Customer & Vehicle                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 0 && (
          <>
            {/* Customer picker card */}
            <View style={cardStyles.card}>
              <View style={cardStyles.header}>
                <View style={[cardStyles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Feather name="user" size={16} color={PRIMARY} />
                </View>
                <Text style={cardStyles.title}>Customer</Text>
              </View>
              <View style={cardStyles.body}>
                <InputField
                    label="Customer Name *"
                    value={customerName}
                    onChangeText={v => { setCustomerName(v); clearFieldError('customerName'); }}
                    placeholder="Full name"
                    autoCapitalize="words"
                    leadingIcon="user"
                    error={errors.customerName}
                  />
                <InputField
                    label="Phone Number"
                    value={customerPhone}
                    onChangeText={v => {
                      setCustomerPhone(v.replace(/\D/g, '').slice(0, 10));
                      clearFieldError('customerPhone');
                    }}
                    placeholder="10-digit mobile"
                    keyboardType="phone-pad"
                    leadingIcon="phone"
                    prefix="+91"
                    maxLength={10}
                    error={errors.customerPhone}
                  />
              </View>
            </View>

            {/* Vehicle Details */}
            <StepCard icon="truck" title="Vehicle Details" iconBg="#FFF7ED" iconFg="#F97316">
              <InputField
                  label="Registration Number *"
                  value={regNumber}
                  onChangeText={v => { setRegNumber(v); clearFieldError('regNumber'); }}
                  placeholder="KA-01-AB-1234"
                  autoCapitalize="characters"
                  leadingIcon="hash"
                  error={errors.regNumber}
                />
              <SelectDropdown
                label="Vehicle Brand *"
                value={brand}
                onChange={v => {
                  setBrand(v);
                  setModel('');           // clear dependent model
                  clearFieldError('brand');
                  clearFieldError('model');
                }}
                options={VEHICLE_BRANDS}
                placeholder="Select Vehicle Brand"
                error={errors.brand}
                leadingIcon="tag"
              />
              <SelectDropdown
                label="Vehicle Model *"
                value={model}
                onChange={v => { setModel(v); clearFieldError('model'); }}
                options={getModelsForBrand(brand)}
                placeholder={brand ? 'Select Vehicle Model' : 'Select a brand first'}
                disabled={!brand}
                error={errors.model}
                leadingIcon="git-branch"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
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
                </View>
              </View>
              <InputField
                  label="Odometer (km)"
                  value={odometer}
                  onChangeText={v => { setOdometer(v); clearFieldError('odometer'); }}
                  placeholder="45230"
                  keyboardType="number-pad"
                  leadingIcon="navigation"
                  error={errors.odometer}
                />
            </StepCard>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 1 — Vehicle Inspection                            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <>
            {/* Fuel Level */}
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
              <View style={styles.gaugeTrack}>
                <View style={[
                  styles.gaugeFill,
                  {
                    width: `${(['E','1/4','1/2','3/4','F'].indexOf(fuelLevel) + 1) / 5 * 100}%`,
                    backgroundColor: fuelLevel === 'E' ? DANGER : fuelLevel === '1/4' ? WARN : SUCCESS,
                  },
                ]} />
              </View>
            </StepCard>

            {/* Inspection Details */}
            <StepCard icon="clipboard" title="Inspection Details">
              <FieldLabel text="Customer Complaint *" />
              <View style={[styles.textAreaWrap, errors.complaint && styles.textAreaError]}>
                <TextInput
                  style={styles.textArea}
                  value={complaint}
                  onChangeText={v => { setComplaint(v); clearFieldError('complaint'); }}
                  placeholder="Describe the issue reported by the customer…"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              <FieldError msg={errors.complaint} />

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

            {/* Before Service Photos — live camera + gallery */}
            <StepCard icon="camera" title="Before Service Photos" iconBg="#F0FDF4" iconFg={SUCCESS}>
              {/* Action buttons */}
              <View style={styles.photoActionsRow}>
                <TouchableOpacity style={styles.photoActionBtn} onPress={pickFromCamera} activeOpacity={0.85}>
                  <Feather name="camera" size={15} color={PRIMARY} />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionBtn} onPress={pickFromGallery} activeOpacity={0.85}>
                  <Feather name="image" size={15} color={PRIMARY} />
                  <Text style={styles.photoActionText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>

              {/* Photo thumbnails */}
              {beforePhotos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbRow}
                >
                  {beforePhotos.map((p, i) => (
                    <View key={i} style={styles.thumbWrap}>
                      <Image source={{ uri: p.uri }} style={styles.thumb} />
                      <TouchableOpacity
                        style={styles.thumbDelete}
                        onPress={() => removePhoto(i)}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Feather name="x" size={11} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.photoEmptyHint}>
                  <Feather name="image" size={22} color="#CBD5E1" />
                  <Text style={styles.photoEmptyText}>No photos added yet</Text>
                </View>
              )}
              {beforePhotos.length > 0 && (
                <Text style={styles.photoCount}>{beforePhotos.length} photo{beforePhotos.length > 1 ? 's' : ''} added</Text>
              )}
            </StepCard>

            {/* Documents */}
            <StepCard icon="file-text" title="Attach Documents" iconBg="#FFF7ED" iconFg={WARN}>
              <Text style={styles.docHint}>RC Book, Insurance, Previous Service Records, etc.</Text>
              <TouchableOpacity style={styles.docPickBtn} onPress={pickDocument} activeOpacity={0.85}>
                <Feather name="upload" size={15} color={PRIMARY} />
                <Text style={styles.docPickText}>Select from Gallery</Text>
              </TouchableOpacity>

              {documents.length > 0 && (
                <View style={styles.docList}>
                  {documents.map((d, i) => (
                    <View key={i} style={styles.docItem}>
                      <View style={styles.docIcon}>
                        <Feather name="file" size={14} color={PRIMARY} />
                      </View>
                      <Text style={styles.docName} numberOfLines={1}>{d.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeDocument(i)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x-circle" size={16} color={DANGER + 'AA'} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {documents.length === 0 && (
                <Text style={styles.docEmpty}>No documents attached</Text>
              )}
            </StepCard>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 2 — Services                                      */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <>
            {errors.services && (
              <View style={styles.stepErrorBanner}>
                <Feather name="alert-circle" size={14} color={DANGER} />
                <Text style={styles.stepErrorText}>{errors.services}</Text>
              </View>
            )}
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
                      clearFieldError('services');
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
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(i, -1)} activeOpacity={0.8}>
                          <Feather name="minus" size={12} color={TEXT} />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{svc.qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(i, 1)} activeOpacity={0.8}>
                          <Feather name="plus" size={12} color={TEXT} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.serviceRowTotal}>{formatCurrency(svc.price * svc.qty)}</Text>
                    </View>
                    {i < services.length - 1 && <View style={styles.serviceDivider} />}
                  </View>
                ))}
                <View style={styles.servicesSummary}>
                  <Text style={styles.servicesSummaryLabel}>Services Total</Text>
                  <Text style={styles.servicesSummaryValue}>{formatCurrency(servicesTotal)}</Text>
                </View>
              </StepCard>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 3 — Labour & Technician                           */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 3 && (
          <>
            {createError && (
              <View style={styles.stepErrorBanner}>
                <Feather name="alert-circle" size={14} color={DANGER} />
                <Text style={styles.stepErrorText}>{createError}</Text>
              </View>
            )}
            <StepCard icon="users" title="Assign Technician" iconBg="#F5F3FF" iconFg="#C41E3A">
              {mockTechs.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.techCard,
                    selectedTechId === t.id && styles.techCardActive,
                    errors.technician && !selectedTechId && styles.techCardError,
                  ]}
                  onPress={() => {
                    setSelectedTechId(t.id);
                    setSelectedTechName(t.name);
                    clearFieldError('technician');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.techAvatar, selectedTechId === t.id && { backgroundColor: PRIMARY }]}>
                    <Text style={[styles.techAvatarText, selectedTechId === t.id && { color: '#fff' }]}>
                      {t.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.techName}>{t.name}</Text>
                    <Text style={styles.techRole}>{t.role}</Text>
                  </View>
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
              {/* Date + Time picker buttons */}
              <View style={styles.row}>
                {/* Date */}
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.pickerBtnIcon}>
                    <Feather name="calendar" size={17} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerBtnLabel}>Date</Text>
                    <Text style={[styles.pickerBtnValue, !deliveryDate && styles.pickerBtnPlaceholder]}>
                      {deliveryDate
                        ? deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Select date'}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={15} color={MUTED} />
                </TouchableOpacity>

                {/* Time */}
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.pickerBtnIcon}>
                    <Feather name="clock" size={17} color={PRIMARY} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerBtnLabel}>Time</Text>
                    <Text style={[styles.pickerBtnValue, !deliveryTime && styles.pickerBtnPlaceholder]}>
                      {deliveryTime
                        ? deliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : 'Select time'}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={15} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Android: renders as a native dialog — no Modal needed */}
              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={deliveryDate ?? new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  display="calendar"
                  onChange={(_: DateTimePickerEvent, date?: Date) => {
                    setShowDatePicker(false);
                    if (date) setDeliveryDate(date);
                  }}
                />
              )}
              {Platform.OS === 'android' && showTimePicker && (
                <DateTimePicker
                  value={deliveryTime ?? new Date()}
                  mode="time"
                  is24Hour={false}
                  display="clock"
                  onChange={(_: DateTimePickerEvent, date?: Date) => {
                    setShowTimePicker(false);
                    if (date) setDeliveryTime(date);
                  }}
                />
              )}

              {/* iOS: inline spinner — wrap in Modal with Done button */}
              <Modal visible={Platform.OS === 'ios' && (showDatePicker || showTimePicker)} transparent animationType="slide">
                <View style={styles.pickerModal}>
                  <View style={styles.pickerModalSheet}>
                    <View style={styles.pickerModalHeader}>
                      <Text style={styles.pickerModalTitle}>
                        {showDatePicker ? 'Select Date' : 'Select Time'}
                      </Text>
                      <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                        <Text style={styles.pickerModalDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    {showDatePicker && (
                      <DateTimePicker
                        value={deliveryDate ?? new Date()}
                        mode="date"
                        minimumDate={new Date()}
                        display="inline"
                        themeVariant="light"
                        accentColor={PRIMARY}
                        onChange={(_: DateTimePickerEvent, date?: Date) => {
                          if (date) setDeliveryDate(date);
                        }}
                        style={{ alignSelf: 'center' }}
                      />
                    )}
                    {showTimePicker && (
                      <DateTimePicker
                        value={deliveryTime ?? new Date()}
                        mode="time"
                        is24Hour={false}
                        display="spinner"
                        themeVariant="light"
                        accentColor={PRIMARY}
                        onChange={(_: DateTimePickerEvent, date?: Date) => {
                          if (date) setDeliveryTime(date);
                        }}
                        style={{ alignSelf: 'center' }}
                      />
                    )}
                  </View>
                </View>
              </Modal>

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

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 4 — Job Progress                                  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 4 && (
          <>
            <StepCard icon="activity" title="Job Timeline" iconBg="#F0FDF4" iconFg={SUCCESS}>
              {[
                { label: 'Job Created',         desc: 'Job card successfully created', done: true  },
                { label: 'Technician Assigned', desc: selectedTechName || '—',         done: !!selectedTechId },
                { label: 'Work Started',        desc: 'Vehicle under service',         current: true },
                { label: 'Quality Check',       desc: '',                              done: false },
                { label: 'Ready for Delivery',  desc: '',                              done: false },
                { label: 'Completed',           desc: '',                              done: false },
              ].map((item, i, arr) => (
                <View key={i} style={styles.timelineRow}>
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

          </>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 5 — Final Invoice                                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {step === 5 && (
          <>
            <LinearGradient
              colors={['#921527', '#C41E3A', '#E11D48']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.invoiceHero}
            >
              <View style={styles.invoiceHeroCircle} />
              <View style={styles.invoiceHeroTop}>
                <View>
                  <Text style={styles.invoiceBrand}>GoFixCarz</Text>
                  <Text style={styles.invoiceTagline}>Smart Garage Management</Text>
                </View>
                <View style={styles.invoiceNumWrap}>
                  <Text style={styles.invoiceNumLabel}>INVOICE</Text>
                  <Text style={styles.invoiceNum}>{invoiceNum}</Text>
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

            {labourTotal > 0 && (
              <StepCard icon="users" title="Labour" iconBg="#F5F3FF" iconFg="#C41E3A">
                <View style={styles.lineItem}>
                  <Text style={styles.lineItemName}>Labour Charge{estHours ? ` (${estHours}h)` : ''}</Text>
                  <Text style={styles.lineItemAmt}>{formatCurrency(labourTotal)}</Text>
                </View>
              </StepCard>
            )}

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

            <View style={styles.invoiceActions}>
              <TouchableOpacity
                style={[styles.invoiceActionBtn, pdfLoading === 'download' && { opacity: 0.6 }]}
                onPress={handleDownloadPdf}
                disabled={!!pdfLoading}
                activeOpacity={0.8}
              >
                <View style={[styles.invoiceActionIcon, { backgroundColor: '#FEE2E2' }]}>
                  {pdfLoading === 'download'
                    ? <ActivityIndicator size="small" color={PRIMARY} />
                    : <Feather name="download" size={16} color={PRIMARY} />}
                </View>
                <Text style={styles.invoiceActionText}>Download PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.invoiceActionBtn, pdfLoading === 'share' && { opacity: 0.6 }]}
                onPress={handleSharePdf}
                disabled={!!pdfLoading}
                activeOpacity={0.8}
              >
                <View style={[styles.invoiceActionIcon, { backgroundColor: '#F0FDF4' }]}>
                  {pdfLoading === 'share'
                    ? <ActivityIndicator size="small" color={SUCCESS} />
                    : <Feather name="share-2" size={16} color={SUCCESS} />}
                </View>
                <Text style={styles.invoiceActionText}>Share Invoice</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky Footer — in normal flex flow, always above the tab bar ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[styles.footerBack, step === 0 && styles.footerBackDisabled]}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={16} color={step === 0 ? '#CBD5E1' : TEXT} />
          <Text style={[styles.footerBackText, step === 0 && { color: '#CBD5E1' }]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.footerNext,
            isPending && { opacity: 0.65 },
            step === 5 && { backgroundColor: SUCCESS },
          ]}
          onPress={step === 5 ? () => router.replace('/(tabs)/jobs') : handleNext}
          disabled={isPending}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  topBar: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  stepMeta:    { fontSize: 11, color: MUTED, fontWeight: '500', letterSpacing: 0.3, marginBottom: 2 },
  stepHeading: { fontSize: 18, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  progressPill: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, backgroundColor: '#F3F4F6', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: PRIMARY },

  /* Stepper */
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  stepLine:     { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  stepLineDone: { backgroundColor: SUCCESS },
  stepNode:     { alignItems: 'center' },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    backgroundColor: CARD,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleDone:   { backgroundColor: SUCCESS, borderColor: SUCCESS },
  stepCircleActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  stepNum: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },

  /* Body */
  body: { padding: 16 },

  /* Field label / error */
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: MUTED,
    letterSpacing: 0.6, marginBottom: 7,
  },
  fieldError: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4, marginBottom: 10 },
  fieldErrorText: { fontSize: 11.5, color: DANGER, flex: 1 },

  /* Step-level error banner */
  stepErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    borderWidth: 1, borderColor: '#FCA5A5',
    padding: 12, marginBottom: 12,
  },
  stepErrorText: { fontSize: 12.5, color: DANGER, fontWeight: '500', flex: 1 },

  /* Row */
  row: { flexDirection: 'row', gap: 10 },

  /* Date / Time picker buttons */
  pickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12,
  },
  pickerBtnIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerBtnLabel:       { fontSize: 10, color: MUTED, fontWeight: '600', marginBottom: 2, letterSpacing: 0.3 },
  pickerBtnValue:       { fontSize: 13, fontWeight: '600', color: TEXT },
  pickerBtnPlaceholder: { color: '#9CA3AF', fontWeight: '400' },

  /* iOS picker modal */
  pickerModal: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  pickerModalTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  pickerModalDone:  { fontSize: 15, fontWeight: '700', color: PRIMARY },

  /* Chips */
  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: 13, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    backgroundColor: CARD,
  },
  chipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff' },

  /* Textarea */
  textAreaWrap: {
    backgroundColor: CARD,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    marginBottom: 12, overflow: 'hidden',
  },
  textAreaError: { borderColor: DANGER },
  textArea: {
    padding: 13, fontSize: 14, color: TEXT,
    minHeight: 96, textAlignVertical: 'top',
  },

  /* Fuel level */
  fuelRow:   { flexDirection: 'row', gap: 7, marginBottom: 12 },
  fuelBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#F9FAFB', alignItems: 'center',
  },
  fuelBtnActive:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  fuelText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  fuelTextActive: { color: '#fff' },
  gaugeTrack: {
    height: 5, borderRadius: 3,
    backgroundColor: '#F3F4F6', overflow: 'hidden',
  },
  gaugeFill: { height: '100%', borderRadius: 3 },

  /* Photo picker */
  photoActionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  photoActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 9,
    borderWidth: 1, borderColor: PRIMARY + '33',
    backgroundColor: '#FEF2F2',
  },
  photoActionText: { fontSize: 12.5, fontWeight: '600', color: PRIMARY },
  thumbRow: { gap: 8, paddingBottom: 4 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 84, height: 84, borderRadius: 9 },
  thumbDelete: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: DANGER,
    alignItems: 'center', justifyContent: 'center',
  },
  photoEmptyHint: {
    alignItems: 'center', paddingVertical: 18, gap: 6,
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    borderStyle: 'dashed', backgroundColor: '#F9FAFB',
  },
  photoEmptyText: { fontSize: 12.5, color: MUTED },
  photoCount: { fontSize: 11.5, color: MUTED, marginTop: 7, textAlign: 'center' },

  /* Documents */
  docHint: { fontSize: 11.5, color: MUTED, marginBottom: 10 },
  docPickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 11, borderRadius: 9,
    borderWidth: 1, borderColor: PRIMARY + '33',
    backgroundColor: '#FEF2F2', marginBottom: 10,
  },
  docPickText: { fontSize: 12.5, fontWeight: '600', color: PRIMARY },
  docList: { gap: 7 },
  docItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 9,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER,
  },
  docIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  docName:  { flex: 1, fontSize: 12.5, color: TEXT, fontWeight: '500' },
  docEmpty: { fontSize: 12, color: MUTED, textAlign: 'center', paddingVertical: 6 },

  /* Service search */
  serviceSearchRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  serviceSearchInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: CARD, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, height: 46,
  },
  serviceSearchText: { flex: 1, fontSize: 14, color: TEXT },
  addServiceBtn: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 3 },
      default: {},
    }),
  },
  suggestLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.6, marginBottom: 7, textTransform: 'uppercase' },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 11, paddingVertical: 6,
    borderRadius: 7, borderWidth: 1, borderColor: PRIMARY + '33',
    backgroundColor: '#FEF2F2',
  },
  suggestChipText: { fontSize: 11.5, fontWeight: '600', color: PRIMARY },

  /* Service items */
  serviceItem: { marginBottom: 0 },
  serviceTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  serviceIconDot: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  serviceItemName: { flex: 1, fontSize: 13.5, fontWeight: '600', color: TEXT },
  serviceBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 33 },
  priceInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: BORDER, borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 9, paddingVertical: 6, flex: 1,
  },
  priceRupee: { fontSize: 13, color: MUTED, fontWeight: '600' },
  priceInput: { flex: 1, fontSize: 13.5, fontWeight: '600', color: TEXT, paddingVertical: 0 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 7,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  qtyValue: { fontSize: 13, fontWeight: '700', color: TEXT, minWidth: 20, textAlign: 'center' },
  serviceRowTotal: { fontSize: 13.5, fontWeight: '700', color: PRIMARY, minWidth: 60, textAlign: 'right' },
  serviceDivider:  { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginVertical: 12 },
  servicesSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  servicesSummaryLabel: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.3 },
  servicesSummaryValue: { fontSize: 17, fontWeight: '800', color: PRIMARY },

  /* Technician cards */
  techCard: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#F9FAFB', marginBottom: 8,
  },
  techCardActive: { borderColor: PRIMARY, backgroundColor: '#FEF2F2' },
  techCardError:  { borderColor: DANGER + '66' },
  techAvatar: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  techAvatarText: { fontSize: 16, fontWeight: '700', color: TEXT },
  techName:  { fontSize: 13.5, fontWeight: '600', color: TEXT, marginBottom: 1 },
  techRole:  { fontSize: 11.5, color: MUTED },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  availDot:  { width: 5, height: 5, borderRadius: 3 },
  availText: { fontSize: 10.5, fontWeight: '600' },
  techCheckWrap: { marginLeft: 2 },

  /* Timeline */
  timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 28 },
  timelineCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  timelineCircleDone:    { backgroundColor: SUCCESS, borderColor: SUCCESS },
  timelineCircleCurrent: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  timelinePulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  timelineLine:     { width: 1, flex: 1, backgroundColor: '#E5E7EB', minHeight: 22 },
  timelineLineDone: { backgroundColor: SUCCESS },
  timelineNum:      { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  timelineContent:  { flex: 1, paddingBottom: 22, paddingTop: 5 },
  timelineLabel:    { fontSize: 13.5, fontWeight: '600', color: TEXT },
  timelineDesc:     { fontSize: 11.5, color: MUTED, marginTop: 2 },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 5, alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  currentDot:       { width: 5, height: 5, borderRadius: 3, backgroundColor: PRIMARY },
  currentBadgeText: { fontSize: 10.5, fontWeight: '700', color: PRIMARY },

  /* Stage grid */
  stageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  stageBtn: {
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
  },
  stageBtnText: { fontSize: 12, fontWeight: '700' },

  /* Invoice */
  invoiceHero: {
    borderRadius: 16, padding: 20, marginBottom: 12, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#7B0E20', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  invoiceHeroCircle: {
    position: 'absolute', top: -36, right: -36,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  invoiceHeroTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 18,
  },
  invoiceBrand:    { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  invoiceTagline:  { fontSize: 10.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  invoiceNumWrap:  { alignItems: 'flex-end' },
  invoiceNumLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, textTransform: 'uppercase' },
  invoiceNum:      { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  invoiceMeta:     { gap: 5 },
  invoiceMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  invoiceMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  /* Line items */
  lineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineItemName: { fontSize: 13, color: TEXT, flex: 1 },
  lineItemAmt:  { fontSize: 13, fontWeight: '600', color: PRIMARY },

  /* Totals */
  totalsCard: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 12, gap: 9,
    ...Platform.select({
      ios: { shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalRowLabel: { fontSize: 13, color: MUTED },
  totalRowValue: { fontSize: 13, fontWeight: '500', color: TEXT },
  grandTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    paddingTop: 12, marginTop: 3,
  },
  grandTotalLabel: { fontSize: 14, fontWeight: '700', color: TEXT },
  grandTotalValue: { fontSize: 22, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },

  /* Invoice actions */
  invoiceActions: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  invoiceActionBtn: {
    flex: 1, backgroundColor: CARD,
    borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 7,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#101828', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  invoiceActionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  invoiceActionText: { fontSize: 11.5, fontWeight: '600', color: TEXT },

  /* Footer */
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: CARD,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerBack: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 11, borderWidth: 1, borderColor: BORDER,
    backgroundColor: '#F3F4F6',
  },
  footerBackDisabled: { opacity: 0.35 },
  footerBackText: { fontSize: 14, fontWeight: '600', color: TEXT },
  footerNext: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 13, borderRadius: 11,
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 5 },
      default: {},
    }),
  },
  footerNextText: { fontSize: 14.5, fontWeight: '700', color: '#fff' },
});
