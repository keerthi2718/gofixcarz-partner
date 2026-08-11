import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator, Image, Modal, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import StatusBadge from '@/src/components/ui/StatusBadge';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency, formatDateTime } from '@/src/utils/helpers';
import { ChevronLeft } from 'lucide-react-native';
import type { JobStatus } from '@/src/types';

/* ── Design tokens ── */
import { getValidNextStatuses } from '@/src/constants/jobTransitions';
const BG      = '#FFFFFF';
const CARD    = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT    = '#1E293B';
const MUTED   = '#64748B';
const BORDER  = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';

const SAMPLE_INSPECTION_PHOTOS = [
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
];

function resolveImageCandidates(raw: any, index = 0): string[] {
  const sampleFallback = SAMPLE_INSPECTION_PHOTOS[index % SAMPLE_INSPECTION_PHOTOS.length];
  if (!raw) return [sampleFallback];
  const str = typeof raw === 'object' ? (raw.uri || raw.url || raw.path || raw.object_key || '') : String(raw);
  if (!str) return [sampleFallback];

  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('file://') ||
    str.startsWith('content://') ||
    str.startsWith('ph://') ||
    str.startsWith('data:') ||
    str.startsWith('blob:')
  ) {
    return [str, sampleFallback];
  }

  const cleanKey = str.replace(/^\/+/, '');
  return [
    `https://gofixcarz-uploads.s3.ap-south-1.amazonaws.com/${cleanKey}`,
    `https://api.gofixcarz.com/uploads/${cleanKey}`,
    `${API_BASE_URL}/images/${cleanKey}`,
    sampleFallback,
  ];
}

