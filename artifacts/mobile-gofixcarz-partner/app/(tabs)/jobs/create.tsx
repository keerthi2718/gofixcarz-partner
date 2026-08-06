import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft, ArrowRight, Check, AlertCircle, ChevronDown,
  User, Phone, Hash, Truck, Tag, GitBranch, Navigation,
  Droplet, Clipboard, Camera, Search, Plus, Minus, Trash2,
  Users, Clock, Calendar, Wrench, Image as ImageIcon, Upload,
  FileText, Download, Share2, Activity, X, CheckCircle, RotateCcw,
} from 'lucide-react-native';
import JobService from '@/src/services/job.service';
import GarageService from '@/src/services/garage.service';
import ImageService from '@/src/services/image.service';
import SelectDropdown from '@/src/components/ui/SelectDropdown';
import { VEHICLE_BRANDS, getModelsForBrand } from '@/src/data/vehicleData';
import { formatCurrency } from '@/src/utils/helpers';

/* ─────────────────────────── Tokens ─────────────────────────── */
const BG      = '#F2F4F7';
const CARD    = '#FFFFFF';
const PRIMARY = '#C41E3A';
const TEXT    = '#0D1117';
const MUTED   = '#6B7280';
const BORDER  = '#E5E7EB';
const SUCCESS = '#059669';
const DANGER  = '#DC2626';
const WARN    = '#D97706';

const STEPS: { label: string; Icon: any; color: string; bg: string }[] = [
  { label: 'Customer', Icon: User,      color: '#2563EB', bg: '#DBEAFE' },
  { label: 'Inspect',  Icon: Clipboard, color: '#D97706', bg: '#FEF3C7' },
  { label: 'Services', Icon: Wrench,    color: '#7C3AED', bg: '#EDE9FE' },
  { label: 'Labour',   Icon: Users,     color: '#0891B2', bg: '#CFFAFE' },
  { label: 'Progress', Icon: Activity,  color: '#059669', bg: '#D1FAE5' },
  { label: 'Invoice',  Icon: FileText,  color: '#C41E3A', bg: '#FEE2E2' },
];

const FUEL_LEVELS = ['E', '1/4', '1/2', '3/4', 'F'];
const FUEL_TYPES  = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

type ServiceItem = { name: string; price: number; qty: number };
type PhotoItem   = { uri: string; name?: string };
type DocItem     = { uri: string; name: string; mimeType?: string };

