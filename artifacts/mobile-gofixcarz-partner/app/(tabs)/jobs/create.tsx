import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Linking,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/src/constants/api';
import ServicePackageService from '@/src/services/service-package.service';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft, ArrowRight, Check, AlertCircle, ChevronDown, ChevronLeft, ChevronRight,
  User, Phone, Hash, Truck, Tag, GitBranch, Navigation, Gauge,
  Droplet, Clipboard, Camera, Search, Plus, Minus, Trash2,
  Users, Clock, Calendar, Wrench, Image as ImageIcon, Upload,
  FileText, Download, Share2, Activity, X, CheckCircle, RotateCcw,
  ExternalLink, MessageSquare,
} from 'lucide-react-native';
import JobService from '@/src/services/job.service';
import GarageService from '@/src/services/garage.service';
import ImageService from '@/src/services/image.service';
import SelectDropdown from '@/src/components/ui/SelectDropdown';
import { VEHICLE_BRANDS, getModelsForBrand } from '@/src/data/vehicleData';
import { formatCurrency } from '@/src/utils/helpers';
import { cleanMobileNumber } from '@/src/utils/validators';

/* ─────────────────────────── Tokens ─────────────────────────── */
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SUCCESS = '#059669';
const DANGER = '#EF4444';
const WARN = '#F59E0B';

const STEPS = [
  { label: 'Customer', Icon: User },
  { label: 'Inspect', Icon: Clipboard },
  { label: 'Services', Icon: Wrench },
  { label: 'Labour', Icon: Users },
  { label: 'Progress', Icon: Activity },
  { label: 'Invoice', Icon: FileText },
];