function SmartPhotoThumb({ item, index, onSelect }: { item: any; index: number; onSelect: (uri: string) => void }) {
  const candidates = useMemo(() => resolveImageCandidates(item, index), [item, index]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCandidateIdx(0);
    setHasError(false);
  }, [item]);

  const currentUri = candidates[candidateIdx] || '';

  if (!currentUri || hasError) {
    return (
      <View style={styles.photoThumbFallback}>
        <Feather name="image" size={20} color="#94A3B8" />
        <Text style={styles.photoFallbackText}>Photo #{index + 1}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.photoThumbWrap}
      activeOpacity={0.85}
      onPress={() => onSelect(currentUri)}
    >
      <Image
        source={{ uri: currentUri }}
        style={styles.photoThumb}
        resizeMode="cover"
        onError={() => {
          if (candidateIdx < candidates.length - 1) {
            setCandidateIdx(prev => prev + 1);
          } else {
            setHasError(true);
          }
        }}
      />
      <View style={styles.photoZoomIcon}>
        <Feather name="maximize-2" size={11} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

/* ── Job progress stepper ── */
const STEPPER_STEPS: { status: JobStatus; label: string }[] = [
  { status: 'OPEN',          label: 'Open'       },
  { status: 'IN_PROGRESS',   label: 'In Progress'},
  { status: 'QUALITY_CHECK', label: 'QC Check'   },
  { status: 'READY',         label: 'Ready'      },
  { status: 'COMPLETED',     label: 'Done'       },
];

function stepIndex(status: string) {
  return STEPPER_STEPS.findIndex(s => s.status === status);
}

function JobStepper({ status }: { status: string }) {
  const isCancelled = status === 'CANCELLED';
  const current     = isCancelled ? -1 : stepIndex(status);

  return (
    <View style={sp.card}>
      <View style={sp.headerRow}>
        <View style={sp.iconBox}>
          <Feather name="git-branch" size={14} color={PRIMARY} />
        </View>
        <Text style={sp.title}>Job Progress</Text>
      </View>

      {isCancelled ? (
        <View style={sp.cancelledRow}>
          <Feather name="x-circle" size={16} color="#EF4444" />
          <Text style={sp.cancelledText}>This job was cancelled</Text>
        </View>
      ) : (
        <View style={sp.track}>
          {STEPPER_STEPS.map((step, i) => {
            const done   = i < current;
            const active = i === current;
            const upcoming = i > current;
            return (
              <React.Fragment key={step.status}>
                {/* Step node */}
                <View style={sp.node}>
                  <View style={[
                    sp.circle,
                    done   && sp.circleDone,
                    active && sp.circleActive,
                    upcoming && sp.circleUpcoming,
                  ]}>
                    {done
                      ? <Feather name="check" size={10} color="#fff" />
                      : active
                        ? <View style={sp.innerDot} />
                        : null
                    }
                  </View>
                  <Text
                    style={[sp.label, done && sp.labelDone, active && sp.labelActive, upcoming && sp.labelUpcoming]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </View>

                {/* Connector */}
                {i < STEPPER_STEPS.length - 1 && (
                  <View style={[sp.line, (done || active) && i < current && sp.lineDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
}

const sp = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: TEXT },

  track: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 18,
  },
  node:  { alignItems: 'center', width: 52 },

  circle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  circleDone:     { backgroundColor: SUCCESS },
  circleActive:   { backgroundColor: PRIMARY, borderWidth: 2.5, borderColor: `${PRIMARY}40` },
  circleUpcoming: { backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: BORDER },

  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  label:         { fontSize: 9, fontWeight: '500', color: '#CBD5E1', textAlign: 'center' },
  labelDone:     { color: SUCCESS, fontWeight: '600' },
  labelActive:   { color: PRIMARY, fontWeight: '700' },
  labelUpcoming: { color: '#CBD5E1' },

  line: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginTop: 13, borderRadius: 1 },
  lineDone: { backgroundColor: SUCCESS },

  cancelledRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 18,
  },
  cancelledText: { fontSize: 14, color: '#EF4444', fontWeight: '600' },
});

/* ── Shared section card ── */
function SectionCard({ icon, title, children }: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Feather name={icon} size={15} color={PRIMARY} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

/* ── Info pair row ── */
function InfoPair({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoPair}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

function resolveImageUri(raw: any): string {
  if (!raw) return '';
  const uri = typeof raw === 'object' ? (raw.uri || raw.url || raw.path || '') : String(raw);
  if (!uri) return '';
  if (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('data:')
  ) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return `${API_BASE_URL}${uri}`;
  }
  return `${API_BASE_URL}/images/${uri}`;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOB(id),
    queryFn:  () => JobService.getById(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOB(id) });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOBS() });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  };

  const statusMut = useMutation({
    mutationFn: (status: JobStatus) => JobService.updateStatus(id, { status }),
    onSuccess:  () => { invalidate(); setShowStatusPicker(false); },
  });
  const completeMut = useMutation({
    mutationFn: () => JobService.complete(id, {}),
    onSuccess:  () => { invalidate(); setShowComplete(false); },
  });

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* ── Header ── */}
      <View style={[styles.topBar, { paddingTop: topPad + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={TEXT} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>
          {data ? `Job #${data.job_number}` : 'Job Detail'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? <LoadingState /> : error ? <ErrorState onRetry={refetch} /> : !data ? null : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Status hero */}
          <View style={styles.statusHero}>
            <View style={styles.statusHeroRow}>
              <StatusBadge status={data.status} />
              {data.status !== 'COMPLETED' && (
                <TouchableOpacity
                  style={styles.changeStatusBtn}
                  onPress={() => setShowStatusPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeStatusText}>Change</Text>
                  <Feather name="chevron-down" size={13} color={PRIMARY} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.statusDate}>Created {formatDateTime(data.created_at)}</Text>
          </View>

          {/* Customer & Vehicle */}
          <SectionCard icon="user" title="Customer & Vehicle">
            <InfoPair label="Customer"     value={data.customer_name} />
            <InfoPair label="Mobile"       value={data.customer_mobile} />
            <InfoPair label="Registration" value={data.registration_number} />
            <InfoPair label="Vehicle"      value={[data.brand, data.vehicle_model].filter(Boolean).join(' ')} />
            <InfoPair label="Fuel Type"    value={data.fuel_type} />
            <InfoPair label="Odometer"     value={data.odometer_km ? `${data.odometer_km} km` : null} />
          </SectionCard>

          {/* Before Service Photos */}
          {data.photos && data.photos.length > 0 ? (
            <SectionCard icon="camera" title="Before Service Photos">
              <Text style={styles.photoSubText}>
                {data.photos.length} photo{data.photos.length > 1 ? 's' : ''} captured before service:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoGrid}>
                {data.photos.map((item, index) => (
                  <SmartPhotoThumb
                    key={index}
                    item={item}
                    index={index}
                    onSelect={(selectedUri) => setSelectedImageUri(selectedUri)}
                  />
                ))}
              </ScrollView>
            </SectionCard>
          ) : (data.status === 'READY' || data.status === 'COMPLETED' || (data.status as string) === 'DELIVERED') ? (
            <SectionCard icon="camera" title="Before Service Photos">
              <View style={styles.noPhotoBox}>
                <Feather name="camera-off" size={20} color="#94A3B8" />
                <Text style={styles.noPhotoText}>No before-service photos were attached to this job card.</Text>
              </View>
            </SectionCard>
          ) : null}

          {/* Description */}
          {data.description ? (
            <SectionCard icon="file-text" title="Description">
              <Text style={styles.descText}>{data.description}</Text>
            </SectionCard>
          ) : null}

          {/* Services */}
          {data.services?.length ? (
            <SectionCard icon="tool" title="Services">
              {data.services.map((s, i) => (
                <View key={i} style={styles.serviceRow}>
                  <Text style={styles.serviceName}>
                    {s.name}{s.qty && s.qty > 1 ? ` ×${s.qty}` : ''}
                  </Text>
                  <Text style={styles.servicePrice}>{formatCurrency(s.price)}</Text>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {/* Billing */}
          {data.billing ? (
            <SectionCard icon="credit-card" title="Billing Summary">
              <InfoPair label="Services" value={formatCurrency(data.billing.services_total)} />
              <InfoPair label="Labour"   value={formatCurrency(data.billing.labour_total)} />
              <InfoPair label="Subtotal" value={formatCurrency(data.billing.subtotal)} />
              <InfoPair label="GST"      value={formatCurrency(data.billing.gst_amount)} />
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(data.billing.grand_total)}</Text>
              </View>
            </SectionCard>
          ) : data.estimated_amount != null ? (
            <SectionCard icon="dollar-sign" title="Estimate">
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Estimated Amount</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(data.estimated_amount)}</Text>
              </View>
            </SectionCard>
          ) : null}

          {/* Job progress stepper */}
          <JobStepper status={data.status} />

          {/* Complete button */}
          {(data.status === 'QUALITY_CHECK' || data.status === 'READY') && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => setShowComplete(true)}
              activeOpacity={0.85}
            >
              {completeMut.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="check-circle" size={18} color="#fff" /><Text style={styles.completeBtnText}>Mark as Completed</Text></>
              }
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── Status picker sheet ── */}
      {showStatusPicker && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowStatusPicker(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change Status</Text>
            {data?.status && getValidNextStatuses(data.status).map(s => (
              <TouchableOpacity
                key={s}
                style={styles.sheetOption}
                onPress={() => statusMut.mutate(s)}
                disabled={statusMut.isPending}
                activeOpacity={0.8}
              >
                {statusMut.isPending && statusMut.variables === s
                  ? <ActivityIndicator size="small" color={PRIMARY} />
                  : <StatusBadge status={s} />
                }
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setShowStatusPicker(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ConfirmDialog
        visible={showComplete}
        title="Complete Job"
        message="Mark this job as completed? This will finalize the billing."
        confirmLabel="Complete"
        onConfirm={() => completeMut.mutate()}
        onCancel={() => setShowComplete(false)}
      />

      {/* Full-Screen Image Preview Modal */}
      {selectedImageUri && (
        <Modal
          visible={!!selectedImageUri}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImageUri(null)}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSelectedImageUri(null)}
            />
            <View style={styles.imageModalContent} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.imageModalCloseBtn}
                onPress={() => setSelectedImageUri(null)}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingRight: 8,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: -0.3,
  },

  content: { paddingHorizontal: 20, gap: 14 },

  /* Status hero */
  statusHero: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 18, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statusHeroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeStatusBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY + '40',
    backgroundColor: '#EFF6FF',
  },
  changeStatusText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  statusDate:       { fontSize: 11, color: MUTED },

  /* Section card */
  sectionCard: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  sectionBody:  { padding: 18 },

  /* Info pair */
  infoPair: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: MUTED, flex: 1 },
  infoValue: { fontSize: 13, color: TEXT, fontWeight: '600', flex: 1.5, textAlign: 'right' },

  /* Description */
  descText: { fontSize: 14, color: MUTED, lineHeight: 22 },

  /* Services */
  serviceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  serviceName:  { fontSize: 13, color: TEXT, flex: 1 },
  servicePrice: { fontSize: 13, color: PRIMARY, fontWeight: '700' },

  /* Billing */
  grandTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingTop: 12, marginTop: 4,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: '800', color: TEXT },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: PRIMARY },

  /* Complete */
  completeBtn: {
    backgroundColor: SUCCESS, borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: SUCCESS, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
      default: {},
    }),
  },
  completeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  /* Status sheet */
  sheetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 32, gap: 2,
  },
  sheetHandle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 16,
  },
  sheetTitle:      { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 10 },
  sheetOption:     { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetCancel: {
    marginTop: 10, paddingVertical: 14,
    borderRadius: 14, alignItems: 'center',
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: TEXT },

  /* Photos */
  photoSubText: { fontSize: 12, color: MUTED, marginBottom: 12 },
  photoGrid: { gap: 10, paddingBottom: 4 },
  photoThumbWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  photoThumb: { width: 100, height: 100, borderRadius: 12 },
  photoThumbFallback: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoFallbackText: { fontSize: 10, fontWeight: '600', color: MUTED },
  photoZoomIcon: {
    position: 'absolute', bottom: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  noPhotoBox: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  noPhotoText: { fontSize: 13, color: MUTED, textAlign: 'center' },

  /* Image Modal */
  imageModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  imageModalContent: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
  },
  imageModalCloseBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 24, right: 20,
    zIndex: 20, width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  fullImage: { width: '92%', height: '75%' },
});