/* ─────────────────────────── InlineInput ────────────────────── */
function InlineInput({
  label, value, onChangeText, placeholder, Icon, error,
  keyboardType, autoCapitalize, prefix, maxLength,
  multiline, numberOfLines, editable = true,
}: {
  label?: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; Icon?: any; error?: string;
  keyboardType?: any; autoCapitalize?: any; prefix?: string;
  maxLength?: number; multiline?: boolean; numberOfLines?: number;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const bc = error ? DANGER : focused ? PRIMARY : BORDER;
  const bw = focused || !!error ? 2 : 1;

  return (
    <View style={inp.wrap}>
      {!!label && (
        <Text style={inp.label}>
          {label.replace(' *', '')}
          {label.endsWith(' *') && <Text style={{ color: DANGER }}> *</Text>}
        </Text>
      )}
      <View style={[
        inp.row,
        multiline && inp.rowMulti,
        { borderColor: bc, borderWidth: bw },
        !editable && { backgroundColor: '#F9FAFB' },
      ]}>
        {Icon && (
          <View style={inp.iconSlot}>
            <Icon size={16} color={focused ? PRIMARY : '#9CA3AF'} strokeWidth={2} />
          </View>
        )}
        {prefix && (
          <View style={inp.prefixSlot}>
            <Text style={inp.prefixText}>{prefix}</Text>
            <View style={inp.prefixDivider} />
          </View>
        )}
        <TextInput
          style={[inp.field, multiline && inp.fieldMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!error && (
        <View style={inp.errRow}>
          <AlertCircle size={11} color={DANGER} strokeWidth={2} />
          <Text style={inp.errText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const inp = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#4B5563', letterSpacing: 0.6, marginBottom: 7, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12,
    minHeight: 52, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  rowMulti: { alignItems: 'flex-start', minHeight: 100 },
  iconSlot: { width: 48, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  prefixSlot: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  prefixText: { fontSize: 13, fontWeight: '600', color: MUTED },
  prefixDivider: { width: 1, height: 18, backgroundColor: BORDER, marginLeft: 10 },
  field: { flex: 1, fontSize: 15, color: TEXT, paddingRight: 16, height: 52 },
  fieldMulti: { height: undefined, paddingTop: 14, paddingBottom: 14, paddingLeft: 4 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  errText: { fontSize: 11.5, color: DANGER, flex: 1 },
});

/* ─────────────────────────── SectionCard ───────────────────── */
function SectionCard({ title, iconBg, Icon, iconColor = PRIMARY, children }: {
  title: string; iconBg: string; Icon: any; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <View style={[sc.iconCircle, { backgroundColor: iconBg }]}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden', marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  body:  { padding: 18 },
});

/* ─────────────────────────── Main screen ────────────────────── */
export default function CreateJobScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const scrollRef = useRef<ScrollView>(null);

  const [step,        setStep]        = useState(0);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [pdfLoading,  setPdfLoading]  = useState<'download' | 'share' | null>(null);

  const qc         = useQueryClient();
  const invoiceNum  = useRef(`INV-${Date.now().toString().slice(-6)}`).current;

  /* Garage profile — used for invoice branding */
  const { data: garage } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn:  GarageService.get,
    staleTime: 1000 * 60 * 10,
  });
  const garageName    = garage?.name    || 'My Garage';
  const garageAddress = [garage?.address, garage?.city, garage?.state].filter(Boolean).join(', ');
  const garagePhone   = garage?.phone   || '';

  /* Service packages — used for quick-add chips on the Services step */
  const { data: pkgsData } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGES({}),
    queryFn:  () => ServicePackageService.list({ page_size: 20 }),
    staleTime: 1000 * 60 * 5,
  });
  const servicePackages = pkgsData?.items ?? [];

  /* Step 0 */
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [regNumber,     setRegNumber]     = useState('');
  const [brand,         setBrand]         = useState('');
  const [model,         setModel]         = useState('');
  const [fuelType,      setFuelType]      = useState('Petrol');
  const [odometer,      setOdometer]      = useState('');

  /* Step 1 */
  const [fuelLevel,       setFuelLevel]       = useState('1/2');
  const [complaint,       setComplaint]       = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [beforePhotos,    setBeforePhotos]    = useState<PhotoItem[]>([]);
  const [documents,       setDocuments]       = useState<DocItem[]>([]);

  /* Step 2 */
  const [serviceSearch, setServiceSearch] = useState('');
  const [services,      setServices]      = useState<ServiceItem[]>([]);

  /* Step 3 */
  const [selectedTechName, setSelectedTechName] = useState('');
  const [estHours,         setEstHours]         = useState('');
  const [labourCharge,     setLabourCharge]      = useState('');
  const [deliveryDate,     setDeliveryDate]      = useState<Date | null>(null);
  const [deliveryTime,     setDeliveryTime]      = useState<Date | null>(null);
  const [showDatePicker,   setShowDatePicker]    = useState(false);
  const [showTimePicker,   setShowTimePicker]    = useState(false);
  const [additionalNotes,  setAdditionalNotes]   = useState('');

  /* Step 4/5 */
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const servicesTotal = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const labourTotal   = parseFloat(labourCharge) || 0;
  const subtotal      = servicesTotal + labourTotal;
  const gst           = subtotal * 0.18;
  const grandTotal    = subtotal + gst;

  /* ── Invoice HTML ── */
  function buildInvoiceHtml() {
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const dueStr  = deliveryDate
      ? deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';
    const vehicleLabel = [brand, model, fuelType].filter(Boolean).join(' · ') || '—';
    const serviceRows = services.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#FAFAFA' : '#fff'}">
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9;"><div style="font-weight:600;color:#1E293B;font-size:13px;">${s.name}</div></td>
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9; text-align:center;color:#64748B;font-size:13px;">${s.qty}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9; text-align:right;color:#64748B;font-size:13px;">${formatCurrency(s.price)}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #F1F5F9; text-align:right;font-weight:600;color:#1E293B;font-size:13px;">${formatCurrency(s.price * s.qty)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:-apple-system,Helvetica Neue,Arial,sans-serif;color:#1E293B;background:#F8FAFC;font-size:13px;}
  .page{max-width:680px;margin:0 auto;background:#fff;box-shadow:0 0 0 1px #E2E8F0;}
  .header{background:linear-gradient(135deg,#7B0E20 0%,#C41E3A 55%,#E11D48 100%);padding:36px 36px 28px;color:#fff;}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;}
  .brand-name{font-size:26px;font-weight:800;letter-spacing:-0.5px;}
  .brand-tag{font-size:11px;opacity:0.65;margin-top:5px;}
  .inv-block{text-align:right;}
  .inv-word{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;opacity:0.65;margin-bottom:4px;}
  .inv-number{font-size:22px;font-weight:800;}
  .inv-date{font-size:11px;opacity:0.7;margin-top:4px;}
  .status-row{margin-top:22px;display:flex;align-items:center;gap:10px;}
  .status-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:4px 12px;font-size:11px;font-weight:600;color:#fff;}
  .dot{width:6px;height:6px;border-radius:50%;background:#4ADE80;}
  .due-text{font-size:11px;opacity:0.7;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid #E2E8F0;}
  .info-cell{padding:20px 28px;}
  .info-cell+.info-cell{border-left:1px solid #E2E8F0;}
  .cell-label{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
  .cell-name{font-size:15px;font-weight:700;color:#1E293B;margin-bottom:3px;}
  .cell-sub{font-size:12px;color:#64748B;line-height:1.5;}
  .section-head{padding:16px 28px 12px;border-bottom:2px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;}
  .section-title{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;}
  .items-table{width:100%;border-collapse:collapse;}
  .items-table thead tr{background:#F8FAFC;}
  .items-table thead th{padding:10px 12px;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #E2E8F0;}
  .items-table thead th:first-child{text-align:left;padding-left:28px;}
  .items-table thead th:last-child{padding-right:28px;}
  .items-table tbody tr:last-child td{border-bottom:none;}
  .items-table tbody td:first-child{padding-left:28px;}
  .items-table tbody td:last-child{padding-right:28px;}
  .labour-row{display:flex;justify-content:space-between;align-items:center;padding:12px 28px;background:#FFFBEB;border-top:1px solid #FEF3C7;border-bottom:1px solid #FEF3C7;}
  .labour-label{font-size:13px;color:#92400E;font-weight:500;}
  .labour-amount{font-size:13px;font-weight:600;color:#92400E;}
  .totals-wrap{padding:20px 28px 24px;border-top:2px solid #F1F5F9;}
  .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#64748B;}
  .total-row span:last-child{font-weight:500;color:#475569;}
  .total-divider{border:none;border-top:1px dashed #CBD5E1;margin:12px 0;}
  .grand-row{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:linear-gradient(135deg,#7B0E20,#C41E3A);border-radius:10px;margin-top:4px;}
  .grand-label{color:#fff;font-size:13px;font-weight:600;opacity:0.85;}
  .grand-amount{color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;}
  .notes-block{margin:0 28px 24px;padding:14px 16px;background:#F8FAFC;border-left:3px solid #C41E3A;border-radius:0 6px 6px 0;}
  .notes-label{font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
  .notes-text{font-size:12px;color:#475569;line-height:1.6;}
  .footer{background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 28px;display:flex;justify-content:space-between;align-items:center;}
  .footer-brand{font-size:13px;font-weight:700;color:#C41E3A;}
  .footer-right{font-size:11px;color:#94A3B8;text-align:right;}
  .thank-you{font-size:11px;color:#64748B;margin-top:2px;}
</style></head><body><div class="page">
  <div class="header">
    <div class="header-row">
      <div><div class="brand-name">${garageName}</div>${garageAddress ? `<div class="brand-tag">${garageAddress}</div>` : ''}${garagePhone ? `<div class="brand-tag">${garagePhone}</div>` : ''}</div>
      <div class="inv-block"><div class="inv-word">Tax Invoice</div><div class="inv-number">${invoiceNum}</div><div class="inv-date">Issued ${dateStr}</div></div>
    </div>
    <div class="status-row">
      <div class="status-pill"><div class="dot"></div>Due on Delivery</div>
      ${deliveryDate ? `<div class="due-text">Expected: ${dueStr}</div>` : ''}
    </div>
  </div>
  <div class="info-grid">
    <div class="info-cell"><div class="cell-label">Bill To</div><div class="cell-name">${customerName || '—'}</div><div class="cell-sub">${customerPhone || ''}</div></div>
    <div class="info-cell"><div class="cell-label">Vehicle</div><div class="cell-name">${regNumber || '—'}</div><div class="cell-sub">${vehicleLabel}</div></div>
  </div>
  ${services.length > 0 ? `
  <div class="section-head"><div class="section-title">Services &amp; Parts</div><div style="font-size:11px;color:#94A3B8;">${services.length} item${services.length !== 1 ? 's' : ''}</div></div>
  <table class="items-table">
    <thead><tr><th style="text-align:left;">Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>${serviceRows}</tbody>
  </table>` : ''}
  ${labourTotal > 0 ? `<div class="labour-row"><span class="labour-label">&#9881; Labour Charge${estHours ? ` — ${estHours} hrs estimated` : ''}</span><span class="labour-amount">${formatCurrency(labourTotal)}</span></div>` : ''}
  <div class="totals-wrap">
    <div class="total-row"><span>Services Subtotal</span><span>${formatCurrency(servicesTotal)}</span></div>
    ${labourTotal > 0 ? `<div class="total-row"><span>Labour</span><span>${formatCurrency(labourTotal)}</span></div>` : ''}
    <div class="total-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    <div class="total-row"><span>GST @ 18%</span><span>${formatCurrency(gst)}</span></div>
    <hr class="total-divider"/>
    <div class="grand-row"><span class="grand-label">Grand Total (INR)</span><span class="grand-amount">${formatCurrency(grandTotal)}</span></div>
  </div>
  ${additionalNotes ? `<div class="notes-block"><div class="notes-label">Workshop Notes</div><div class="notes-text">${additionalNotes}</div></div>` : ''}
  <div class="footer">
    <div><div class="footer-brand">${garageName}</div><div class="thank-you">Thank you for your business!</div></div>
    <div class="footer-right"><div>Computer-generated invoice.</div><div style="margin-top:2px;">No signature required.</div></div>
  </div>
</div></body></html>`;
  }

  /* ── PDF actions ── */
  async function handleDownloadPdf() {
    if (pdfLoading) return;
    setPdfLoading('download');
    try {
      await Print.printAsync({ html: buildInvoiceHtml() });
    } catch (e: any) {
      if (!String(e?.message).toLowerCase().includes('cancel'))
        Alert.alert('Error', e?.message ?? 'Could not open print dialog.');
    } finally { setPdfLoading(null); }
  }

  async function handleSharePdf() {
    if (pdfLoading) return;
    setPdfLoading('share');
    try {
      const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(), base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Share ${invoiceNum}`, UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Not available', 'Sharing is not supported on this device.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not generate PDF.');
    } finally { setPdfLoading(null); }
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
        const d = customerPhone.replace(/\D/g, '');
        if (d.length !== 10) errs.customerPhone = 'Mobile number must be exactly 10 digits.';
      }
      if (odometer && parseFloat(odometer) < 0) errs.odometer = 'Odometer must be a positive number.';
    }
    if (step === 1) { if (!complaint.trim()) errs.complaint = 'Customer complaint is required.'; }
    if (step === 2) { if (services.length === 0) errs.services = 'Please add at least one service.'; }
    if (step === 3) {
      if (!deliveryDate) errs.deliveryDate = 'Please select an expected delivery date.';
      if (!deliveryTime) errs.deliveryTime = 'Please select an expected pickup time.';
    }
    return errs;
  }

  function clearFieldError(key: string) {
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  /* ── Mutation ── */
  const { mutate: createJob, isPending } = useMutation({
    mutationFn: async () => {
      // Step 1: create the job with customer + vehicle basics
      const job = await JobService.create({
        customer_name:       customerName  || null,
        customer_mobile:     customerPhone || null,
        registration_number: regNumber     || null,
        brand:               brand         || null,
        vehicle_model:       model         || null,
        fuel_type:           fuelType      || null,
        odometer_km:         parseFloat(odometer) || null,
        description:         additionalNotes || null,
        estimated_amount:    grandTotal    || null,
      });

      // Step 2: upload before-service photos to S3 in parallel (3-step flow).
      // Each photo goes through: POST /images/upload-url → PUT S3 → collect object_key.
      // We store object_keys, not signed URLs (URLs expire after 1 hour).
      let photoObjectKeys: string[] = [];
      if (beforePhotos.length > 0 && job?.id) {
        const results = await Promise.allSettled(
          beforePhotos.map(p => ImageService.uploadToS3(p.uri, 'photo'))
        );
        photoObjectKeys = results
          .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
          .map(r => r.value);
      }

      // Step 3: enrich the job with services, labour, and inspection data
      // (JobCreate has no these fields — they live on JobUpdate)
      const hasServices = services.length > 0;
      const hasLabour   = parseFloat(labourCharge) > 0;
      const hasInspect  = !!(complaint || inspectionNotes);

      if (job?.id && (hasServices || hasLabour || hasInspect)) {
        await JobService.update(job.id, {
          ...(hasInspect  && { inspection: { findings: [complaint, inspectionNotes].filter(Boolean).join('\n') } }),
          ...(hasServices && { services: services.map(s => ({ name: s.name, price: s.price, qty: s.qty })) }),
          ...(hasLabour   && { labour: { charge: parseFloat(labourCharge), description: estHours ? `${estHours} hrs` : null } }),
        });
      }

      // Step 4: attach uploaded photo object_keys to the job via PATCH.
      // Load fresh photo URLs from GET /jobs/:id — signed URLs expire after 1 hour.
      if (job?.id && photoObjectKeys.length > 0) {
        await JobService.updatePhotos(job.id, photoObjectKeys);
      }

      return job;
    },
    onSuccess: (job) => {
      setCreateError(null);
      setCreatedJobId(job?.id ?? null);
      // Invalidate all caches that depend on job data so every screen refreshes
      qc.invalidateQueries({ queryKey: QUERY_KEYS.JOBS() });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      qc.invalidateQueries({ queryKey: ['analytics'] }); // prefix — matches all periods
      setStep(4);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
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

  function handleReset() {
    Alert.alert(
      'Reset Job Card',
      'All entered details will be cleared. Start fresh?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setStep(0);
            setErrors({});
            setCreateError(null);
            setCustomerName('');
            setCustomerPhone('');
            setRegNumber('');
            setBrand('');
            setModel('');
            setFuelType('Petrol');
            setOdometer('');
            setFuelLevel('1/2');
            setComplaint('');
            setInspectionNotes('');
            setBeforePhotos([]);
            setDocuments([]);
            setServiceSearch('');
            setServices([]);
            setSelectedTechName('');
            setEstHours('');
            setLabourCharge('');
            setDeliveryDate(null);
            setDeliveryTime(null);
            setAdditionalNotes('');
            scrollRef.current?.scrollTo({ y: 0, animated: false });
          },
        },
      ],
    );
  }

  const nextLabel = step === 3 ? 'Create Job Card' : step === 5 ? 'Done' : 'Continue';

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
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access is needed to take photos.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setBeforePhotos(prev => [...prev, { uri: asset.uri, name: `photo_${Date.now()}.jpg` }]);
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Photo library access is needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7, allowsMultipleSelection: true, selectionLimit: 10 });
    if (!result.canceled) {
      const newPhotos = result.assets.map(a => ({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg` }));
      setBeforePhotos(prev => [...prev, ...newPhotos]);
    }
  }

  function removePhoto(idx: number) { setBeforePhotos(prev => prev.filter((_, i) => i !== idx)); }

  async function pickDocument() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Photo library access is needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
    if (!result.canceled) {
      const newDocs = result.assets.map(a => ({ uri: a.uri, name: a.fileName ?? `doc_${Date.now()}.jpg`, mimeType: a.mimeType }));
      setDocuments(prev => [...prev, ...newDocs]);
    }
  }

  function removeDocument(idx: number) { setDocuments(prev => prev.filter((_, i) => i !== idx)); }

  /* ── Render ── */
  return (
    <View style={[s.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ArrowLeft size={18} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>New Job Card</Text>
          <Text style={s.headerSub}>{STEPS[step].label} · Step {step + 1} of {STEPS.length}</Text>
        </View>
        <View style={s.stepBadge}>
          <Text style={s.stepBadgeText}>{step + 1}<Text style={s.stepBadgeOf}>/{STEPS.length}</Text></Text>
        </View>
      </View>

      {/* ── Colourful step timeline ── */}
      <View style={s.stepperWrap}>
        {STEPS.map((st, i) => {
          const done   = i < step;
          const active = i === step;
          const nodeBg    = done ? st.bg : active ? st.bg    : '#F1F5F9';
          const nodeColor = done ? st.color : active ? st.color : '#CBD5E1';
          const lineColor = done ? st.color : '#E5E7EB';
          return (
            <React.Fragment key={i}>
              {/* Node */}
              <View style={s.stepperNode}>
                {/* Glow ring behind active circle */}
                {active && (
                  <View style={[s.stepperGlow, { borderColor: `${st.color}35` }]} />
                )}
                <View style={[
                  s.stepperCircle,
                  { backgroundColor: nodeBg, borderColor: nodeColor },
                  active && { borderWidth: 2.5 },
                ]}>
                  {done
                    ? <Check size={11} color={st.color} strokeWidth={3} />
                    : <st.Icon size={12} color={nodeColor} strokeWidth={2} />
                  }
                </View>
                <Text style={[
                  s.stepperLabel,
                  done   && { color: st.color, fontWeight: '700' },
                  active && { color: st.color, fontWeight: '800' },
                  !done && !active && { color: '#CBD5E1' },
                ]} numberOfLines={1}>
                  {st.label}
                </Text>
              </View>

              {/* Connector line between nodes */}
              {i < STEPS.length - 1 && (
                <View style={[s.stepperLine, { backgroundColor: lineColor }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Content ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.body, { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ═══════ STEP 0 — Customer & Vehicle ═══════ */}
          {step === 0 && (
            <>
              <SectionCard title="Customer Information" iconBg="#FEE2E2" Icon={User} iconColor={PRIMARY}>
                <InlineInput
                  label="Customer Name *"
                  value={customerName}
                  onChangeText={v => { setCustomerName(v); clearFieldError('customerName'); }}
                  placeholder="Full name"
                  autoCapitalize="words"
                  Icon={User}
                  error={errors.customerName}
                />
                <InlineInput
                  label="Phone Number"
                  value={customerPhone}
                  onChangeText={v => { setCustomerPhone(v.replace(/\D/g, '').slice(0, 10)); clearFieldError('customerPhone'); }}
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  Icon={Phone}
                  prefix="+91"
                  maxLength={10}
                  error={errors.customerPhone}
                />
              </SectionCard>

              <SectionCard title="Vehicle Details" iconBg="#FFF7ED" Icon={Truck} iconColor="#F97316">
                <InlineInput
                  label="Registration Number *"
                  value={regNumber}
                  onChangeText={v => { setRegNumber(v); clearFieldError('regNumber'); }}
                  placeholder="KA 01 AB 1234"
                  autoCapitalize="characters"
                  Icon={Hash}
                  error={errors.regNumber}
                />
                <SelectDropdown
                  label="Vehicle Brand *"
                  value={brand}
                  onChange={v => { setBrand(v); setModel(''); clearFieldError('brand'); clearFieldError('model'); }}
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

                {/* Fuel type selector */}
                <Text style={s.chipLabel}>FUEL TYPE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow} style={{ marginBottom: 18 }}>
                  {FUEL_TYPES.map(ft => (
                    <TouchableOpacity
                      key={ft}
                      style={[s.chip, fuelType === ft && s.chipActive]}
                      onPress={() => setFuelType(ft)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.chipText, fuelType === ft && s.chipTextActive]}>{ft}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <InlineInput
                  label="Odometer (km)"
                  value={odometer}
                  onChangeText={v => { setOdometer(v); clearFieldError('odometer'); }}
                  placeholder="e.g. 45230"
                  keyboardType="number-pad"
                  Icon={Navigation}
                  error={errors.odometer}
                />
              </SectionCard>
            </>
          )}

          {/* ═══════ STEP 1 — Inspection ═══════ */}
          {step === 1 && (
            <>
              <SectionCard title="Fuel Level" iconBg="#FFF7ED" Icon={Droplet} iconColor="#F97316">
                <View style={s.fuelRow}>
                  {FUEL_LEVELS.map(l => (
                    <TouchableOpacity
                      key={l}
                      style={[s.fuelBtn, fuelLevel === l && s.fuelBtnActive]}
                      onPress={() => setFuelLevel(l)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.fuelText, fuelLevel === l && s.fuelTextActive]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.gaugeTrack}>
                  <View style={[
                    s.gaugeFill,
                    {
                      width: `${(FUEL_LEVELS.indexOf(fuelLevel) + 1) / FUEL_LEVELS.length * 100}%` as any,
                      backgroundColor: fuelLevel === 'E' ? DANGER : fuelLevel === '1/4' ? WARN : SUCCESS,
                    },
                  ]} />
                </View>
              </SectionCard>

              <SectionCard title="Inspection Details" iconBg="#FEE2E2" Icon={Clipboard} iconColor={PRIMARY}>
                <Text style={s.areaLabel}>CUSTOMER COMPLAINT <Text style={{ color: DANGER }}>*</Text></Text>
                <View style={[s.areaWrap, !!errors.complaint && s.areaError]}>
                  <TextInput
                    style={s.area}
                    value={complaint}
                    onChangeText={v => { setComplaint(v); clearFieldError('complaint'); }}
                    placeholder="Describe the issue reported by the customer…"
                    placeholderTextColor="#9CA3AF"
                    multiline numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
                {!!errors.complaint && (
                  <View style={s.areaErrRow}>
                    <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                    <Text style={s.areaErrText}>{errors.complaint}</Text>
                  </View>
                )}

                <Text style={s.areaLabel}>INSPECTION NOTES</Text>
                <View style={[s.areaWrap, { marginBottom: 0 }]}>
                  <TextInput
                    style={[s.area, { minHeight: 80 }]}
                    value={inspectionNotes}
                    onChangeText={setInspectionNotes}
                    placeholder="Additional observations…"
                    placeholderTextColor="#9CA3AF"
                    multiline numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </SectionCard>

              <SectionCard title="Before Service Photos" iconBg="#F0FDF4" Icon={Camera} iconColor={SUCCESS}>
                <View style={s.photoActionsRow}>
                  <TouchableOpacity style={s.photoBtn} onPress={pickFromCamera} activeOpacity={0.85}>
                    <Camera size={16} color={PRIMARY} strokeWidth={2} />
                    <Text style={s.photoBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.photoBtn} onPress={pickFromGallery} activeOpacity={0.85}>
                    <ImageIcon size={16} color={PRIMARY} strokeWidth={2} />
                    <Text style={s.photoBtnText}>From Gallery</Text>
                  </TouchableOpacity>
                </View>
                {beforePhotos.length > 0 ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
                      {beforePhotos.map((p, i) => (
                        <View key={i} style={s.thumbWrap}>
                          <Image source={{ uri: p.uri }} style={s.thumb} />
                          <TouchableOpacity style={s.thumbDel} onPress={() => removePhoto(i)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                            <X size={10} color="#fff" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                    <Text style={s.photoCount}>{beforePhotos.length} photo{beforePhotos.length > 1 ? 's' : ''} added</Text>
                  </>
                ) : (
                  <View style={s.photoEmpty}>
                    <ImageIcon size={24} color="#D1D5DB" strokeWidth={1.5} />
                    <Text style={s.photoEmptyText}>No photos added yet</Text>
                  </View>
                )}
              </SectionCard>

              <SectionCard title="Attach Documents" iconBg="#FFFBEB" Icon={FileText} iconColor={WARN}>
                <Text style={s.docHint}>RC Book, Insurance, Previous service records, etc.</Text>
                <TouchableOpacity style={s.uploadBtn} onPress={pickDocument} activeOpacity={0.85}>
                  <Upload size={15} color={PRIMARY} strokeWidth={2} />
                  <Text style={s.uploadBtnText}>Select from Gallery</Text>
                </TouchableOpacity>
                {documents.length > 0 ? (
                  <View style={s.docList}>
                    {documents.map((d, i) => (
                      <View key={i} style={s.docRow}>
                        <View style={s.docIconWrap}>
                          <FileText size={14} color={PRIMARY} strokeWidth={2} />
                        </View>
                        <Text style={s.docName} numberOfLines={1}>{d.name}</Text>
                        <TouchableOpacity onPress={() => removeDocument(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <X size={15} color={DANGER + 'AA'} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={s.docEmpty}>No documents attached</Text>
                )}
              </SectionCard>
            </>
          )}

          {/* ═══════ STEP 2 — Services ═══════ */}
          {step === 2 && (
            <>
              {errors.services && (
                <View style={s.errBanner}>
                  <AlertCircle size={14} color={DANGER} strokeWidth={2} />
                  <Text style={s.errBannerText}>{errors.services}</Text>
                </View>
              )}

              <SectionCard title="Add Services" iconBg="#FEE2E2" Icon={Wrench} iconColor={PRIMARY}>
                <View style={s.searchRow}>
                  <View style={s.searchBox}>
                    <Search size={15} color="#9CA3AF" strokeWidth={2} />
                    <TextInput
                      style={s.searchInput}
                      value={serviceSearch}
                      onChangeText={setServiceSearch}
                      placeholder="Search or type a service…"
                      placeholderTextColor="#9CA3AF"
                      onSubmitEditing={addService}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity style={s.addBtn} onPress={addService} activeOpacity={0.85}>
                    <Plus size={20} color="#fff" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                {servicePackages.length > 0 && (
                  <>
                    <Text style={s.chipLabel}>YOUR SERVICES</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                      {servicePackages.map(pkg => (
                        <TouchableOpacity
                          key={pkg.id}
                          style={s.suggestChip}
                          onPress={() => { setServices(prev => [...prev, { name: pkg.name, price: pkg.price ?? 0, qty: 1 }]); clearFieldError('services'); }}
                          activeOpacity={0.8}
                        >
                          <Plus size={11} color={PRIMARY} strokeWidth={2.5} />
                          <Text style={s.suggestChipText}>{pkg.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </SectionCard>

              {services.length > 0 && (
                <SectionCard title={`Services Added (${services.length})`} iconBg="#F0FDF4" Icon={Check} iconColor={SUCCESS}>
                  {services.map((svc, i) => (
                    <View key={i}>
                      <View style={s.svcItem}>
                        <View style={s.svcLeft}>
                          <View style={s.svcDot}>
                            <Wrench size={11} color={PRIMARY} strokeWidth={2} />
                          </View>
                          <Text style={s.svcName} numberOfLines={1}>{svc.name}</Text>
                          <TouchableOpacity onPress={() => removeService(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Trash2 size={14} color={DANGER + 'AA'} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                        <View style={s.svcRight}>
                          <View style={s.priceWrap}>
                            <Text style={s.rupee}>₹</Text>
                            <TextInput
                              style={s.priceInput}
                              value={svc.price > 0 ? String(svc.price) : ''}
                              onChangeText={v => updateServicePrice(i, v)}
                              placeholder="0"
                              placeholderTextColor="#9CA3AF"
                              keyboardType="number-pad"
                            />
                          </View>
                          <View style={s.qtyRow}>
                            <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(i, -1)} activeOpacity={0.8}>
                              <Minus size={12} color={TEXT} strokeWidth={2.5} />
                            </TouchableOpacity>
                            <Text style={s.qtyVal}>{svc.qty}</Text>
                            <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(i, 1)} activeOpacity={0.8}>
                              <Plus size={12} color={TEXT} strokeWidth={2.5} />
                            </TouchableOpacity>
                          </View>
                          <Text style={s.svcTotal}>{formatCurrency(svc.price * svc.qty)}</Text>
                        </View>
                      </View>
                      {i < services.length - 1 && <View style={s.svcDivider} />}
                    </View>
                  ))}
                  <View style={s.svcSummary}>
                    <Text style={s.svcSummaryLabel}>Services Total</Text>
                    <Text style={s.svcSummaryValue}>{formatCurrency(servicesTotal)}</Text>
                  </View>
                </SectionCard>
              )}
            </>
          )}

          {/* ═══════ STEP 3 — Labour & Technician ═══════ */}
          {step === 3 && (
            <>
              {createError && (
                <View style={s.errBanner}>
                  <AlertCircle size={14} color={DANGER} strokeWidth={2} />
                  <Text style={s.errBannerText}>{createError}</Text>
                </View>
              )}

              <SectionCard title="Assign Technician" iconBg="#EDE9FE" Icon={Users} iconColor="#7C3AED">
                <InlineInput
                  label="Technician Name"
                  value={selectedTechName}
                  onChangeText={v => { setSelectedTechName(v); clearFieldError('technician'); }}
                  placeholder="Enter technician name"
                  autoCapitalize="words"
                  Icon={Users}
                />
              </SectionCard>

              {/* ── Labour Details ── */}
              <SectionCard title="Labour Details" iconBg="#FEF3C7" Icon={Clock} iconColor={WARN}>
                <View style={s.labourGrid}>

                  {/* Estimated Hours — stepper */}
                  <View style={s.labourTile}>
                    <View style={s.labourTileTop}>
                      <View style={[s.labourTileIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Clock size={14} color={WARN} strokeWidth={2} />
                      </View>
                      <Text style={s.labourTileLabel}>EST. HOURS</Text>
                    </View>
                    <View style={s.stepperRow}>
                      <TouchableOpacity
                        style={s.stepperBtn}
                        onPress={() => setEstHours(String(Math.max(0, parseFloat(estHours || '0') - 0.5)))}
                        activeOpacity={0.75}
                      >
                        <Minus size={15} color={TEXT} strokeWidth={2.5} />
                      </TouchableOpacity>
                      <View style={s.stepperVal}>
                        <Text style={s.stepperNum}>{parseFloat(estHours || '0').toFixed(1)}</Text>
                        <Text style={s.stepperUnit}>hrs</Text>
                      </View>
                      <TouchableOpacity
                        style={s.stepperBtn}
                        onPress={() => setEstHours(String(parseFloat(estHours || '0') + 0.5))}
                        activeOpacity={0.75}
                      >
                        <Plus size={15} color={TEXT} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Labour Charge — currency input */}
                  <View style={s.labourTile}>
                    <View style={s.labourTileTop}>
                      <View style={[s.labourTileIcon, { backgroundColor: '#FEE2E2' }]}>
                        <Hash size={14} color={PRIMARY} strokeWidth={2} />
                      </View>
                      <Text style={s.labourTileLabel}>CHARGE (₹)</Text>
                    </View>
                    <View style={s.labourAmtRow}>
                      <Text style={s.labourRupee}>₹</Text>
                      <TextInput
                        style={s.labourAmtInput}
                        value={labourCharge}
                        onChangeText={setLabourCharge}
                        placeholder="0"
                        placeholderTextColor="#C4C9D4"
                        keyboardType="number-pad"
                      />
                    </View>
                    {labourCharge !== '' && parseFloat(labourCharge) > 0 && (
                      <Text style={s.labourAmtHint}>
                        + GST = {formatCurrency(parseFloat(labourCharge) * 1.18)}
                      </Text>
                    )}
                  </View>

                </View>
              </SectionCard>

              {/* ── Expected Delivery ── */}
              <SectionCard title="Expected Delivery" iconBg="#FFF7ED" Icon={Calendar} iconColor="#F97316">

                {/* Date row */}
                <TouchableOpacity
                  style={[s.deliveryRow, deliveryDate && s.deliveryRowSet, !!errors.deliveryDate && s.deliveryRowError]}
                  onPress={() => { setShowDatePicker(true); clearFieldError('deliveryDate'); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.deliveryIconWrap, { backgroundColor: deliveryDate ? '#FFF7ED' : '#F3F4F6' }]}>
                    <Calendar size={18} color={deliveryDate ? '#F97316' : '#9CA3AF'} strokeWidth={2} />
                  </View>
                  <View style={s.deliveryContent}>
                    <Text style={s.deliveryLabel}>DELIVERY DATE</Text>
                    {deliveryDate ? (
                      <Text style={s.deliveryValue}>
                        {deliveryDate.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </Text>
                    ) : (
                      <Text style={s.deliveryPlaceholder}>Tap to choose a date</Text>
                    )}
                  </View>
                  {deliveryDate ? (
                    <View style={s.deliveryCheckBadge}>
                      <Check size={11} color={SUCCESS} strokeWidth={3} />
                    </View>
                  ) : (
                    <ChevronDown size={16} color="#9CA3AF" strokeWidth={2} />
                  )}
                </TouchableOpacity>

                {!!errors.deliveryDate && (
                  <View style={s.areaErrRow}>
                    <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                    <Text style={s.areaErrText}>{errors.deliveryDate}</Text>
                  </View>
                )}

                <View style={s.deliveryDivider} />

                {/* Time row */}
                <TouchableOpacity
                  style={[s.deliveryRow, deliveryTime && s.deliveryRowSet, !!errors.deliveryTime && s.deliveryRowError, { marginBottom: 0 }]}
                  onPress={() => { setShowTimePicker(true); clearFieldError('deliveryTime'); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.deliveryIconWrap, { backgroundColor: deliveryTime ? '#EDE9FE' : '#F3F4F6' }]}>
                    <Clock size={18} color={deliveryTime ? '#7C3AED' : '#9CA3AF'} strokeWidth={2} />
                  </View>
                  <View style={s.deliveryContent}>
                    <Text style={s.deliveryLabel}>PICKUP TIME</Text>
                    {deliveryTime ? (
                      <Text style={s.deliveryValue}>
                        {deliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    ) : (
                      <Text style={s.deliveryPlaceholder}>Tap to choose a time</Text>
                    )}
                  </View>
                  {deliveryTime ? (
                    <View style={s.deliveryCheckBadge}>
                      <Check size={11} color={SUCCESS} strokeWidth={3} />
                    </View>
                  ) : (
                    <ChevronDown size={16} color="#9CA3AF" strokeWidth={2} />
                  )}
                </TouchableOpacity>

                {!!errors.deliveryTime && (
                  <View style={s.areaErrRow}>
                    <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                    <Text style={s.areaErrText}>{errors.deliveryTime}</Text>
                  </View>
                )}

                {/* Confirmation summary */}
                {deliveryDate && deliveryTime && (
                  <View style={s.deliverySummary}>
                    <CheckCircle size={13} color={SUCCESS} strokeWidth={2} />
                    <Text style={s.deliverySummaryText}>
                      Scheduled for{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </Text>
                      {' at '}
                      <Text style={{ fontWeight: '700' }}>
                        {deliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </Text>
                  </View>
                )}

                {/* Android native pickers */}
                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker value={deliveryDate ?? new Date()} mode="date" minimumDate={new Date()} display="calendar"
                    onChange={(_: DateTimePickerEvent, date?: Date) => { setShowDatePicker(false); if (date) { setDeliveryDate(date); clearFieldError('deliveryDate'); } }} />
                )}
                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker value={deliveryTime ?? new Date()} mode="time" is24Hour={false} display="clock"
                    onChange={(_: DateTimePickerEvent, date?: Date) => { setShowTimePicker(false); if (date) { setDeliveryTime(date); clearFieldError('deliveryTime'); } }} />
                )}

                {/* iOS bottom-sheet picker */}
                <Modal visible={Platform.OS === 'ios' && (showDatePicker || showTimePicker)} transparent animationType="slide">
                  <View style={s.pickerModal}>
                    <View style={s.pickerSheet}>
                      <View style={s.pickerSheetHeader}>
                        <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                          <Text style={s.pickerCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={s.pickerSheetTitle}>{showDatePicker ? 'Delivery Date' : 'Pickup Time'}</Text>
                        <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                          <Text style={s.pickerDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      {showDatePicker && (
                        <DateTimePicker value={deliveryDate ?? new Date()} mode="date" minimumDate={new Date()} display="inline"
                          themeVariant="light" accentColor={PRIMARY} style={{ alignSelf: 'center' }}
                          onChange={(_: DateTimePickerEvent, date?: Date) => { if (date) { setDeliveryDate(date); clearFieldError('deliveryDate'); } }} />
                      )}
                      {showTimePicker && (
                        <DateTimePicker value={deliveryTime ?? new Date()} mode="time" is24Hour={false} display="spinner"
                          themeVariant="light" accentColor={PRIMARY} style={{ alignSelf: 'center' }}
                          onChange={(_: DateTimePickerEvent, date?: Date) => { if (date) { setDeliveryTime(date); clearFieldError('deliveryTime'); } }} />
                      )}
                    </View>
                  </View>
                </Modal>

              </SectionCard>

              {/* ── Additional Notes ── */}
              <SectionCard title="Additional Notes" iconBg="#F0FDF4" Icon={Clipboard} iconColor={SUCCESS}>
                <View style={[s.areaWrap, { marginBottom: 0 }]}>
                  <TextInput
                    style={[s.area, { minHeight: 90 }]}
                    value={additionalNotes}
                    onChangeText={setAdditionalNotes}
                    placeholder="Special instructions for the technician, parts to order, etc."
                    placeholderTextColor="#9CA3AF"
                    multiline numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </SectionCard>
            </>
          )}

          {/* ═══════ STEP 4 — Job Progress ═══════ */}
          {step === 4 && (() => {
            const hasTech     = !!selectedTechName;
            const tlItems = [
              {
                label: 'Job Created',
                desc:  customerName ? `Customer: ${customerName}` : 'New job card',
                color: '#2563EB', bg: '#DBEAFE',
                Icon: Clipboard,
                done: true, current: false,
              },
              {
                label: 'Technician Assigned',
                desc:  hasTech ? selectedTechName : 'Not yet assigned',
                color: '#D97706', bg: '#FEF3C7',
                Icon: Users,
                done: hasTech, current: !hasTech,
              },
              {
                label: 'Work In Progress',
                desc:  services.length ? `${services.length} service${services.length > 1 ? 's' : ''} scheduled` : '',
                color: '#7C3AED', bg: '#EDE9FE',
                Icon: Wrench,
                done: false, current: hasTech,
              },
              {
                label: 'Quality Check',
                desc:  'Inspection & sign-off',
                color: '#0891B2', bg: '#CFFAFE',
                Icon: CheckCircle,
                done: false, current: false,
              },
              {
                label: 'Ready for Delivery',
                desc:  deliveryDate
                  ? deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                  : 'Awaiting delivery date',
                color: '#059669', bg: '#D1FAE5',
                Icon: Tag,
                done: false, current: false,
              },
              {
                label: 'Job Completed',
                desc:  'Final billing & closure',
                color: '#16A34A', bg: '#DCFCE7',
                Icon: Check,
                done: false, current: false,
              },
            ];

            return (
              <SectionCard title="Job Timeline" iconBg="#F0FDF4" Icon={Activity} iconColor={SUCCESS}>
                {tlItems.map((item, i) => {
                  const isLast = i === tlItems.length - 1;
                  const lineColor = item.done ? item.color : '#E5E7EB';

                  return (
                    <View key={i} style={s.tlRow}>
                      {/* ── Left spine ── */}
                      <View style={s.tlLeft}>
                        {/* Circle */}
                        <View style={[
                          s.tlCircle,
                          {
                            backgroundColor: item.done || item.current ? item.bg  : '#F3F4F6',
                            borderColor:     item.done || item.current ? item.color : '#D1D5DB',
                            borderWidth:     item.current ? 2.5 : 1.5,
                          },
                        ]}>
                          {item.done
                            ? <Check size={12} color={item.color} strokeWidth={3} />
                            : item.current
                              ? <item.Icon size={12} color={item.color} strokeWidth={2} />
                              : <Text style={[s.tlNum, { color: '#D1D5DB' }]}>{i + 1}</Text>
                          }
                        </View>
                        {/* Connector */}
                        {!isLast && (
                          <View style={[s.tlLine, { backgroundColor: lineColor }]} />
                        )}
                      </View>

                      {/* ── Content ── */}
                      <View style={[s.tlContent, isLast && { paddingBottom: 0 }]}>
                        <Text style={[
                          s.tlLabel,
                          (item.done || item.current) ? { color: TEXT } : { color: '#9CA3AF' },
                          item.current && { fontWeight: '700' },
                        ]}>
                          {item.label}
                        </Text>
                        {!!item.desc && (
                          <Text style={[s.tlDesc, item.done && { color: item.color }]}>
                            {item.desc}
                          </Text>
                        )}
                        {item.current && (
                          <View style={[s.tlBadge, { backgroundColor: item.bg }]}>
                            <View style={[s.tlBadgeDot, { backgroundColor: item.color }]} />
                            <Text style={[s.tlBadgeText, { color: item.color }]}>
                              {i === 1 ? 'Assign Technician' : 'Up Next'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </SectionCard>
            );
          })()}

          {/* ═══════ STEP 5 — Invoice ═══════ */}
          {step === 5 && (
            <>
              <LinearGradient
                colors={['#921527', '#C41E3A', '#E11D48']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.invoiceHero}
              >
                <View style={s.invoiceCircle} />
                <View style={s.invoiceHeroTop}>
                  <View>
                    <Text style={s.invBrand}>{garageName}</Text>
                    {garageAddress ? <Text style={s.invTag}>{garageAddress}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.invNumLabel}>INVOICE</Text>
                    <Text style={s.invNum}>{invoiceNum}</Text>
                  </View>
                </View>
                <View style={s.invMeta}>
                  {[[User, customerName || '—'], [Hash, regNumber || '—'], [Calendar, new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })]].map(([Icon, val], i) => (
                    <View key={i} style={s.invMetaRow}>
                      {React.createElement(Icon as any, { size: 11, color: 'rgba(255,255,255,0.7)', strokeWidth: 2 })}
                      <Text style={s.invMetaText}>{val as string}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>

              {services.length > 0 && (
                <SectionCard title="Services" iconBg="#FEE2E2" Icon={Wrench} iconColor={PRIMARY}>
                  {services.map((sv, i) => (
                    <View key={i} style={[s.lineItem, i < services.length - 1 && { marginBottom: 12 }]}>
                      <Text style={s.lineItemName}>{sv.name}{sv.qty > 1 ? ` ×${sv.qty}` : ''}</Text>
                      <Text style={s.lineItemAmt}>{formatCurrency(sv.price * sv.qty)}</Text>
                    </View>
                  ))}
                </SectionCard>
              )}

              {labourTotal > 0 && (
                <SectionCard title="Labour" iconBg="#EDE9FE" Icon={Users} iconColor="#7C3AED">
                  <View style={s.lineItem}>
                    <Text style={s.lineItemName}>Labour Charge{estHours ? ` (${estHours}h)` : ''}</Text>
                    <Text style={s.lineItemAmt}>{formatCurrency(labourTotal)}</Text>
                  </View>
                </SectionCard>
              )}

              <View style={s.totalsCard}>
                {(
                  [
                    ['Services', servicesTotal] as [string, number],
                    labourTotal > 0 ? (['Labour', labourTotal] as [string, number]) : null,
                    ['Subtotal', subtotal] as [string, number],
                    ['GST (18%)', gst] as [string, number],
                  ].filter((r): r is [string, number] => r !== null)
                ).map(([label, val], i) => (
                  <View key={i} style={s.totalRow}>
                    <Text style={s.totalLabel}>{label}</Text>
                    <Text style={s.totalVal}>{formatCurrency(val)}</Text>
                  </View>
                ))}
                <View style={s.grandRow}>
                  <Text style={s.grandLabel}>Grand Total</Text>
                  <Text style={s.grandVal}>{formatCurrency(grandTotal)}</Text>
                </View>
              </View>

              <View style={s.invoiceActions}>
                <TouchableOpacity
                  style={[s.invoiceActionBtn, pdfLoading === 'download' && { opacity: 0.6 }]}
                  onPress={handleDownloadPdf} disabled={!!pdfLoading} activeOpacity={0.8}
                >
                  <View style={[s.invActionIcon, { backgroundColor: '#FEE2E2' }]}>
                    {pdfLoading === 'download'
                      ? <ActivityIndicator size="small" color={PRIMARY} />
                      : <Download size={16} color={PRIMARY} strokeWidth={2} />}
                  </View>
                  <Text style={s.invActionText}>Download PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.invoiceActionBtn, pdfLoading === 'share' && { opacity: 0.6 }]}
                  onPress={handleSharePdf} disabled={!!pdfLoading} activeOpacity={0.8}
                >
                  <View style={[s.invActionIcon, { backgroundColor: '#ECFDF5' }]}>
                    {pdfLoading === 'share'
                      ? <ActivityIndicator size="small" color={SUCCESS} />
                      : <Share2 size={16} color={SUCCESS} strokeWidth={2} />}
                  </View>
                  <Text style={s.invActionText}>Share Invoice</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Footer ── */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[s.footerBack, step === 0 && { opacity: 0.35 }]}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <ArrowLeft size={16} color={step === 0 ? '#9CA3AF' : TEXT} strokeWidth={2.5} />
          <Text style={[s.footerBackText, step === 0 && { color: '#9CA3AF' }]}>Back</Text>
        </TouchableOpacity>

        {step <= 3 && (
          <TouchableOpacity
            style={s.footerReset}
            onPress={handleReset}
            activeOpacity={0.8}
          >
            <RotateCcw size={15} color={DANGER} strokeWidth={2.5} />
            <Text style={s.footerResetText}>Reset</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.footerNext, isPending && { opacity: 0.65 }, step === 5 && { backgroundColor: SUCCESS }]}
          onPress={step === 5 ? () => router.replace('/(tabs)/jobs') : handleNext}
          disabled={isPending}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={s.footerNextText}>{nextLabel}</Text>
              {step < 5 && <ArrowRight size={16} color="#fff" strokeWidth={2.5} />}
              {step === 5 && <Check size={16} color="#fff" strokeWidth={2.5} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─────────────────────────── Styles ─────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1 },

  /* Header */
  header: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  headerSub:    { fontSize: 11, color: MUTED, marginTop: 2 },
  stepBadge: {
    minWidth: 38, height: 26, backgroundColor: '#F3F4F6', borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, flexShrink: 0,
  },
  stepBadgeText: { fontSize: 12, fontWeight: '700', color: TEXT },
  stepBadgeOf:   { fontSize: 10, fontWeight: '500', color: MUTED },

  /* Colourful step timeline */
  stepperWrap: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 12, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  stepperNode: { alignItems: 'center', width: 44, position: 'relative' },
  stepperGlow: {
    position: 'absolute', top: -4, width: 38, height: 38,
    borderRadius: 19, borderWidth: 4, zIndex: 0,
  },
  stepperCircle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, zIndex: 1,
  },
  stepperLabel: {
    fontSize: 8.5, fontWeight: '600', textAlign: 'center', lineHeight: 12,
  },
  stepperLine: {
    flex: 1, height: 2, borderRadius: 1, marginTop: 14,
  },

  /* Body */
  body: { padding: 16 },

  /* Chip */
  chipLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', letterSpacing: 0.6, marginBottom: 8, textTransform: 'uppercase' },
  chipRow:   { gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: CARD,
  },
  chipActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:       { fontSize: 13, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff' },

  /* Textarea */
  areaLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', letterSpacing: 0.6, marginBottom: 7, textTransform: 'uppercase' },
  areaWrap: {
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    marginBottom: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  areaError: { borderColor: DANGER, borderWidth: 2 },
  area: { padding: 14, fontSize: 14.5, color: TEXT, minHeight: 110, textAlignVertical: 'top' },
  areaErrRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -10, marginBottom: 12 },
  areaErrText: { fontSize: 11.5, color: DANGER, flex: 1 },

  /* Fuel */
  fuelRow: { flexDirection: 'row', gap: 7, marginBottom: 14 },
  fuelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F9FAFB', alignItems: 'center',
  },
  fuelBtnActive:  { backgroundColor: PRIMARY, borderColor: PRIMARY },
  fuelText:       { fontSize: 12, fontWeight: '700', color: MUTED },
  fuelTextActive: { color: '#fff' },
  gaugeTrack: { height: 6, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  gaugeFill:  { height: '100%', borderRadius: 3 },

  /* Photos */
  photoActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY + '33',
    backgroundColor: '#FEF2F2',
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  thumbRow:     { gap: 10, paddingBottom: 4 },
  thumbWrap:    { position: 'relative' },
  thumb:        { width: 90, height: 90, borderRadius: 12 },
  thumbDel: {
    position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11,
    backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center',
  },
  photoEmpty: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderStyle: 'dashed', backgroundColor: '#F9FAFB',
  },
  photoEmptyText: { fontSize: 13, color: MUTED },
  photoCount:     { fontSize: 12, color: MUTED, marginTop: 10, textAlign: 'center' },

  /* Documents */
  docHint:  { fontSize: 12, color: MUTED, marginBottom: 12 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY + '33',
    backgroundColor: '#FEF2F2', marginBottom: 12,
  },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  docList:  { gap: 8 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: BORDER,
  },
  docIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  docName:  { flex: 1, fontSize: 13, color: TEXT, fontWeight: '500' },
  docEmpty: { fontSize: 12, color: MUTED, textAlign: 'center', paddingVertical: 8 },

  /* Error banner */
  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5',
    padding: 13, marginBottom: 14,
  },
  errBannerText: { fontSize: 13, color: DANGER, fontWeight: '500', flex: 1 },

  /* Service search */
  searchRow:  { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, height: 52,
  },
  searchInput: { flex: 1, fontSize: 15, color: TEXT },
  addBtn: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  suggestChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1.5, borderColor: PRIMARY + '33', backgroundColor: '#FEF2F2',
  },
  suggestChipText: { fontSize: 12, fontWeight: '600', color: PRIMARY },

  /* Service items */
  svcItem:    { paddingVertical: 4 },
  svcLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  svcDot: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  svcName:    { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },
  svcRight:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 36 },
  priceWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: BORDER, borderRadius: 9,
    backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 8, flex: 1,
  },
  rupee:      { fontSize: 13, color: MUTED, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT, paddingVertical: 0 },
  qtyRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  qtyVal:     { fontSize: 14, fontWeight: '700', color: TEXT, minWidth: 22, textAlign: 'center' },
  svcTotal:   { fontSize: 14, fontWeight: '700', color: PRIMARY, minWidth: 66, textAlign: 'right' },
  svcDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginVertical: 12 },
  svcSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER,
  },
  svcSummaryLabel: { fontSize: 12, fontWeight: '700', color: MUTED, letterSpacing: 0.3 },
  svcSummaryValue: { fontSize: 20, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },

  /* Two column layout */
  twoCol: { flexDirection: 'row', gap: 12 },

  /* ── Labour tiles ──────────────────────────────────────── */
  labourGrid: { flexDirection: 'row', gap: 12 },
  labourTile: {
    flex: 1, backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, gap: 12,
  },
  labourTileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labourTileIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  labourTileLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase' },

  /* Stepper */
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  stepperVal: { alignItems: 'center' },
  stepperNum: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  stepperUnit: { fontSize: 10, fontWeight: '600', color: MUTED, marginTop: -2 },

  /* Labour charge input */
  labourAmtRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
    borderBottomWidth: 2, borderBottomColor: BORDER, paddingBottom: 6,
  },
  labourRupee: { fontSize: 20, fontWeight: '700', color: MUTED },
  labourAmtInput: { flex: 1, fontSize: 28, fontWeight: '800', color: TEXT, letterSpacing: -0.5, paddingVertical: 0 },
  labourAmtHint: { fontSize: 10.5, color: MUTED, fontWeight: '500' },

  /* ── Delivery rows ──────────────────────────────────────── */
  deliveryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, marginBottom: 0,
  },
  deliveryRowSet:   { /* no extra style needed — driven by child colors */ },
  deliveryRowError: { backgroundColor: '#FEF2F2', borderRadius: 10 },
  deliveryIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  deliveryContent: { flex: 1 },
  deliveryLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 4 },
  deliveryValue: { fontSize: 15, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  deliveryPlaceholder: { fontSize: 14, color: '#9CA3AF', fontWeight: '400' },
  deliveryCheckBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  deliveryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: -18 },
  deliverySummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, padding: 12, borderRadius: 10,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
  },
  deliverySummaryText: { fontSize: 12.5, color: '#166534', flex: 1, lineHeight: 18 },

  /* Picker modal */
  pickerCancel: { fontSize: 15, fontWeight: '500', color: MUTED },

  /* Technician */
  techCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: '#F9FAFB', marginBottom: 10,
  },
  techCardActive: { borderColor: PRIMARY, backgroundColor: '#FEF2F2' },
  techAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  techAvatarText: { fontSize: 18, fontWeight: '700', color: TEXT },
  techName:       { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  techRole:       { fontSize: 12, color: MUTED },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
  },
  availDot:   { width: 6, height: 6, borderRadius: 3 },
  availText:  { fontSize: 11, fontWeight: '600' },

  /* Picker */
  pickerBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  pickerIconWrap: {
    width: 34, height: 34, borderRadius: 9, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  pickerLabel:       { fontSize: 10, color: MUTED, fontWeight: '700', marginBottom: 2, letterSpacing: 0.4 },
  pickerVal:         { fontSize: 13, fontWeight: '600', color: TEXT },
  pickerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  pickerModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 32, overflow: 'hidden' },
  pickerSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  pickerDone:       { fontSize: 15, fontWeight: '700', color: PRIMARY },

  /* Timeline */
  /* ── Job Timeline (Step 4) ── */
  tlRow:    { flexDirection: 'row', gap: 14 },
  tlLeft:   { alignItems: 'center', width: 30 },
  tlCircle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  tlLine:   { width: 2, flex: 1, minHeight: 28, borderRadius: 1 },
  tlNum:    { fontSize: 10, fontWeight: '700' },
  tlContent:{ flex: 1, paddingBottom: 22, paddingTop: 3 },
  tlLabel:  { fontSize: 14, fontWeight: '600', color: TEXT },
  tlDesc:   { fontSize: 12, color: MUTED, marginTop: 3 },
  tlBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 7, alignSelf: 'flex-start',
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
  },
  tlBadgeDot:  { width: 6, height: 6, borderRadius: 3 },
  tlBadgeText: { fontSize: 11, fontWeight: '700' },

  /* Invoice */
  invoiceHero: {
    borderRadius: 18, padding: 22, marginBottom: 16, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#7B0E20', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  invoiceCircle: {
    position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  invoiceHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  invBrand:    { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  invTag:      { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  invNumLabel: { fontSize: 9.5, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, textTransform: 'uppercase' },
  invNum:      { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 3 },
  invMeta:     { gap: 6 },
  invMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 7 },
  invMetaText: { fontSize: 12.5, color: 'rgba(255,255,255,0.88)', fontWeight: '500' },

  lineItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineItemName: { fontSize: 13.5, color: TEXT, flex: 1 },
  lineItemAmt:  { fontSize: 13.5, fontWeight: '600', color: PRIMARY },

  totalsCard: {
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 16, gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  totalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:{ fontSize: 13, color: MUTED },
  totalVal:  { fontSize: 13, fontWeight: '500', color: TEXT },
  grandRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 14, marginTop: 2,
  },
  grandLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  grandVal:   { fontSize: 24, fontWeight: '800', color: PRIMARY, letterSpacing: -0.5 },

  invoiceActions: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  invoiceActionBtn: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      default: {},
    }),
  },
  invActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  invActionText: { fontSize: 12.5, fontWeight: '600', color: TEXT },

  /* Footer */
  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 14,
    backgroundColor: CARD, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 12 },
      android: { elevation: 10 },
      default: {},
    }),
  },
  footerBack: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 15, paddingHorizontal: 20,
    borderRadius: 13, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F3F4F6',
  },
  footerBackText: { fontSize: 14, fontWeight: '600', color: TEXT },
  footerReset: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 15, paddingHorizontal: 16,
    borderRadius: 13, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FFF5F5',
  },
  footerResetText: { fontSize: 14, fontWeight: '600', color: DANGER },
  footerNext: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 13, backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.32, shadowRadius: 12 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  footerNextText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