const FUEL_LEVELS = ['E', '1/4', '1/2', '3/4', 'F'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'];

type ServiceItem = { name: string; price: number; qty: number };
type PhotoItem = {
  id: string;
  uri: string;
  name?: string;
  objectKey?: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMsg?: string;
};
type DocItem = { uri: string; name: string; mimeType?: string };

/* ─────────────────────────── InlineInput ────────────────────── */
function InlineInput({
  label, value, onChangeText, placeholder, Icon, error,
  keyboardType, autoCapitalize, prefix, maxLength,
  multiline, numberOfLines, editable = true,
  textContentType, autoComplete, importantForAutofill,
}: {
  label?: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; Icon?: any; error?: string;
  keyboardType?: any; autoCapitalize?: any; prefix?: string;
  maxLength?: number; multiline?: boolean; numberOfLines?: number;
  editable?: boolean;
  textContentType?: any; autoComplete?: any; importantForAutofill?: any;
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
          textContentType={textContentType}
          autoComplete={autoComplete}
          importantForAutofill={importantForAutofill}
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
  wrap: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    minHeight: 46, overflow: 'hidden',
  },
  rowMulti: { alignItems: 'flex-start', minHeight: 88 },
  iconSlot: { width: 42, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  prefixSlot: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  prefixText: { fontSize: 13, fontWeight: '600', color: MUTED },
  prefixDivider: { width: 1, height: 16, backgroundColor: BORDER, marginLeft: 8 },
  field: { flex: 1, fontSize: 14, color: TEXT, paddingRight: 14, height: 46 },
  fieldMulti: { height: undefined, paddingTop: 10, paddingBottom: 10, paddingLeft: 4 },
  errRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errText: { fontSize: 11, color: DANGER, flex: 1 },
});

/* ─────────────────────────── SectionCard ───────────────────── */
function SectionCard({ title, iconBg, Icon, iconColor = PRIMARY, children }: {
  title: string; iconBg: string; Icon: any; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <View style={sc.group}>
      <View style={sc.header}>
        <View style={[sc.iconCircle, { backgroundColor: iconBg }]}>
          <Icon size={14} color={iconColor} strokeWidth={2.2} />
        </View>
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

const sc = StyleSheet.create({
  group: {
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 8, paddingHorizontal: 2,
  },
  iconCircle: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  body: { gap: 0 },
});

/* ─────────────────────────── Main screen ────────────────────── */
export default function CreateJobScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<'download' | 'share' | null>(null);

  const qc = useQueryClient();
  const invoiceNum = useRef(`INV-${Date.now().toString().slice(-6)}`).current;

  /* Garage profile — used for invoice branding */
  const { data: garage } = useQuery({
    queryKey: QUERY_KEYS.GARAGE,
    queryFn: GarageService.get,
    staleTime: 1000 * 60 * 10,
  });
  const garageName = garage?.name || 'My Garage';
  const garageAddress = [garage?.address, garage?.city, garage?.state].filter(Boolean).join(', ');
  const garagePhone = garage?.phone || '';

  /* Service packages — used for quick-add chips on the Services step */
  const { data: pkgsData, refetch: refetchPkgs } = useQuery({
    queryKey: QUERY_KEYS.SERVICE_PACKAGES({}),
    queryFn: () => ServicePackageService.list({ page_size: 100 }),
    staleTime: 0,
  });
  const servicePackages = pkgsData?.items ?? [];

  useFocusEffect(
    useCallback(() => {
      refetchPkgs();
    }, [refetchPkgs])
  );

  /* Step 0 */
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState('Petrol');
  const [odometer, setOdometer] = useState('');

  /* Step 1 */
  const [fuelLevel, setFuelLevel] = useState('1/2');
  const [complaint, setComplaint] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [beforePhotos, setBeforePhotos] = useState<PhotoItem[]>([]);
  const [documents, setDocuments] = useState<DocItem[]>([]);

  /* Step 2 */
  const [serviceSearch, setServiceSearch] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcPrice, setNewSvcPrice] = useState('');
  const [newSvcDesc, setNewSvcDesc] = useState('');
  const [newSvcError, setNewSvcError] = useState<string | null>(null);

  const isDuplicateQuickSvcName = React.useMemo(() => {
    if (!newSvcName.trim()) return false;
    const q = newSvcName.trim().toLowerCase();
    return servicePackages.some(pkg => pkg.name.trim().toLowerCase() === q) ||
      services.some(svc => svc.name.trim().toLowerCase() === q);
  }, [newSvcName, servicePackages, services]);

  const { mutate: createQuickService, isPending: isCreatingQuickSvc } = useMutation({
    mutationFn: async () => {
      if (!newSvcName.trim()) throw new Error('Service name is required.');
      if (isDuplicateQuickSvcName) throw new Error('This service already exists.');
      const p = parseFloat(newSvcPrice);
      if (isNaN(p) || p <= 0) throw new Error('Please enter a valid price.');

      return ServicePackageService.create({
        name: newSvcName.trim(),
        price: p,
        description: newSvcDesc.trim() || undefined,
        is_active: true,
      });
    },
    onSuccess: (newPkg) => {
      qc.invalidateQueries({ queryKey: ['service-packages'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PACKAGES() });
      refetchPkgs();

      setServices(prev => {
        const idx = prev.findIndex(svc => svc.name.toLowerCase() === newPkg.name.toLowerCase());
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
          return updated;
        }
        return [...prev, { name: newPkg.name, price: newPkg.price ?? 0, qty: 1 }];
      });
      clearFieldError('services');

      setNewSvcName('');
      setNewSvcPrice('');
      setNewSvcDesc('');
      setNewSvcError(null);
      setShowAddServiceModal(false);
    },
    onError: (err: any) => {
      setNewSvcError(err?.message || 'Failed to create service package.');
    },
  });

  /* Step 3 */
  const [selectedTechName, setSelectedTechName] = useState('');
  const [estHours, setEstHours] = useState('');
  const [labourCharge, setLabourCharge] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  /* Step 4/5 */
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const jobCreatedRef = useRef(false);
  const uncommittedKeysRef = useRef<Set<string>>(new Set());

  React.useEffect(() => {
    return () => {
      if (!jobCreatedRef.current && uncommittedKeysRef.current.size > 0) {
        console.log('[CreateJob] Cleaning up uncommitted S3 objects on exit...');
        uncommittedKeysRef.current.forEach(key => {
          ImageService.deleteObjectKey(key);
        });
        uncommittedKeysRef.current.clear();
      }
    };
  }, []);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  function isTodayDate(d?: Date | null): boolean {
    if (!d) return false;
    const now = new Date();
    return d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  }

  function isTomorrowDate(d?: Date | null): boolean {
    if (!d) return false;
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    return d.getDate() === tom.getDate() &&
      d.getMonth() === tom.getMonth() &&
      d.getFullYear() === tom.getFullYear();
  }

  const PICKUP_TIME_SLOTS = [
    { label: '10:00 AM', h: 10, m: 0, tag: 'Morning' },
    { label: '11:30 AM', h: 11, m: 30, tag: 'Morning' },
    { label: '02:00 PM', h: 14, m: 0, tag: 'Afternoon' },
    { label: '04:00 PM', h: 16, m: 0, tag: 'Afternoon' },
    { label: '06:00 PM', h: 18, m: 0, tag: 'Evening' },
    { label: '07:30 PM', h: 19, m: 30, tag: 'Evening' },
  ];

  function isTimeSlotInPast(slot: { h: number; m: number }, targetDate?: Date | null, hours = 0): boolean {
    if (!targetDate) return false;
    if (!isTodayDate(targetDate)) return false; // Tomorrow or future date -> enabled!

    const now = new Date();
    const requiredBufferMs = Math.max(0, hours) * 3600 * 1000;
    const minTimeMs = now.getTime() + requiredBufferMs;

    const slotDate = new Date(targetDate);
    slotDate.setHours(slot.h, slot.m, 0, 0);

    return slotDate.getTime() < minTimeMs;
  }

  function selectQuickDate(type: 'today' | 'tomorrow') {
    const d = new Date();
    if (type === 'tomorrow') {
      d.setDate(d.getDate() + 1);
    }
    setDeliveryDate(d);
    clearFieldError('deliveryDate');

    if (type === 'today' && deliveryTime) {
      const slot = { h: deliveryTime.getHours(), m: deliveryTime.getMinutes() };
      const hNum = parseFloat(estHours || '0');
      if (isTimeSlotInPast(slot, d, hNum)) {
        setDeliveryTime(null);
      }
    }
  }

  const servicesTotal = services.reduce((sum, s) => sum + s.price * s.qty, 0);
  const labourTotal = parseFloat(labourCharge) || 0;
  const grandTotal = servicesTotal + labourTotal;

  /* ── Invoice HTML ── */
  function buildInvoiceHtml() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dueStr = deliveryDate
      ? deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : 'On Completion';
    const deliveryTimeStr = deliveryTime
      ? deliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : '';
    const vehicleLabel = [brand, model, fuelType].filter(Boolean).join(' · ') || '—';
    const logoUrl = garage?.logo_url || null;

    const serviceRows = services.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding:12px 14px; border-bottom:1px solid #E2E8F0; color:#64748B; font-weight:600; text-align:center;">${i + 1}</td>
        <td style="padding:12px 14px; border-bottom:1px solid #E2E8F0;">
          <div style="font-weight:700; color:#0F172A; font-size:13px;">${s.name}</div>
        </td>
        <td style="padding:12px 14px; border-bottom:1px solid #E2E8F0; text-align:center; color:#334155; font-weight:600;">${s.qty}</td>
        <td style="padding:12px 14px; border-bottom:1px solid #E2E8F0; text-align:right; color:#475569; font-weight:500;">${formatCurrency(s.price)}</td>
        <td style="padding:12px 14px; border-bottom:1px solid #E2E8F0; text-align:right; font-weight:700; color:#0F172A;">${formatCurrency(s.price * s.qty)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color:#0F172A; background:#F1F5F9; font-size:13px; -webkit-print-color-adjust: exact; }
    .page { max-width:720px; margin:0 auto; background:#FFFFFF; box-shadow:0 10px 25px -5px rgba(0,0,0,0.1); border-radius:12px; overflow:hidden; }
    
    /* Header */
    .header { background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #1E40AF 100%); padding:36px; color:#FFFFFF; position:relative; }
    .header-top { display:flex; justify-content:space-between; align-items:flex-start; }
    .logo-brand { display:flex; align-items:center; gap:14px; }
    .garage-logo { width:52px; height:52px; border-radius:10px; object-fit:cover; border:2px solid rgba(255,255,255,0.2); }
    .brand-name { font-size:24px; font-weight:800; letter-spacing:-0.5px; color:#FFFFFF; }
    .brand-sub { font-size:11px; opacity:0.8; margin-top:3px; color:#93C5FD; }
    
    .inv-badge-block { text-align:right; }
    .tax-tag { display:inline-block; padding:4px 12px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px; color:#60A5FA; margin-bottom:6px; }
    .inv-number { font-size:22px; font-weight:800; color:#FFFFFF; letter-spacing:-0.5px; }
    .inv-date { font-size:11px; color:#93C5FD; margin-top:4px; }
    
    /* Info Cards Grid */
    .info-grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; padding:24px 36px; background:#F8FAFC; border-bottom:1px solid #E2E8F0; }
    .info-card { background:#FFFFFF; padding:14px 18px; border-radius:10px; border:1px solid #E2E8F0; }
    .card-title { font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
    .card-main { font-size:15px; font-weight:700; color:#0F172A; margin-bottom:3px; }
    .card-sub { font-size:12px; color:#475569; line-height:1.4; }
    .reg-badge { display:inline-block; padding:2px 8px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:6px; font-weight:700; color:#1D4ED8; font-size:13px; }
    
    /* Content Table */
    .table-container { padding:24px 36px 12px; }
    .table-title { font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; }
    .items-table { width:100%; border-collapse:collapse; border-radius:8px; overflow:hidden; border:1px solid #E2E8F0; }
    .items-table thead tr { background:#1E293B; color:#FFFFFF; }
    .items-table thead th { padding:12px 14px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; }
    
    .labour-row { background:#FFFBEB; border:1px solid #FDE68A; padding:14px 18px; border-radius:10px; margin:16px 36px; display:flex; justify-content:space-between; align-items:center; }
    .labour-title { font-weight:700; color:#92400E; font-size:13px; }
    .labour-sub { font-size:11px; color:#B45309; margin-top:2px; }
    .labour-val { font-size:14px; font-weight:800; color:#92400E; }
    
    /* Summary Block */
    .summary-wrap { display:flex; justify-content:space-between; align-items:flex-end; padding:16px 36px 28px; }
    .notes-box { flex:1; max-width:320px; padding:14px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; }
    .notes-h { font-size:10px; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px; }
    .notes-b { font-size:11px; color:#334155; line-height:1.5; }
    
    .totals-box { width:260px; text-align:right; }
    .tot-row { display:flex; justify-content:space-between; padding:5px 0; font-size:12px; color:#475569; }
    .tot-val { font-weight:600; color:#0F172A; }
    
    .grand-box { margin-top:12px; background:linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); padding:14px 18px; border-radius:10px; color:#FFFFFF; display:flex; justify-content:space-between; align-items:center; }
    .grand-lbl { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#DBEAFE; }
    .grand-val { font-size:22px; font-weight:800; color:#FFFFFF; }
    
    /* Footer */
    .footer { background:#F8FAFC; border-top:1px solid #E2E8F0; padding:20px 36px; display:flex; justify-content:space-between; align-items:center; }
    .footer-left { font-size:11px; color:#64748B; }
    .footer-right { font-size:11px; color:#94A3B8; text-align:right; }
    .seal-badge { display:inline-block; font-size:10px; font-weight:700; color:#059669; background:#ECFDF5; border:1px solid #A7F3D0; padding:3px 8px; border-radius:6px; margin-top:4px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-top">
        <div class="logo-brand">
          ${logoUrl ? `<img src="${logoUrl}" class="garage-logo" alt="Logo"/>` : ''}
          <div>
            <div class="brand-name">${garageName}</div>
            ${garageAddress ? `<div class="brand-sub">📍 ${garageAddress}</div>` : ''}
            ${garagePhone ? `<div class="brand-sub">📞 ${garagePhone}</div>` : ''}
          </div>
        </div>
        <div class="inv-badge-block">
          <div class="tax-tag">Official Tax Invoice</div>
          <div class="inv-number">${invoiceNum}</div>
          <div class="inv-date">Issued: ${dateStr} · ${timeStr}</div>
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="card-title">👤 Customer Details</div>
        <div class="card-main">${customerName || 'Customer'}</div>
        <div class="card-sub">📱 ${customerPhone || '—'}</div>
      </div>
      <div class="info-card">
        <div class="card-title">🚗 Vehicle Specification</div>
        <div class="card-main"><span class="reg-badge">${regNumber || '—'}</span></div>
        <div class="card-sub" style="margin-top:4px;">${vehicleLabel}</div>
        ${odometer ? `<div class="card-sub">Odometer: <b>${odometer} km</b></div>` : ''}
      </div>
    </div>

    <div class="table-container">
      <div class="table-title">Services &amp; Parts Provided</div>
      ${services.length > 0 ? `
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:40px; text-align:center;">#</th>
            <th style="text-align:left;">Service Description</th>
            <th style="text-align:center; width:60px;">Qty</th>
            <th style="text-align:right; width:110px;">Price</th>
            <th style="text-align:right; width:120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRows}
        </tbody>
      </table>
      ` : `<div style="padding:16px; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:8px; color:#64748B; text-align:center;">No individual service packages added.</div>`}
    </div>

    ${labourTotal > 0 ? `
    <div class="labour-row">
      <div>
        <div class="labour-title">⚙️ Workshop Labour &amp; Inspection</div>
        ${estHours ? `<div class="labour-sub">${estHours} hrs estimated work time</div>` : ''}
      </div>
      <div class="labour-val">${formatCurrency(labourTotal)}</div>
    </div>
    ` : ''}

    <div class="summary-wrap">
      <div class="notes-box">
        <div class="notes-h">Workshop Notes &amp; Warranty</div>
        <div class="notes-b">${additionalNotes || complaint || 'Thank you for choosing us for your car service! All parts replaced carry manufacturer warranty.'}</div>
      </div>

      <div class="totals-box">
        <div class="tot-row"><span>Services Total:</span><span class="tot-val">${formatCurrency(servicesTotal)}</span></div>
        ${labourTotal > 0 ? `<div class="tot-row"><span>Labour Charge:</span><span class="tot-val">${formatCurrency(labourTotal)}</span></div>` : ''}
        
        <div class="grand-box">
          <span class="grand-lbl">Grand Total</span>
          <span class="grand-val">${formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <div><b>${garageName}</b></div>
        <div class="seal-badge">✓ Computer Generated Official Invoice</div>
      </div>
      <div class="footer-right">
        <div>Expected Pickup: <b>${dueStr} ${deliveryTimeStr}</b></div>
        <div style="margin-top:2px; opacity:0.8;">Payment Due on Vehicle Delivery</div>
      </div>
    </div>
  </div>
</body>
</html>`;
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

  function shareJobOnWhatsApp() {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const dueStr = deliveryDate ? deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'On completion';
    const dueTimeStr = deliveryTime ? deliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    const jobNum = createdJobId ? `#${createdJobId.slice(-6).toUpperCase()}` : `#${invoiceNum}`;
    const msg = `Hello ${customerName || 'Customer'},\n\nYour Job Card (${jobNum}) for ${brand} ${model} (${regNumber}) has been created successfully at ${garageName}.\n\n🗓️ Expected Pickup: ${dueStr} ${dueTimeStr}\n💰 Estimated Amount: ${formatCurrency(grandTotal)}\n\nThank you for choosing ${garageName}!`;
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Unavailable', 'Could not open WhatsApp on this device.');
    });
  }

  /* ── Validation ── */
  function validateStep(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!customerName.trim()) errs.customerName = 'Customer name is required.';
      if (!regNumber.trim()) errs.regNumber = 'Registration number is required.';
      if (!brand.trim()) errs.brand = 'Vehicle brand is required.';
      if (!model.trim()) errs.model = 'Vehicle model is required.';
      if (!customerPhone.trim()) {
        errs.customerPhone = 'Customer mobile number is required.';
      } else if (customerPhone.replace(/\D/g, '').length !== 10) {
        errs.customerPhone = 'Please enter a valid 10-digit mobile number.';
      }
      if (!odometer.trim()) errs.odometer = 'Odometer reading (km) is required.';
      else if (parseFloat(odometer) < 0) errs.odometer = 'Odometer reading must be a positive number.';
    }
    if (step === 1) { if (!complaint.trim()) errs.complaint = 'Customer complaint is required.'; }
    if (step === 2) { if (services.length === 0) errs.services = 'Please add at least one service.'; }
    if (step === 3) {
      if (!selectedTechName.trim()) errs.technician = 'Please assign a technician.';
      if (!estHours.trim() || parseFloat(estHours) <= 0) errs.estHours = 'Please enter expected hours.';
      if (!deliveryDate) errs.deliveryDate = 'Please select an expected delivery date.';
      if (!deliveryTime) {
        errs.deliveryTime = 'Please select an expected pickup time.';
      } else if (deliveryDate && isTodayDate(deliveryDate)) {
        const slot = { h: deliveryTime.getHours(), m: deliveryTime.getMinutes() };
        if (isTimeSlotInPast(slot, deliveryDate)) {
          errs.deliveryTime = 'Selected pickup time is in the past. Please select a valid future time slot.';
        }
      }
    }
    return errs;
  }

  function clearFieldError(key: string) {
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  /* ── Mutation ── */
  const { mutate: saveJobCard, isPending } = useMutation({
    mutationFn: async () => {
      // Collect successful S3 object keys from beforePhotos
      const photoKeys = beforePhotos
        .filter(p => p.status === 'success' && p.objectKey)
        .map(p => p.objectKey!);

      let docKeys: string[] = [];
      if (documents.length > 0) {
        docKeys = await Promise.all(
          documents.map(async d => {
            try {
              const rawKey = await ImageService.uploadToS3(d.uri, 'doc');
              const key = rawKey.toLowerCase().includes('doc') ? rawKey : rawKey.replace(/^([^/]+\/)?/, '$1doc_');
              ImageService.registerLocalPhoto(key, d.uri);
              if (rawKey) ImageService.registerLocalPhoto(rawKey, d.uri);
              return key;
            } catch (uploadErr) {
              console.warn('[JobCreate] S3 document upload failed:', uploadErr);
              const fileName = d.uri.split('/').pop() || `doc_${Date.now()}.jpg`;
              const fallbackKey = `jobs/doc/${fileName}`;
              ImageService.registerLocalPhoto(fallbackKey, d.uri);
              return fallbackKey;
            }
          })
        );
      }

      const documentKeys = docKeys;
      const allPhotoKeys = Array.from(new Set([...photoKeys, ...documentKeys]));

      const hasServices = services.length > 0;
      const hasLabour = parseFloat(labourCharge) > 0;
      const hasInspect = !!(complaint || inspectionNotes);

      // If job card was ALREADY created during this wizard session, update existing job to prevent duplicate creation!
      if (createdJobId) {
        const updatedJob = await JobService.update(createdJobId, {
          description: additionalNotes || null,
          estimated_amount: grandTotal || null,
          ...(allPhotoKeys.length > 0 && { photos: allPhotoKeys }),
          ...(documentKeys.length > 0 && { documents: documentKeys }),
          ...(hasInspect && { inspection: { findings: [complaint, inspectionNotes].filter(Boolean).join('\n') } }),
          ...(hasServices && { services: services.map(s => ({ name: s.name, price: s.price, qty: s.qty })) }),
          ...(hasLabour && { labour: { charge: parseFloat(labourCharge), description: estHours ? `${estHours} hrs` : null } }),
        });
        return updatedJob;
      }

      // Step 1: create the job with customer + vehicle basics & S3 photo keys
      const job = await JobService.create({
        customer_name: customerName || null,
        customer_mobile: customerPhone || null,
        registration_number: regNumber || null,
        brand: brand || null,
        vehicle_model: model || null,
        fuel_type: fuelType || null,
        odometer_km: parseFloat(odometer) || null,
        description: additionalNotes || null,
        estimated_amount: grandTotal || null,
        photos: allPhotoKeys.length > 0 ? allPhotoKeys : null,
        documents: documentKeys.length > 0 ? documentKeys : null,
      });

      // Step 2: enrich the job with services, labour, and inspection data
      if (job?.id && (hasServices || hasLabour || hasInspect)) {
        await JobService.update(job.id, {
          ...(allPhotoKeys.length > 0 && { photos: allPhotoKeys }),
          ...(documentKeys.length > 0 && { documents: documentKeys }),
          ...(hasInspect && { inspection: { findings: [complaint, inspectionNotes].filter(Boolean).join('\n') } }),
          ...(hasServices && { services: services.map(s => ({ name: s.name, price: s.price, qty: s.qty })) }),
          ...(hasLabour && { labour: { charge: parseFloat(labourCharge), description: estHours ? `${estHours} hrs` : null } }),
        });
      }

      return job;
    },
    onSuccess: (job) => {
      jobCreatedRef.current = true;
      uncommittedKeysRef.current.clear();
      setCreateError(null);
      if (job?.id) setCreatedJobId(job.id);
      // Invalidate list & dashboard so the new job shows immediately in jobs list & analytics
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      setStep(4);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.';
      setCreateError(msg);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      Alert.alert('Failed to Save Job Card', msg);
    },
  });

  function handleNext() {
    if (isPending) return;

    const errs = validateStep();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setErrors({});
    setCreateError(null);
    if (step === 3) { saveJobCard(); return; }
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
            setCreatedJobId(null);
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
  function updateServicePrice(i: number, price: string) {
    setServices(s => s.map((item, idx) => idx === i ? { ...item, price: parseFloat(price) || 0 } : item));
  }
  function updateQty(i: number, delta: number) {
    setServices(s => s.map((item, idx) => idx === i ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  }
  function removeService(i: number) {
    setServices(s => s.filter((_, idx) => idx !== i));
  }

  /* ── Camera / Gallery & S3 Upload ── */
  const isAnyPhotoUploading = beforePhotos.some(p => p.status === 'uploading');

  async function uploadSinglePhoto(id: string, uri: string) {
    setBeforePhotos(prev =>
      prev.map(p => (p.id === id ? { ...p, status: 'uploading', errorMsg: undefined, progress: 30 } : p))
    );

    try {
      const objectKey = await ImageService.uploadToS3(uri, 'before-service');
      if (objectKey) {
        ImageService.registerLocalPhoto(objectKey, uri);
        uncommittedKeysRef.current.add(objectKey);
      }
      setBeforePhotos(prev =>
        prev.map(p => (p.id === id ? { ...p, status: 'success', objectKey, progress: 100 } : p))
      );
    } catch (err: any) {
      console.warn('[CreateJob] S3 photo upload failed:', err);
      setBeforePhotos(prev =>
        prev.map(p =>
          p.id === id ? { ...p, status: 'error', errorMsg: err?.message || 'Upload failed' } : p
        )
      );
    }
  }

  async function addPhotoUris(uris: string[]) {
    const MAX_BEFORE_PHOTOS = 4;
    if (beforePhotos.length >= MAX_BEFORE_PHOTOS) {
      Alert.alert('Photo Limit Reached', 'You can upload a maximum of 4 before service photos.');
      return;
    }

    const existingUris = new Set(beforePhotos.map(p => p.uri));
    const newUris = uris.filter(u => !existingUris.has(u));

    if (newUris.length === 0) {
      if (uris.length > 0) {
        Alert.alert('Duplicate Photo', 'This image has already been added.');
      }
      return;
    }

    const availableSlots = MAX_BEFORE_PHOTOS - beforePhotos.length;
    let allowedUris = newUris;
    if (newUris.length > availableSlots) {
      Alert.alert(
        'Maximum 4 Photos Allowed',
        `You can only upload up to 4 before service photos. Only the first ${availableSlots} selected photo${availableSlots > 1 ? 's' : ''} will be added.`
      );
      allowedUris = newUris.slice(0, availableSlots);
    }

    const newItems: PhotoItem[] = [];
    for (const uri of allowedUris) {
      try {
        await ImageService.validateImageFile(uri);
        const item: PhotoItem = {
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          uri,
          status: 'uploading',
          progress: 20,
        };
        newItems.push(item);
      } catch (valErr: any) {
        Alert.alert('Invalid Image', valErr?.message || 'Selected file is invalid.');
      }
    }

    if (newItems.length === 0) return;

    setBeforePhotos(prev => [...prev, ...newItems]);

    // Trigger async S3 uploads for each valid photo
    newItems.forEach(item => {
      uploadSinglePhoto(item.id, item.uri);
    });
  }

  async function pickFromCamera() {
    if (isAnyPhotoUploading) return;
    if (beforePhotos.length >= 4) {
      Alert.alert('Photo Limit Reached', 'You can upload a maximum of 4 before service photos.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access is needed to take photos.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      await addPhotoUris([result.assets[0].uri]);
    }
  }

  async function pickFromGallery() {
    if (isAnyPhotoUploading) return;
    if (beforePhotos.length >= 4) {
      Alert.alert('Photo Limit Reached', 'You can upload a maximum of 4 before service photos.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Photo library access is needed.'); return; }
    const remainingSlots = Math.max(1, 4 - beforePhotos.length);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
    });
    if (!result.canceled && result.assets.length > 0) {
      await addPhotoUris(result.assets.map(a => a.uri));
    }
  }

  async function removePhoto(id: string) {
    const target = beforePhotos.find(p => p.id === id);
    if (target?.objectKey) {
      uncommittedKeysRef.current.delete(target.objectKey);
      // Clean up S3 object key on backend
      ImageService.deleteObjectKey(target.objectKey);
    }
    setBeforePhotos(prev => prev.filter(p => p.id !== id));
  }

  function retryPhotoUpload(id: string) {
    const target = beforePhotos.find(p => p.id === id);
    if (target) {
      uploadSinglePhoto(target.id, target.uri);
    }
  }

  async function pickDocumentFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access is needed to take document photos.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const a = result.assets[0];
      const newDoc = { uri: a.uri, name: a.fileName ?? `doc_${Date.now()}.jpg`, mimeType: a.mimeType };
      setDocuments(prev => [...prev, newDoc]);
    }
  }

  async function pickDocumentFromGallery() {
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
        <TouchableOpacity
          style={s.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>New Job Card</Text>
          <Text style={s.headerSub}>{STEPS[step].label} · Step {step + 1} of {STEPS.length}</Text>
        </View>
        <View style={s.stepBadge}>
          <Text style={s.stepBadgeText}>{step + 1}<Text style={s.stepBadgeOf}>/{STEPS.length}</Text></Text>
        </View>
      </View>

      {/* ── Progress segments ── */}
      <View style={s.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.seg, i < step && s.segDone, i === step && s.segActive]} />
        ))}
      </View>

      {/* ── Step pills scroll ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.stepPillsRow}
        style={s.stepPillsScroll}
      >
        {STEPS.map((st, i) => {
          const { Icon } = st;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <TouchableOpacity
              key={i}
              style={[
                s.stepPill,
                isActive && s.stepPillActive,
                isDone && s.stepPillDone,
              ]}
              onPress={() => {
                if (i < step) {
                  setStep(i);
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }
              }}
              activeOpacity={0.75}
            >
              <Icon
                size={13}
                color={isActive ? '#FFFFFF' : isDone ? '#059669' : '#9CA3AF'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  s.stepPillText,
                  isActive && s.stepPillTextActive,
                  isDone && s.stepPillTextDone,
                ]}
              >
                {st.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? undefined : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        >

          {/* ═══════ STEP 0 — Customer & Vehicle ═══════ */}
          {step === 0 && (
            <>
              <SectionCard title="Customer Information" iconBg="#EFF6FF" Icon={User} iconColor={PRIMARY}>
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
                  label="Phone Number *"
                  value={customerPhone}
                  onChangeText={v => { setCustomerPhone(cleanMobileNumber(v)); clearFieldError('customerPhone'); }}
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  Icon={Phone}
                  prefix="+91"
                  maxLength={15}
                  textContentType="telephoneNumber"
                  autoComplete="tel"
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
                  textContentType="none"
                  autoComplete="off"
                  importantForAutofill="no"
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
                  label="Odometer (km) *"
                  value={odometer}
                  onChangeText={v => { setOdometer(v.replace(/\D/g, '').slice(0, 7)); clearFieldError('odometer'); }}
                  placeholder="e.g. 45230"
                  keyboardType="number-pad"
                  Icon={Gauge}
                  maxLength={7}
                  textContentType="none"
                  autoComplete="off"
                  importantForAutofill="no"
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

              <SectionCard title="Inspection Details" iconBg="#EFF6FF" Icon={Clipboard} iconColor={PRIMARY}>
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
                  <TouchableOpacity
                    style={[s.photoBtn, { flex: 1 }, (isAnyPhotoUploading || beforePhotos.length >= 4) && { opacity: 0.5 }]}
                    onPress={pickFromCamera}
                    disabled={isAnyPhotoUploading || beforePhotos.length >= 4}
                    activeOpacity={0.85}
                  >
                    <Camera size={18} color={beforePhotos.length >= 4 ? "#9CA3AF" : PRIMARY} strokeWidth={2} />
                    <Text style={[s.photoBtnText, beforePhotos.length >= 4 && { color: "#9CA3AF" }]}>Take Photo (Camera Only)</Text>
                  </TouchableOpacity>
                </View>

                {beforePhotos.length >= 4 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FEF3C7', marginBottom: 12, borderWidth: 1, borderColor: '#FCD34D' }}>
                    <AlertCircle size={14} color="#D97706" strokeWidth={2} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400E', flex: 1 }}>
                      Maximum 4 before service photos reached (4/4). Remove a photo to upload another.
                    </Text>
                  </View>
                )}

                {beforePhotos.length > 0 ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbRow}>
                      {beforePhotos.map((p) => (
                        <View key={p.id} style={s.thumbWrap}>
                          <Image source={{ uri: p.uri }} style={s.thumb} />

                          {p.status === 'uploading' && (
                            <View style={s.thumbOverlayUploading}>
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            </View>
                          )}

                          {p.status === 'success' && (
                            <View style={s.thumbBadgeSuccess}>
                              <Check size={9} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          )}

                          {p.status === 'error' && (
                            <TouchableOpacity
                              style={s.thumbOverlayError}
                              onPress={() => retryPhotoUpload(p.id)}
                              activeOpacity={0.8}
                            >
                              <RotateCcw size={14} color="#FFFFFF" strokeWidth={2.5} />
                              <Text style={s.thumbRetryText}>Retry</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={s.thumbDel}
                            onPress={() => removePhoto(p.id)}
                            disabled={p.status === 'uploading'}
                            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                          >
                            <X size={10} color="#fff" strokeWidth={3} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                    <Text style={s.photoCount}>
                      {beforePhotos.filter(p => p.status === 'success').length} of {beforePhotos.length} photo{beforePhotos.length > 1 ? 's' : ''} ready (Max 4 photos)
                    </Text>
                  </>
                ) : (
                  <View style={s.photoEmpty}>
                    <ImageIcon size={24} color="#D1D5DB" strokeWidth={1.5} />
                    <Text style={s.photoEmptyText}>No photos added yet (Max 4 photos, JPEG/PNG ≤ 5MB)</Text>
                  </View>
                )}
              </SectionCard>

              <SectionCard title="Attach Documents" iconBg="#FFFBEB" Icon={FileText} iconColor={WARN}>
                <Text style={s.docHint}>RC Book, Insurance, Previous service records, etc.</Text>
                <View style={s.photoActionsRow}>
                  <TouchableOpacity style={s.photoBtn} onPress={pickDocumentFromCamera} activeOpacity={0.85}>
                    <Camera size={16} color={PRIMARY} strokeWidth={2} />
                    <Text style={s.photoBtnText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.photoBtn} onPress={pickDocumentFromGallery} activeOpacity={0.85}>
                    <ImageIcon size={16} color={PRIMARY} strokeWidth={2} />
                    <Text style={s.photoBtnText}>Select from Gallery</Text>
                  </TouchableOpacity>
                </View>
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

              <SectionCard title="Add Services" iconBg="#EFF6FF" Icon={Wrench} iconColor={PRIMARY}>
                <View style={s.searchRow}>
                  <View style={[s.searchBox, { flex: 1 }]}>
                    <Search size={15} color="#9CA3AF" strokeWidth={2} />
                    <TextInput
                      style={s.searchInput}
                      value={serviceSearch}
                      onChangeText={setServiceSearch}
                      placeholder="Search services…"
                      placeholderTextColor="#9CA3AF"
                      returnKeyType="search"
                    />
                    {!!serviceSearch && (
                      <TouchableOpacity
                        onPress={() => setServiceSearch('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={14} color="#9CA3AF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.chipLabel}>AVAILABLE SERVICES</Text>
                    {servicePackages.length > 0 && (
                      <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: PRIMARY }}>{servicePackages.length}</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/services/create?from=job_create' as never)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    activeOpacity={0.7}
                  >
                    <Plus size={11} color={PRIMARY} strokeWidth={2.5} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY }}>Manage Services</Text>
                  </TouchableOpacity>
                </View>

                {(() => {
                  const filteredPackages = servicePackages.filter(pkg =>
                    pkg.name.toLowerCase().includes(serviceSearch.trim().toLowerCase())
                  );

                  if (filteredPackages.length > 0) {
                    return (
                      <View style={s.pkgGrid}>
                        {filteredPackages.map(pkg => {
                          const addedItem = services.find(svc => svc.name.toLowerCase() === pkg.name.toLowerCase());
                          const isAdded = !!addedItem;
                          const qty = addedItem?.qty ?? 0;
                          return (
                            <TouchableOpacity
                              key={pkg.id}
                              style={[s.pkgGridCard, isAdded && s.pkgGridCardAdded]}
                              onPress={() => {
                                setServices(prev => {
                                  const idx = prev.findIndex(svc => svc.name.toLowerCase() === pkg.name.toLowerCase());
                                  if (idx >= 0) {
                                    const updated = [...prev];
                                    updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
                                    return updated;
                                  }
                                  return [...prev, { name: pkg.name, price: pkg.price ?? 0, qty: 1 }];
                                });
                                clearFieldError('services');
                              }}
                              activeOpacity={0.8}
                            >
                              <View style={s.pkgGridTop}>
                                <Text style={[s.pkgGridName, isAdded && { color: SUCCESS }]} numberOfLines={2}>
                                  {pkg.name}
                                </Text>
                              </View>

                              <View style={s.pkgGridBottom}>
                                <Text style={[s.pkgGridPrice, isAdded && { color: SUCCESS }]}>
                                  {formatCurrency(pkg.price)}
                                </Text>
                                <View style={[s.pkgGridBadge, isAdded && s.pkgGridBadgeAdded]}>
                                  {isAdded ? (
                                    <>
                                      <Check size={10} color={SUCCESS} strokeWidth={3} />
                                      <Text style={s.pkgGridBadgeTextAdded}>
                                        {qty > 1 ? `Added ×${qty}` : 'Added'}
                                      </Text>
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={10} color={PRIMARY} strokeWidth={3} />
                                      <Text style={s.pkgGridBadgeText}>Add</Text>
                                    </>
                                  )}
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  }

                  if (serviceSearch.trim().length > 0) {
                    return (
                      <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                        <Search size={22} color="#9CA3AF" strokeWidth={1.5} />
                        <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
                          No matching service found for "{serviceSearch}"
                        </Text>
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      style={[s.suggestChip, { borderStyle: 'dashed', marginTop: 4 }]}
                      onPress={() => setShowAddServiceModal(true)}
                      activeOpacity={0.8}
                    >
                      <Plus size={11} color={PRIMARY} strokeWidth={2.5} />
                      <Text style={s.suggestChipText}>+ Add Custom Service Package</Text>
                    </TouchableOpacity>
                  );
                })()}
              </SectionCard>

              {services.length > 0 && (
                <SectionCard title={`Services Added (${services.length})`} iconBg="#F0FDF4" Icon={Check} iconColor={SUCCESS}>
                  {services.map((svc, i) => (
                    <View key={i} style={s.svcItemBox}>
                      <View style={s.svcLeft}>
                        <View style={s.svcDot}>
                          <Wrench size={12} color={PRIMARY} strokeWidth={2} />
                        </View>
                        <Text style={s.svcName} numberOfLines={1}>{svc.name}</Text>
                        <TouchableOpacity
                          onPress={() => removeService(i)}
                          style={s.svcDeleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={13} color={DANGER} strokeWidth={2} />
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
                  label="Technician Name *"
                  value={selectedTechName}
                  onChangeText={v => { setSelectedTechName(v); clearFieldError('technician'); }}
                  placeholder="Enter technician name"
                  autoCapitalize="words"
                  Icon={Users}
                  error={errors.technician}
                />
              </SectionCard>

              {/* ── Labour Details ── */}
              <SectionCard title="Labour Details" iconBg="#FEF3C7" Icon={Clock} iconColor={WARN}>
                <View style={s.labourGrid}>

                  {/* Estimated Hours — stepper + quick hour chips */}
                  <View style={[s.labourTile, !!errors.estHours && { borderColor: DANGER, borderWidth: 1.5 }]}>
                    <View style={s.labourTileTop}>
                      <Text style={s.labourTileLabel}>EST. HOURS <Text style={{ color: DANGER }}>*</Text></Text>
                    </View>
                    <View style={s.stepperRow}>
                      <TouchableOpacity
                        style={s.stepperBtn}
                        onPress={() => {
                          const newVal = Math.max(0, parseFloat(estHours || '0') - 0.5);
                          setEstHours(String(newVal));
                          if (newVal > 0) clearFieldError('estHours');
                        }}
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
                        onPress={() => {
                          const newVal = parseFloat(estHours || '0') + 0.5;
                          setEstHours(String(newVal));
                          if (newVal > 0) clearFieldError('estHours');
                        }}
                        activeOpacity={0.75}
                      >
                        <Plus size={15} color={TEXT} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>

                    {/* Hour Presets */}
                    <View style={s.presetWrap}>
                      <Text style={s.presetHeader}>Quick Select Hours</Text>
                      <View style={s.presetChipRow}>
                        {[0.5, 1, 2, 3, 4, 6, 8].map(h => {
                          const isSel = parseFloat(estHours || '0') === h;
                          return (
                            <TouchableOpacity
                              key={h}
                              style={[s.presetChip, isSel && s.presetChipActive]}
                              onPress={() => {
                                setEstHours(String(h));
                                clearFieldError('estHours');
                              }}
                              activeOpacity={0.75}
                            >
                              <Text style={[s.presetChipText, isSel && s.presetChipTextActive]}>{h}h</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {!!errors.estHours && (
                      <View style={s.areaErrRow}>
                        <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                        <Text style={s.areaErrText}>{errors.estHours}</Text>
                      </View>
                    )}
                  </View>

                  {/* Labour Charge — currency input + quick amount chips */}
                  <View style={s.labourTile}>
                    <View style={s.labourTileTop}>
                      <Text style={s.labourTileLabel}>CHARGE (₹)</Text>
                    </View>
                    <View style={s.labourAmtRow}>
                      <Text style={s.labourRupee}>₹</Text>
                      <TextInput
                        style={s.labourAmtInput}
                        value={labourCharge}
                        onChangeText={v => { setLabourCharge(v); clearFieldError('labourCharge'); }}
                        placeholder="0"
                        placeholderTextColor="#C4C9D4"
                        keyboardType="number-pad"
                      />
                    </View>

                    {/* Charge Presets */}
                    <View style={s.presetWrap}>
                      <Text style={s.presetHeader}>Quick Amounts</Text>
                      <View style={s.presetChipRow}>
                        {[300, 500, 750, 1000, 1500, 2000].map(c => {
                          const isSel = parseFloat(labourCharge || '0') === c;
                          return (
                            <TouchableOpacity
                              key={c}
                              style={[s.presetChip, isSel && s.presetChipActive]}
                              onPress={() => {
                                setLabourCharge(String(c));
                                clearFieldError('labourCharge');
                              }}
                              activeOpacity={0.75}
                            >
                              <Text style={[s.presetChipText, isSel && s.presetChipTextActive]}>₹{c}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                </View>

                {/* Labour Rate Calculation Card */}
                {parseFloat(estHours || '0') > 0 && parseFloat(labourCharge || '0') > 0 && (
                  <View style={s.rateHintBox}>
                    <Text style={s.rateHintText}>Effective Workshop Labour Rate</Text>
                    <Text style={s.rateHintVal}>
                      ₹{(parseFloat(labourCharge) / parseFloat(estHours)).toFixed(0)} / hr
                    </Text>
                  </View>
                )}
              </SectionCard>

              {/* ── Expected Delivery & Pickup Time ── */}
              <SectionCard title="Expected Delivery & Pickup Time" iconBg="#FFF7ED" Icon={Calendar} iconColor="#F97316">

                {/* 1. Quick Date Selection */}
                <Text style={s.timeSlotHeader}>1. SELECT DELIVERY DATE *</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isTodayDate(deliveryDate) ? PRIMARY : BORDER,
                      backgroundColor: isTodayDate(deliveryDate) ? '#EFF6FF' : '#F8FAFC',
                    }}
                    onPress={() => selectQuickDate('today')}
                    activeOpacity={0.8}
                  >
                    <Calendar size={14} color={isTodayDate(deliveryDate) ? PRIMARY : '#64748B'} strokeWidth={2} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isTodayDate(deliveryDate) ? PRIMARY : '#334155' }}>
                      Today ({new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: isTomorrowDate(deliveryDate) ? PRIMARY : BORDER,
                      backgroundColor: isTomorrowDate(deliveryDate) ? '#EFF6FF' : '#F8FAFC',
                    }}
                    onPress={() => selectQuickDate('tomorrow')}
                    activeOpacity={0.8}
                  >
                    <Calendar size={14} color={isTomorrowDate(deliveryDate) ? PRIMARY : '#64748B'} strokeWidth={2} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isTomorrowDate(deliveryDate) ? PRIMARY : '#334155' }}>
                      Tomorrow ({new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Date display row */}
                <TouchableOpacity
                  style={[s.deliveryRow, deliveryDate && s.deliveryRowSet, !!errors.deliveryDate && s.deliveryRowError]}
                  onPress={() => {
                    if (!deliveryDate) setDeliveryDate(new Date());
                    setShowDatePicker(true);
                    clearFieldError('deliveryDate');
                  }}
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

                {/* 2. PICKUP TIME SLOTS */}
                <Text style={s.timeSlotHeader}>2. SELECT PICKUP TIME *</Text>

                <View style={s.timeSlotGrid}>
                  {PICKUP_TIME_SLOTS.map(slot => {
                    const isSel = deliveryTime ? (deliveryTime.getHours() === slot.h && deliveryTime.getMinutes() === slot.m) : false;
                    const hNum = parseFloat(estHours || '0');
                    const isDisabled = isTimeSlotInPast(slot, deliveryDate, hNum);
                    return (
                      <TouchableOpacity
                        key={slot.label}
                        disabled={isDisabled}
                        style={[
                          s.timeSlotCard,
                          isSel && s.timeSlotCardActive,
                          isDisabled && s.timeSlotCardDisabled,
                        ]}
                        onPress={() => {
                          if (isDisabled) return;
                          const d = deliveryDate ? new Date(deliveryDate) : new Date();
                          d.setHours(slot.h, slot.m, 0, 0);
                          setDeliveryTime(d);
                          clearFieldError('deliveryTime');
                        }}
                        activeOpacity={isDisabled ? 1 : 0.8}
                      >
                        <Text style={[
                          s.timeSlotLabel,
                          isSel && s.timeSlotLabelActive,
                          isDisabled && s.timeSlotLabelDisabled,
                        ]}>
                          {slot.label}
                        </Text>
                        <Text style={[
                          s.timeSlotTag,
                          isSel && s.timeSlotTagActive,
                          isDisabled && s.timeSlotTagDisabled,
                        ]}>
                          {isDisabled ? 'Expired' : slot.tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Time Picker Button */}
                <TouchableOpacity
                  style={[s.customTimeBtn, deliveryTime && s.deliveryRowSet, !!errors.deliveryTime && s.deliveryRowError]}
                  onPress={() => {
                    if (!deliveryTime) {
                      const t = new Date();
                      t.setHours(18, 0, 0, 0);
                      setDeliveryTime(t);
                    }
                    setShowTimePicker(true);
                    clearFieldError('deliveryTime');
                  }}
                  activeOpacity={0.8}
                >
                  <Clock size={16} color={deliveryTime ? PRIMARY : '#64748B'} strokeWidth={2} />
                  <Text style={s.customTimeBtnText}>
                    {deliveryTime
                      ? `Custom Time: ${deliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                      : 'Choose Custom Time'}
                  </Text>
                  <ChevronDown size={14} color="#9CA3AF" strokeWidth={2} />
                </TouchableOpacity>

                {!!errors.deliveryTime && (
                  <View style={s.areaErrRow}>
                    <AlertCircle size={11} color={DANGER} strokeWidth={2} />
                    <Text style={s.areaErrText}>{errors.deliveryTime}</Text>
                  </View>
                )}

                {/* Scheduled Confirmation banner */}
                {deliveryDate && deliveryTime && (
                  <View style={s.deliverySummary}>
                    <CheckCircle size={15} color={SUCCESS} strokeWidth={2} />
                    <Text style={s.deliverySummaryText}>
                      Scheduled for{' '}
                      <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                        {deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </Text>
                      {' at '}
                      <Text style={{ fontWeight: '800', color: '#0F172A' }}>
                        {deliveryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </Text>
                  </View>
                )}

                {/* Android native pickers */}
                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker
                    value={deliveryDate ?? new Date()}
                    mode="date"
                    minimumDate={todayStart}
                    display="calendar"
                    onChange={(_: DateTimePickerEvent, date?: Date) => {
                      setShowDatePicker(false);
                      if (date) {
                        setDeliveryDate(date);
                        clearFieldError('deliveryDate');
                      }
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
                      if (date) {
                        setDeliveryTime(date);
                        clearFieldError('deliveryTime');
                      }
                    }}
                  />
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
                        <TouchableOpacity
                          onPress={() => {
                            if (showDatePicker && !deliveryDate) {
                              setDeliveryDate(new Date());
                              clearFieldError('deliveryDate');
                            }
                            if (showTimePicker && !deliveryTime) {
                              const t = new Date();
                              t.setHours(18, 0, 0, 0);
                              setDeliveryTime(t);
                              clearFieldError('deliveryTime');
                            }
                            setShowDatePicker(false);
                            setShowTimePicker(false);
                          }}
                        >
                          <Text style={s.pickerDone}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      {showDatePicker && (
                        <DateTimePicker
                          value={deliveryDate ?? new Date()}
                          mode="date"
                          minimumDate={todayStart}
                          display="inline"
                          themeVariant="light"
                          accentColor={PRIMARY}
                          style={{ alignSelf: 'center' }}
                          onChange={(_: DateTimePickerEvent, date?: Date) => {
                            if (date) {
                              setDeliveryDate(date);
                              clearFieldError('deliveryDate');
                            }
                          }}
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
                          style={{ alignSelf: 'center' }}
                          onChange={(_: DateTimePickerEvent, date?: Date) => {
                            if (date) {
                              setDeliveryTime(date);
                              clearFieldError('deliveryTime');
                            }
                          }}
                        />
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

          {/* ═══════ STEP 4 — Job Progress & Confirmation ═══════ */}
          {step === 4 && (
            <>
              {/* High Impact Success Hero Card */}
              <LinearGradient
                colors={['#0F172A', '#1E3A8A', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.progressHeroCard}
              >
                <View style={s.progressHeroTop}>
                  <View style={s.progressHeroBadge}>
                    <CheckCircle size={13} color="#34D399" strokeWidth={2.5} />
                    <Text style={s.progressHeroBadgeText}>JOB CARD CREATED LIVE</Text>
                  </View>
                  <Text style={s.progressHeroId}>{createdJobId ? `#${createdJobId.slice(-6).toUpperCase()}` : `#${invoiceNum.slice(-6)}`}</Text>
                </View>

                <View style={s.progressHeroBody}>
                  <Text style={s.progressHeroCustName}>{customerName || 'Customer'}</Text>
                  <Text style={s.progressHeroVeh}>{regNumber ? `${regNumber} · ` : ''}{brand} {model}</Text>
                </View>

                <View style={s.progressHeroFooter}>
                  <View>
                    <Text style={s.progressHeroFooterLbl}>Total Estimate</Text>
                    <Text style={s.progressHeroFooterVal}>{formatCurrency(grandTotal)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.progressHeroFooterLbl}>Expected Pickup</Text>
                    <Text style={s.progressHeroFooterVal}>
                      {deliveryDate ? deliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'On Completion'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Quick Actions Grid */}
              <View style={s.progressActionGrid}>
                <TouchableOpacity
                  style={s.progressActionCardPrimary}
                  onPress={() => setStep(5)}
                  activeOpacity={0.85}
                >
                  <View style={s.progressActionIconWrapPrimary}>
                    <FileText size={20} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.progressActionTitlePrimary}>View Official Invoice</Text>
                    <Text style={s.progressActionSubPrimary}>Print or share PDF invoice</Text>
                  </View>
                  <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.progressActionCardSecondary}
                  onPress={shareJobOnWhatsApp}
                  activeOpacity={0.85}
                >
                  <View style={s.progressActionIconWrapWhatsApp}>
                    <MessageSquare size={18} color="#16A34A" strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.progressActionTitleSecondary}>Send to WhatsApp</Text>
                    <Text style={s.progressActionSubSecondary}>Notify customer via WhatsApp</Text>
                  </View>
                  <ExternalLink size={15} color="#64748B" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {/* Live Repair Timeline */}
              <SectionCard title="Live Repair Progress" iconBg="#ECFDF5" Icon={Activity} iconColor={SUCCESS}>
                {[
                  { label: 'Job Card Created', desc: 'Checked in & initialized', status: 'completed' },
                  { label: 'Technician Assigned', desc: selectedTechName ? `Assigned to ${selectedTechName}` : 'Pending technician assignment', status: selectedTechName ? 'completed' : 'pending' },
                  { label: 'Work In Progress', desc: 'Mechanic active on repair & parts replacement', status: 'active' },
                  { label: 'Quality Check & Testing', desc: 'Diagnostic & post-repair road test', status: 'pending' },
                  { label: 'Ready for Delivery', desc: 'Car washed & parked at delivery bay', status: 'pending' },
                  { label: 'Handover & Closed', desc: 'Payment received & vehicle delivered', status: 'pending' },
                ].map((item, i, arr) => {
                  const isComp = item.status === 'completed';
                  const isAct = item.status === 'active';
                  return (
                    <View key={i} style={s.tlRow}>
                      <View style={s.tlLeft}>
                        <View style={[
                          s.tlCircle,
                          isComp && s.tlCircleDone,
                          isAct && s.tlCircleCurrent,
                        ]}>
                          {isComp ? (
                            <Check size={12} color="#fff" strokeWidth={3} />
                          ) : isAct ? (
                            <View style={s.tlPulse} />
                          ) : (
                            <Text style={s.tlNum}>{i + 1}</Text>
                          )}
                        </View>
                        {i < arr.length - 1 && (
                          <View style={[s.tlLine, (isComp || isAct) && s.tlLineDone]} />
                        )}
                      </View>
                      <View style={s.tlContent}>
                        <Text style={[s.tlLabel, isComp ? { color: '#065F46', fontWeight: '700' } : isAct ? { color: PRIMARY, fontWeight: '800' } : { color: MUTED }]}>
                          {item.label}
                        </Text>
                        {item.desc ? (
                          <Text style={[s.tlDesc, isComp ? { color: '#047857' } : isAct ? { color: '#1E40AF' } : { color: '#94A3B8' }]}>
                            {item.desc}
                          </Text>
                        ) : null}
                        {isAct && (
                          <View style={s.tlBadgeActive}>
                            <View style={s.tlBadgeActiveDot} />
                            <Text style={s.tlBadgeActiveText}>Current Workshop Phase</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </SectionCard>

              {/* Job Breakdown Summary Card */}
              <SectionCard title="Job Summary Breakdown" iconBg="#EFF6FF" Icon={Clipboard} iconColor={PRIMARY}>
                <View style={s.progressSummaryGrid}>
                  <View style={s.progressSummaryItem}>
                    <Text style={s.progressSummaryLbl}>Customer</Text>
                    <Text style={s.progressSummaryVal} numberOfLines={1}>{customerName || '—'}</Text>
                    <Text style={s.progressSummarySub} numberOfLines={1}>📞 {customerPhone || '—'}</Text>
                  </View>
                  <View style={s.progressSummaryItem}>
                    <Text style={s.progressSummaryLbl}>Vehicle</Text>
                    <Text style={s.progressSummaryVal} numberOfLines={1}>{regNumber || '—'}</Text>
                    <Text style={s.progressSummarySub} numberOfLines={1}>{brand} {model}</Text>
                  </View>
                  <View style={s.progressSummaryItem}>
                    <Text style={s.progressSummaryLbl}>Services ({services.length})</Text>
                    <Text style={s.progressSummaryVal}>{formatCurrency(servicesTotal)}</Text>
                    <Text style={s.progressSummarySub} numberOfLines={1}>
                      {services.map(sv => sv.name).join(', ') || 'None'}
                    </Text>
                  </View>
                  <View style={s.progressSummaryItem}>
                    <Text style={s.progressSummaryLbl}>Labour & Tech</Text>
                    <Text style={s.progressSummaryVal}>{formatCurrency(labourTotal)}</Text>
                    <Text style={s.progressSummarySub} numberOfLines={1}>
                      {selectedTechName || 'Unassigned'} ({estHours || 0} hrs)
                    </Text>
                  </View>
                </View>
              </SectionCard>
            </>
          )}

          {/* ═══════ STEP 5 — Official Invoice Document Preview ═══════ */}
          {step === 5 && (
            <>
              {/* Authentic Tax Invoice Document Card */}
              <View style={s.invDocContainer}>

                {/* Top Header Banner */}
                <LinearGradient
                  colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.invDocHeader}
                >
                  <View style={s.invDocHeaderTop}>
                    <View style={s.invDocBrandBlock}>
                      <View style={s.invDocLogoCircle}>
                        <Wrench size={20} color="#FFFFFF" strokeWidth={2.2} />
                      </View>
                      <View>
                        <Text style={s.invDocGarageName}>{garageName}</Text>
                        {garageAddress ? <Text style={s.invDocGarageSub}>📍 {garageAddress}</Text> : null}
                        {garagePhone ? <Text style={s.invDocGarageSub}>📞 {garagePhone}</Text> : null}
                      </View>
                    </View>
                    <View style={s.invDocBadgeBlock}>
                      <View style={s.invDocTag}>
                        <Text style={s.invDocTagText}>TAX INVOICE</Text>
                      </View>
                      <Text style={s.invDocNum}>{invoiceNum}</Text>
                      <Text style={s.invDocDate}>
                        {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>

                {/* Customer & Vehicle Info Grid */}
                <View style={s.invDocGrid}>
                  <View style={s.invDocInfoCard}>
                    <Text style={s.invDocInfoTitle}>👤 BILLED TO</Text>
                    <Text style={s.invDocInfoName} numberOfLines={1}>{customerName || 'Customer'}</Text>
                    <Text style={s.invDocInfoSub}>📱 +91 {customerPhone || '—'}</Text>
                  </View>
                  <View style={s.invDocInfoCard}>
                    <Text style={s.invDocInfoTitle}>🚗 VEHICLE SPECS</Text>
                    <View style={s.invDocRegBadge}>
                      <Text style={s.invDocRegText}>{regNumber || '—'}</Text>
                    </View>
                    <Text style={[s.invDocInfoSub, { marginTop: 3 }]} numberOfLines={1}>{brand} {model}</Text>
                    {odometer ? <Text style={s.invDocInfoSub}>Odo: {odometer} km</Text> : null}
                  </View>
                </View>

                {/* Itemized Table */}
                <View style={s.invDocTableWrap}>
                  <Text style={s.invDocTableTitle}>SERVICES & LABOUR PROVIDED</Text>

                  {/* Table Header */}
                  <View style={s.invTableHeader}>
                    <Text style={[s.invTh, { width: 24 }]}>#</Text>
                    <Text style={[s.invTh, { flex: 1 }]}>DESCRIPTION</Text>
                    <Text style={[s.invTh, { width: 38, textAlign: 'center' }]}>QTY</Text>
                    <Text style={[s.invTh, { width: 75, textAlign: 'right' }]}>AMOUNT</Text>
                  </View>

                  {/* Table Rows */}
                  {services.map((sv, i) => (
                    <View key={i} style={[s.invTableRow, i % 2 === 1 && s.invTableRowAlt]}>
                      <Text style={[s.invTdNum]}>{i + 1}</Text>
                      <Text style={[s.invTdName]} numberOfLines={1}>{sv.name}</Text>
                      <Text style={[s.invTdQty]}>{sv.qty}</Text>
                      <Text style={[s.invTdPrice]}>{formatCurrency(sv.price * sv.qty)}</Text>
                    </View>
                  ))}

                  {labourTotal > 0 && (
                    <View style={[s.invTableRow, services.length % 2 === 1 && s.invTableRowAlt]}>
                      <Text style={[s.invTdNum]}>{services.length + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.invTdName]}>Workshop Labour & Inspection</Text>
                        {estHours ? <Text style={{ fontSize: 10, color: MUTED }}>{estHours} hrs estimated work time</Text> : null}
                      </View>
                      <Text style={[s.invTdQty]}>1</Text>
                      <Text style={[s.invTdPrice]}>{formatCurrency(labourTotal)}</Text>
                    </View>
                  )}
                </View>

                {/* Summary & Totals */}
                <View style={s.invDocSummaryWrap}>
                  <View style={s.invDocNotesBox}>
                    <Text style={s.invDocNotesTitle}>WORKSHOP GUARANTEE</Text>
                    <Text style={s.invDocNotesText}>
                      All genuine parts & repair services carry garage warranty. Thank you for your business!
                    </Text>
                  </View>

                  <View style={s.invDocTotalsBox}>
                    <View style={s.invDocTotalRow}>
                      <Text style={s.invDocTotalLbl}>Services Total:</Text>
                      <Text style={s.invDocTotalVal}>{formatCurrency(servicesTotal)}</Text>
                    </View>
                    {labourTotal > 0 && (
                      <View style={s.invDocTotalRow}>
                        <Text style={s.invDocTotalLbl}>Labour Charge:</Text>
                        <Text style={s.invDocTotalVal}>{formatCurrency(labourTotal)}</Text>
                      </View>
                    )}

                    <LinearGradient
                      colors={['#1E3A8A', '#2563EB']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.invDocGrandBox}
                    >
                      <Text style={s.invDocGrandLbl}>GRAND TOTAL</Text>
                      <Text style={s.invDocGrandVal}>{formatCurrency(grandTotal)}</Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Invoice Footer Seal */}
                <View style={s.invDocFooterSeal}>
                  <CheckCircle size={13} color={SUCCESS} strokeWidth={2} />
                  <Text style={s.invDocSealText}>Official Computer Generated Tax Invoice · {garageName}</Text>
                </View>
              </View>

              {/* Action Buttons Hub */}
              <View style={s.invDocActionsGrid}>
                <TouchableOpacity
                  style={[s.invDocActionBtnPrimary, pdfLoading === 'download' && { opacity: 0.6 }]}
                  onPress={handleDownloadPdf}
                  disabled={!!pdfLoading}
                  activeOpacity={0.85}
                >
                  {pdfLoading === 'download' ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Download size={16} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={s.invDocActionBtnTextPrimary}>Print / Download PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[s.invDocActionBtnSecondary, { flex: 1 }, pdfLoading === 'share' && { opacity: 0.6 }]}
                    onPress={handleSharePdf}
                    disabled={!!pdfLoading}
                    activeOpacity={0.85}
                  >
                    {pdfLoading === 'share' ? (
                      <ActivityIndicator color={PRIMARY} size="small" />
                    ) : (
                      <>
                        <Share2 size={15} color={PRIMARY} strokeWidth={2} />
                        <Text style={s.invDocActionBtnTextSecondary}>Share PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.invDocActionBtnWhatsApp, { flex: 1 }]}
                    onPress={shareJobOnWhatsApp}
                    activeOpacity={0.85}
                  >
                    <MessageSquare size={15} color="#15803D" strokeWidth={2} />
                    <Text style={s.invDocActionBtnTextWhatsApp}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
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

      {/* ── Quick Add Service Modal ── */}
      <Modal
        visible={showAddServiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddServiceModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={16} color={PRIMARY} strokeWidth={2.2} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: TEXT }}>Add New Service</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddServiceModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color="#9CA3AF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {newSvcError && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <AlertCircle size={14} color={DANGER} strokeWidth={2} />
                <Text style={{ fontSize: 12, color: DANGER, flex: 1 }}>{newSvcError}</Text>
              </View>
            )}

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Service Name *</Text>
            <TextInput
              style={{ height: 44, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: TEXT, backgroundColor: '#F8FAFC', marginBottom: 12 }}
              placeholder="e.g. Engine Oil Change, Wheel Alignment"
              placeholderTextColor="#9CA3AF"
              value={newSvcName}
              onChangeText={v => { setNewSvcName(v); setNewSvcError(null); }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Price (₹) *</Text>
            <TextInput
              style={{ height: 44, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: TEXT, backgroundColor: '#F8FAFC', marginBottom: 12 }}
              placeholder="e.g. 1500"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={newSvcPrice}
              onChangeText={v => { setNewSvcPrice(v); setNewSvcError(null); }}
            />

            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Description (Optional)</Text>
            <TextInput
              style={{ height: 60, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingTop: 8, fontSize: 13, color: TEXT, backgroundColor: '#F8FAFC', marginBottom: 16 }}
              placeholder="Short description of service…"
              placeholderTextColor="#9CA3AF"
              multiline
              value={newSvcDesc}
              onChangeText={setNewSvcDesc}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setShowAddServiceModal(false)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => createQuickService()}
                disabled={isCreatingQuickSvc}
                activeOpacity={0.85}
              >
                {isCreatingQuickSvc ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Save &amp; Select</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT, letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  stepBadge: {
    minWidth: 38, height: 26, backgroundColor: '#F3F4F6', borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, flexShrink: 0,
  },
  stepBadgeText: { fontSize: 12, fontWeight: '700', color: TEXT },
  stepBadgeOf: { fontSize: 10, fontWeight: '500', color: MUTED },

  /* Progress */
  progressBar: { flexDirection: 'row', gap: 3, paddingHorizontal: 16, backgroundColor: '#fff' },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  segDone: { backgroundColor: SUCCESS },
  segActive: { backgroundColor: PRIMARY },

  /* Step pills */
  stepPillsScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    flexGrow: 0,
  },
  stepPillsRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
    alignItems: 'center',
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepPillActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  stepPillDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  stepPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: MUTED,
  },
  stepPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepPillTextDone: {
    color: '#065F46',
    fontWeight: '600',
  },

  /* Body */
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },

  /* Chip */
  chipLabel: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 9, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12.5, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff' },

  /* Textarea */
  areaLabel: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5, marginBottom: 5, textTransform: 'uppercase' },
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
  fuelBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  fuelText: { fontSize: 12, fontWeight: '700', color: MUTED },
  fuelTextActive: { color: '#fff' },
  gaugeTrack: { height: 6, borderRadius: 3, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 3 },

  /* Photos */
  photoActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY + '33',
    backgroundColor: '#EFF6FF',
  },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  thumbRow: { gap: 10, paddingBottom: 4 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 90, height: 90, borderRadius: 12 },
  thumbDel: {
    position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11,
    backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  thumbOverlayUploading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeSuccess: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  thumbOverlayError: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: 4,
  },
  thumbRetryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  photoEmpty: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderStyle: 'dashed', backgroundColor: '#F9FAFB',
  },
  photoEmptyText: { fontSize: 13, color: MUTED },
  photoCount: { fontSize: 12, color: MUTED, marginTop: 10, textAlign: 'center' },

  /* Error banner */
  errBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5',
    padding: 13, marginBottom: 14,
  },
  errBannerText: { fontSize: 13, color: DANGER, fontWeight: '500', flex: 1 },

  /* Service search */
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 14 },
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF',
  },
  suggestChipText: { fontSize: 12.5, fontWeight: '700', color: PRIMARY },

  /* Documents */
  docHint: { fontSize: 12, color: MUTED, marginBottom: 12 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY + '33',
    backgroundColor: '#EFF6FF', marginBottom: 12,
  },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  docList: { gap: 8 },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: 10, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: BORDER,
  },
  docIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  docName: { flex: 1, fontSize: 13, color: TEXT, fontWeight: '500' },
  docEmpty: { fontSize: 12, color: MUTED, textAlign: 'center', paddingVertical: 8 },


  /* 2-Column Services Grid */
  pkgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pkgGridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    justifyContent: 'space-between',
    minHeight: 74,
  },
  pkgGridCardAdded: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pkgGridTop: {
    marginBottom: 8,
  },
  pkgGridName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: TEXT,
    lineHeight: 16,
  },
  pkgGridBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pkgGridPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },
  pkgGridBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pkgGridBadgeAdded: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  pkgGridBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: PRIMARY,
  },
  pkgGridBadgeTextAdded: {
    fontSize: 10.5,
    fontWeight: '700',
    color: SUCCESS,
  },

  /* Service items */
  svcItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  svcLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  svcDot: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  svcName: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT },
  svcDeleteBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  svcRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 36 },
  priceWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: BORDER, borderRadius: 9,
    backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 8, flex: 1,
  },
  rupee: { fontSize: 13, color: MUTED, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT, paddingVertical: 0 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: BORDER,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  qtyVal: { fontSize: 14, fontWeight: '700', color: TEXT, minWidth: 22, textAlign: 'center' },
  svcTotal: { fontSize: 14, fontWeight: '700', color: PRIMARY, minWidth: 66, textAlign: 'right' },
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
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  labourTileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labourTileIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  labourTileLabel: { fontSize: 10.5, fontWeight: '800', color: '#475569', letterSpacing: 0.6, textTransform: 'uppercase' },

  /* Stepper */
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperVal: { alignItems: 'center' },
  stepperNum: { fontSize: 22, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  stepperUnit: { fontSize: 10, fontWeight: '600', color: MUTED, marginTop: -2 },

  /* Labour charge input */
  labourAmtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 42,
    marginTop: 4,
  },
  labourRupee: { fontSize: 15, fontWeight: '700', color: PRIMARY },
  labourAmtInput: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT, letterSpacing: -0.5, paddingVertical: 0 },
  labourAmtHint: { fontSize: 10.5, color: '#059669', fontWeight: '600', marginTop: 2 },

  /* ── Delivery rows ──────────────────────────────────────── */
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  deliveryRowSet: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
  deliveryRowError: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  deliveryIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  deliveryContent: { flex: 1 },
  deliveryLabel: { fontSize: 10, fontWeight: '800', color: '#475569', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 },
  deliveryValue: { fontSize: 14, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  deliveryPlaceholder: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
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

  /* ── Presets & Time Slot Grid ────────────────────────────── */
  presetWrap: { marginTop: 10 },
  presetHeader: { fontSize: 9.5, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  presetChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  presetChip: {
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  presetChipActive: { backgroundColor: '#EFF6FF', borderColor: PRIMARY },
  presetChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  presetChipTextActive: { color: PRIMARY, fontWeight: '800' },

  rateHintBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 10,
  },
  rateHintText: { fontSize: 11.5, color: '#64748B', fontWeight: '500' },
  rateHintVal: { fontSize: 12.5, fontWeight: '800', color: PRIMARY },

  timeSlotHeader: {
    fontSize: 10.5, fontWeight: '800', color: '#475569',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 6,
  },
  timeSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  timeSlotCard: {
    width: '31%', paddingVertical: 9, paddingHorizontal: 4,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  timeSlotCardActive: { backgroundColor: '#EFF6FF', borderColor: PRIMARY },
  timeSlotCardDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.5,
  },
  timeSlotLabel: { fontSize: 12, fontWeight: '700', color: TEXT },
  timeSlotLabelActive: { color: PRIMARY },
  timeSlotLabelDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  timeSlotTag: { fontSize: 9.5, fontWeight: '600', color: MUTED },
  timeSlotTagActive: { color: PRIMARY, fontWeight: '700' },
  timeSlotTagDisabled: { color: '#CBD5E1' },

  customTimeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF',
    marginTop: 2, marginBottom: 8,
  },
  customTimeBtnText: { fontSize: 12.5, fontWeight: '600', color: '#334155' },

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
  techName: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 2 },
  techRole: { fontSize: 12, color: MUTED },
  availBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
  },
  availDot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontWeight: '600' },

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
  pickerLabel: { fontSize: 10, color: MUTED, fontWeight: '700', marginBottom: 2, letterSpacing: 0.4 },
  pickerVal: { fontSize: 13, fontWeight: '600', color: TEXT },
  pickerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  pickerModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 32, overflow: 'hidden' },
  pickerSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  pickerDone: { fontSize: 15, fontWeight: '700', color: PRIMARY },

  /* Timeline */
  tlRow: { flexDirection: 'row', gap: 14 },
  tlLeft: { alignItems: 'center', width: 30 },
  tlCircle: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: '#D1D5DB',
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  tlCircleDone: { backgroundColor: SUCCESS, borderColor: SUCCESS },
  tlCircleCurrent: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tlPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  tlLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 24 },
  tlLineDone: { backgroundColor: SUCCESS },
  tlNum: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  tlContent: { flex: 1, paddingBottom: 24, paddingTop: 5 },
  tlLabel: { fontSize: 14, fontWeight: '600', color: TEXT },
  tlDesc: { fontSize: 12, color: MUTED, marginTop: 2 },
  tlBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2', borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  tlBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  tlBadgeText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  tlBadgeActive: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5', borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  tlBadgeActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: SUCCESS },
  tlBadgeActiveText: { fontSize: 11, fontWeight: '700', color: SUCCESS },

  /* ── Progress Step 5 Hero & Cards ──────────────────────── */
  progressHeroCard: {
    borderRadius: 20, padding: 20, marginBottom: 16, gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  progressHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressHeroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  progressHeroBadgeText: { fontSize: 10, fontWeight: '800', color: '#34D399', letterSpacing: 0.8 },
  progressHeroId: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  progressHeroBody: { gap: 2 },
  progressHeroCustName: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  progressHeroVeh: { fontSize: 13, color: '#93C5FD', fontWeight: '500' },
  progressHeroFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', marginTop: 4,
  },
  progressHeroFooterLbl: { fontSize: 10.5, color: '#BFDBFE', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  progressHeroFooterVal: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },

  /* Progress Action Grid */
  progressActionGrid: { gap: 10, marginBottom: 16 },
  progressActionCardPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: PRIMARY, borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  progressActionIconWrapPrimary: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  progressActionTitlePrimary: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  progressActionSubPrimary: { fontSize: 12, color: '#DBEAFE', marginTop: 1 },

  progressActionCardSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#DCFCE7',
  },
  progressActionIconWrapWhatsApp: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center',
  },
  progressActionTitleSecondary: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  progressActionSubSecondary: { fontSize: 12, color: '#64748B', marginTop: 1 },

  /* Progress Summary Grid */
  progressSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  progressSummaryItem: {
    width: '48%', backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', padding: 10, gap: 2,
  },
  progressSummaryLbl: { fontSize: 10, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressSummaryVal: { fontSize: 13.5, fontWeight: '700', color: TEXT },
  progressSummarySub: { fontSize: 11, color: MUTED },

  /* ── Step 6 Invoice Document Redesign Styles ──────────────── */
  invDocContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  invDocHeader: { padding: 18 },
  invDocHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invDocBrandBlock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  invDocLogoCircle: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  invDocGarageName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  invDocGarageSub: { fontSize: 11, color: '#93C5FD', marginTop: 2 },
  invDocBadgeBlock: { alignItems: 'flex-end' },
  invDocTag: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginBottom: 4,
  },
  invDocTagText: { fontSize: 9.5, fontWeight: '800', color: '#60A5FA', letterSpacing: 1.2 },
  invDocNum: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  invDocDate: { fontSize: 11, color: '#93C5FD', marginTop: 2 },

  invDocGrid: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  invDocInfoCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 10 },
  invDocInfoTitle: { fontSize: 9.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.6, marginBottom: 4 },
  invDocInfoName: { fontSize: 13.5, fontWeight: '700', color: TEXT },
  invDocInfoSub: { fontSize: 11.5, color: '#475569', marginTop: 2 },
  invDocRegBadge: {
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 2,
  },
  invDocRegText: { fontSize: 12, fontWeight: '800', color: PRIMARY },

  invDocTableWrap: { padding: 14 },
  invDocTableTitle: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  invTableHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B',
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4,
  },
  invTh: { fontSize: 9.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  invTableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  invTableRowAlt: { backgroundColor: '#F8FAFC' },
  invTdNum: { width: 24, fontSize: 11.5, color: '#64748B', fontWeight: '600' },
  invTdName: { flex: 1, fontSize: 12.5, fontWeight: '600', color: TEXT },
  invTdQty: { width: 38, fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },
  invTdPrice: { width: 75, fontSize: 12.5, fontWeight: '700', color: TEXT, textAlign: 'right' },

  invDocSummaryWrap: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  invDocNotesBox: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 10 },
  invDocNotesTitle: { fontSize: 9.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.6, marginBottom: 2 },
  invDocNotesText: { fontSize: 11, color: '#475569', lineHeight: 15 },
  invDocTotalsBox: { gap: 6 },
  invDocTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  invDocTotalLbl: { fontSize: 12, color: MUTED },
  invDocTotalVal: { fontSize: 12.5, fontWeight: '600', color: TEXT },
  invDocGrandBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginTop: 4,
  },
  invDocGrandLbl: { fontSize: 12, fontWeight: '800', color: '#DBEAFE', letterSpacing: 0.6 },
  invDocGrandVal: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },

  invDocFooterSeal: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  invDocSealText: { fontSize: 10.5, fontWeight: '600', color: '#059669' },

  invDocActionsGrid: { gap: 10, marginBottom: 8 },
  invDocActionBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  invDocActionBtnTextPrimary: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  invDocActionBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE',
    paddingVertical: 12, borderRadius: 12,
  },
  invDocActionBtnTextSecondary: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  invDocActionBtnWhatsApp: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#DCFCE7', borderWidth: 1.5, borderColor: '#86EFAC',
    paddingVertical: 12, borderRadius: 12,
  },
  invDocActionBtnTextWhatsApp: { fontSize: 13, fontWeight: '700', color: '#15803D' },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  footerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  footerBackText: { fontSize: 13.5, fontWeight: '600', color: '#334155' },
  footerReset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  footerResetText: { fontSize: 13, fontWeight: '600', color: DANGER },
  footerNext: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    ...Platform.select({
      ios: { shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  footerNextText: { fontSize: 14.5, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.1 },
});
