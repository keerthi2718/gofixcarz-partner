import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@/src/components/ui/FeatherIcon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, QUERY_KEYS } from '@/src/constants/api';
import JobService from '@/src/services/job.service';
import ImageService from '@/src/services/image.service';
import StatusBadge from '@/src/components/ui/StatusBadge';
import ConfirmDialog from '@/src/components/ui/ConfirmDialog';
import LoadingState from '@/src/components/ui/LoadingState';
import ErrorState from '@/src/components/ui/ErrorState';
import { formatCurrency, formatDateTime } from '@/src/utils/helpers';
import { ChevronLeft } from 'lucide-react-native';
import type { JobStatus } from '@/src/types';

/* ── Design tokens ── */
import { getValidNextStatuses } from '@/src/constants/jobTransitions';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const PRIMARY = '#2563EB';
const TEXT = '#1E293B';
const MUTED = '#64748B';
const BORDER = 'rgba(226,232,240,0.7)';
const SUCCESS = '#10B981';

function resolveImageCandidates(raw: any): string[] {
  if (!raw) return [];
  const str = typeof raw === 'object' ? (raw.uri || raw.url || raw.path || raw.object_key || '') : String(raw);
  if (!str) return [];

  // Check if original uploaded local device URI is cached
  const cachedLocalUri = ImageService.getLocalPhoto(str);
  if (cachedLocalUri) {
    return [cachedLocalUri];
  }

  // Local device URIs (file://, content://, ph://)
  if (str.startsWith('file://') || str.startsWith('content://') || str.startsWith('ph://')) {
    return [str];
  }

  // Full HTTP/HTTPS / Data URIs
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('data:') ||
    str.startsWith('blob:')
  ) {
    return [str];
  }

  // S3 object key or relative backend path
  const cleanKey = str.replace(/^\/+/, '');
  const s3Candidate = `https://gofixcarz-uploads.s3.ap-south-1.amazonaws.com/${cleanKey}`;
  const apiCandidate = `https://api.gofixcarz.com/uploads/${cleanKey}`;
  const localImgCandidate = `${API_BASE_URL}/images/${cleanKey}`;

  return [
    s3Candidate,
    apiCandidate,
    localImgCandidate,
  ];
}

function SmartPhotoThumb({
  item,
  index,
  onSelect,
  onRemove,
}: {
  item: any;
  index: number;
  onSelect: (uri: string) => void;
  onRemove?: () => void;
}) {
  const candidates = useMemo(() => resolveImageCandidates(item), [item]);
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
    <View style={{ position: 'relative', marginRight: 10 }}>
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
      {onRemove && (
        <TouchableOpacity
          style={styles.photoDelBtn}
          onPress={onRemove}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Feather name="x" size={10} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ── Job progress stepper ── */
const STEPPER_STEPS: { status: JobStatus; label: string }[] = [
  { status: 'OPEN', label: 'Open' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'QUALITY_CHECK', label: 'QC Check' },
  { status: 'READY', label: 'Ready' },
  { status: 'COMPLETED', label: 'Done' },
];

function stepIndex(status: string) {
  return STEPPER_STEPS.findIndex(s => s.status === status);
}

function JobStepper({ status }: { status: string }) {
  const isCancelled = status === 'CANCELLED';
  const current = isCancelled ? -1 : stepIndex(status);

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
            const done = i < current;
            const active = i === current;
            const upcoming = i > current;
            return (
              <React.Fragment key={step.status}>
                {/* Step node */}
                <View style={sp.node}>
                  <View style={[
                    sp.circle,
                    done && sp.circleDone,
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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
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
  node: { alignItems: 'center', width: 52 },

  circle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  circleDone: { backgroundColor: SUCCESS },
  circleActive: { backgroundColor: PRIMARY, borderWidth: 2.5, borderColor: `${PRIMARY}40` },
  circleUpcoming: { backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: BORDER },

  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  label: { fontSize: 9, fontWeight: '500', color: '#CBD5E1', textAlign: 'center' },
  labelDone: { color: SUCCESS, fontWeight: '600' },
  labelActive: { color: PRIMARY, fontWeight: '700' },
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
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const topPad = insets.top + (Platform.OS === 'web' ? 67 : 0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.JOB(id),
    queryFn: () => JobService.getById(id),
  });

  const beforeServicePhotos = useMemo<any[]>(() => {
    if (!data) return [];
    const raw =
      data.photos ||
      (data as any).before_service_photos ||
      (data as any).beforePhotos ||
      (data as any).images ||
      (data as any).inspection?.photos ||
      (data as any).evidence ||
      [];
    const list = Array.isArray(raw) ? raw : [];
    return list.filter((item: any) => {
      const str = typeof item === 'object' ? (item.object_key || item.uri || item.url || '') : String(item);
      const lower = str.toLowerCase();
      return !lower.includes('doc_') && !lower.includes('document') && !lower.includes('/doc');
    });
  }, [data]);

  const attachedDocuments = useMemo<any[]>(() => {
    if (!data) return [];
    const docRaw = (data as any).documents || (data as any).attached_documents || (data as any).docs || [];
    const docList = Array.isArray(docRaw) ? docRaw : [];
    const rawPhotos = data.photos || (data as any).before_service_photos || [];
    const legacyDocPhotos = Array.isArray(rawPhotos)
      ? rawPhotos.filter((item: any) => {
          const str = typeof item === 'object' ? (item.object_key || item.uri || item.url || '') : String(item);
          const lower = str.toLowerCase();
          return lower.includes('doc_') || lower.includes('document') || lower.includes('/doc');
        })
      : [];
    return [...docList, ...legacyDocPhotos];
  }, [data]);

  const photosList = useMemo<any[]>(() => {
    return [...beforeServicePhotos, ...attachedDocuments];
  }, [beforeServicePhotos, attachedDocuments]);

  const activePhotoUri = useMemo(() => {
    if (selectedPhotoIndex === null || !photosList[selectedPhotoIndex]) return null;
    const raw = photosList[selectedPhotoIndex];
    const candidates = resolveImageCandidates(raw);
    return candidates[0] || '';
  }, [selectedPhotoIndex, photosList]);

  const activePhotoRawKey = useMemo(() => {
    if (selectedPhotoIndex === null || !photosList[selectedPhotoIndex]) return '';
    const raw = photosList[selectedPhotoIndex] as any;
    return typeof raw === 'object' && raw ? (raw.uri || raw.object_key || raw.url || '') : String(raw);
  }, [selectedPhotoIndex, photosList]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOB(id) });
    qc.invalidateQueries({ queryKey: ['jobs'] });
    qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    qc.invalidateQueries({ queryKey: ['analytics'] });
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  async function handleAddPhoto() {
    if (beforeServicePhotos.length >= 4) {
      Alert.alert('Photo Limit Reached', 'A maximum of 4 before service photos can be uploaded for a job card.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is needed to capture before service photos.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (res.canceled || !res.assets[0]?.uri) return;

    const pickedUri = res.assets[0].uri;

    try {
      await ImageService.validateImageFile(pickedUri);
    } catch (valErr: any) {
      Alert.alert('Invalid Image', valErr?.message || 'Selected file is invalid.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const objectKey = await ImageService.uploadToS3(pickedUri, 'before-service');
      const existingPhotos = data?.photos || [];
      await JobService.update(id as string, { photos: [...existingPhotos, objectKey] });
      invalidate();
      Alert.alert('Success', 'Before service photo uploaded successfully.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleAddDocument() {
    Alert.alert('Attach Document', 'Select document source:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo (Camera)',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Camera access is required to take document photos.');
            return;
          }
          const res = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsEditing: false,
          });
          if (!res.canceled && res.assets[0]?.uri) {
            uploadDocUri(res.assets[0].uri);
          }
        },
      },
      {
        text: 'From Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Needed', 'Gallery access is required to pick documents.');
            return;
          }
          const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!res.canceled && res.assets[0]?.uri) {
            uploadDocUri(res.assets[0].uri);
          }
        },
      },
    ]);
  }

  async function uploadDocUri(pickedUri: string) {
    try {
      await ImageService.validateImageFile(pickedUri);
    } catch (valErr: any) {
      Alert.alert('Invalid Document', valErr?.message || 'Selected file is invalid.');
      return;
    }

    setIsUploadingDoc(true);
    try {
      const objectKey = await ImageService.uploadToS3(pickedUri, 'doc');
      const existingDocs = (data as any)?.documents || [];
      await JobService.update(id as string, { documents: [...existingDocs, objectKey] } as any);
      invalidate();
      Alert.alert('Success', 'Document attached successfully.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.message || 'Failed to attach document.');
    } finally {
      setIsUploadingDoc(false);
    }
  }

  async function handleRemovePhoto(index: number) {
    const existingPhotos = [...(data?.photos || [])];
    const targetKey = existingPhotos[index];
    if (!targetKey) return;

    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const remaining = existingPhotos.filter((_, i) => i !== index);
          try {
            await JobService.update(id as string, { photos: remaining });
            invalidate();
            if (selectedPhotoIndex === index) {
              setSelectedPhotoIndex(null);
            } else if (selectedPhotoIndex !== null && selectedPhotoIndex > index) {
              setSelectedPhotoIndex(selectedPhotoIndex - 1);
            }
            if (typeof targetKey === 'string' && !targetKey.startsWith('file://')) {
              ImageService.deleteObjectKey(targetKey);
            }
          } catch (err: any) {
            Alert.alert('Error', 'Failed to remove photo.');
          }
        },
      },
    ]);
  }

  const statusMut = useMutation({
    mutationFn: (status: JobStatus) => JobService.updateStatus(id, { status }),
    onSuccess: (_, newStatus) => {
      invalidate();
      setShowStatusPicker(false);
      if (newStatus === 'READY') {
        router.push({ pathname: '/(tabs)/jobs', params: { stage: 'Ready' } } as any);
      }
    },
  });
  const completeMut = useMutation({
    mutationFn: () => JobService.complete(id, {}),
    onSuccess: () => {
      invalidate();
      setShowComplete(false);
      router.push({ pathname: '/(tabs)/jobs', params: { stage: 'Delivered' } } as any);
    },
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
              {data.status !== 'READY' && data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
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
            {(data.status === 'COMPLETED' || (data.status as string) === 'DELIVERED' || data.completed_at) ? (
              <Text style={[styles.statusDate, { color: '#059669', fontWeight: '700', marginTop: 4 }]}>
                Delivered {formatDateTime(data.completed_at || data.updated_at || data.created_at)}
              </Text>
            ) : null}
          </View>

          {/* Customer & Vehicle */}
          <SectionCard icon="user" title="Customer & Vehicle">
            <InfoPair label="Customer" value={data.customer_name} />
            <InfoPair label="Mobile" value={data.customer_mobile} />
            <InfoPair label="Registration" value={data.registration_number} />
            <InfoPair label="Vehicle" value={[data.brand, data.vehicle_model].filter(Boolean).join(' ')} />
            <InfoPair label="Fuel Type" value={data.fuel_type} />
            <InfoPair label="Odometer" value={data.odometer_km ? `${data.odometer_km} km` : null} />
            {(data.status === 'COMPLETED' || (data.status as string) === 'DELIVERED' || data.completed_at) ? (
              <InfoPair label="Delivered Date" value={formatDateTime(data.completed_at || data.updated_at || data.created_at)} />
            ) : null}
          </SectionCard>

          {/* Before Service Photos */}
          <SectionCard icon="camera" title="Before Service Photos">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.photoSubText}>
                {beforeServicePhotos && beforeServicePhotos.length > 0
                  ? `${beforeServicePhotos.length} photo${beforeServicePhotos.length > 1 ? 's' : ''} captured (Max 4):`
                  : 'Add vehicle photos (Max 4)'}
              </Text>
              <TouchableOpacity
                style={[styles.addPhotoBtn, (isUploadingPhoto || beforeServicePhotos.length >= 4) && { opacity: 0.5 }]}
                onPress={handleAddPhoto}
                disabled={isUploadingPhoto || beforeServicePhotos.length >= 4}
                activeOpacity={0.8}
              >
                {isUploadingPhoto ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <>
                    <Feather name="plus" size={13} color={beforeServicePhotos.length >= 4 ? "#94A3B8" : PRIMARY} />
                    <Text style={[styles.addPhotoBtnText, beforeServicePhotos.length >= 4 && { color: "#94A3B8" }]}>
                      {beforeServicePhotos.length >= 4 ? 'Limit Reached' : 'Add Photo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {beforeServicePhotos && beforeServicePhotos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoGrid}>
                {beforeServicePhotos.map((item, index) => (
                  <SmartPhotoThumb
                    key={index}
                    item={item}
                    index={index}
                    onSelect={() => {
                      const idx = photosList.indexOf(item);
                      setSelectedPhotoIndex(idx >= 0 ? idx : index);
                    }}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noPhotoBox}>
                <Feather name="camera-off" size={20} color="#94A3B8" />
                <Text style={styles.noPhotoText}>No photos available.</Text>
              </View>
            )}
          </SectionCard>

          {/* Attached Documents */}
          <SectionCard icon="file-text" title="Attached Documents">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.photoSubText}>
                {attachedDocuments && attachedDocuments.length > 0
                  ? `${attachedDocuments.length} document${attachedDocuments.length > 1 ? 's' : ''} attached:`
                  : 'Attach RC, DL, or Insurance documents'}
              </Text>
              <TouchableOpacity
                style={[styles.addPhotoBtn, isUploadingDoc && { opacity: 0.5 }]}
                onPress={handleAddDocument}
                disabled={isUploadingDoc}
                activeOpacity={0.8}
              >
                {isUploadingDoc ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <>
                    <Feather name="plus" size={13} color={PRIMARY} />
                    <Text style={styles.addPhotoBtnText}>Add Document</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {attachedDocuments && attachedDocuments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoGrid}>
                {attachedDocuments.map((item, index) => (
                  <SmartPhotoThumb
                    key={index}
                    item={item}
                    index={index}
                    onSelect={() => {
                      const idx = photosList.indexOf(item);
                      setSelectedPhotoIndex(idx >= 0 ? idx : index);
                    }}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.noPhotoBox}>
                <Feather name="file-minus" size={20} color="#94A3B8" />
                <Text style={styles.noPhotoText}>No attached documents available.</Text>
              </View>
            )}
          </SectionCard>

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
          {(() => {
            const servicesSum = data.services?.reduce((sum, item) => {
              const p = parseFloat(String(item.price ?? 0)) || 0;
              const q = parseFloat(String(item.qty ?? 1)) || 1;
              return sum + (p * q);
            }, 0) ?? 0;

            const labourCharge = parseFloat(String(data.labour?.charge ?? (data as any).labour_charge ?? (data as any).labour_total ?? 0)) || 0;
            const servicesTotal = parseFloat(String(data.billing?.services_total ?? servicesSum)) || 0;
            const labourTotal = parseFloat(String(data.billing?.labour_total ?? labourCharge)) || 0;
            const subtotalVal = (data.billing?.subtotal && Number(data.billing.subtotal) > 0)
              ? parseFloat(String(data.billing.subtotal))
              : (servicesTotal + labourTotal);

            const rawEst = parseFloat(String(data.estimated_amount ?? data.final_amount ?? 0)) || 0;
            const displayGrandTotal = subtotalVal > 0 ? subtotalVal : rawEst;

            return (
              <SectionCard icon="credit-card" title="Billing Summary">
                <InfoPair label="Services" value={formatCurrency(servicesTotal)} />
                <InfoPair label="Labour" value={formatCurrency(labourTotal)} />
                <View style={styles.grandTotalRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(displayGrandTotal)}</Text>
                </View>
              </SectionCard>
            );
          })()}

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

      {/* Interactive Full-Screen Photo Detail Viewer Modal */}
      {selectedPhotoIndex !== null && (
        <Modal
          visible={selectedPhotoIndex !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhotoIndex(null)}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSelectedPhotoIndex(null)}
            />
            <View style={styles.imageModalContent} pointerEvents="box-none">
              {/* Header Bar */}
              <View style={styles.modalHeaderBar}>
                <View style={styles.modalBadge}>
                  <Feather
                    name={
                      (() => {
                        const rawItem = photosList[selectedPhotoIndex];
                        const str = typeof rawItem === 'object' ? (rawItem?.object_key || rawItem?.uri || rawItem?.url || '') : String(rawItem || '');
                        return str.toLowerCase().includes('doc') ? 'file-text' : 'camera';
                      })()
                    }
                    size={12}
                    color="#60A5FA"
                  />
                  <Text style={styles.modalBadgeText}>
                    {(() => {
                      const rawItem = photosList[selectedPhotoIndex];
                      const str = typeof rawItem === 'object' ? (rawItem?.object_key || rawItem?.uri || rawItem?.url || '') : String(rawItem || '');
                      return str.toLowerCase().includes('doc') ? 'Attached Document' : 'Before Service Photo';
                    })()} • {selectedPhotoIndex + 1} of {photosList.length}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.imageModalCloseBtn}
                  onPress={() => setSelectedPhotoIndex(null)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Main Image View with Side Navigation Controls */}
              <View style={styles.modalBodyRow}>
                {photosList.length > 1 && (
                  <TouchableOpacity
                    style={[styles.navArrowBtn, styles.navArrowLeft, selectedPhotoIndex === 0 && { opacity: 0.3 }]}
                    disabled={selectedPhotoIndex === 0}
                    onPress={() => setSelectedPhotoIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev))}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-left" size={26} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {activePhotoUri ? (
                  <Image
                    source={{ uri: activePhotoUri }}
                    style={styles.fullImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.modalFallbackBox}>
                    <Feather name="alert-triangle" size={32} color="#F59E0B" />
                    <Text style={styles.modalFallbackText}>Unable to load full resolution photo.</Text>
                  </View>
                )}

                {photosList.length > 1 && (
                  <TouchableOpacity
                    style={[styles.navArrowBtn, styles.navArrowRight, selectedPhotoIndex === photosList.length - 1 && { opacity: 0.3 }]}
                    disabled={selectedPhotoIndex === photosList.length - 1}
                    onPress={() => setSelectedPhotoIndex(prev => (prev !== null && prev < photosList.length - 1 ? prev + 1 : prev))}
                    activeOpacity={0.7}
                  >
                    <Feather name="chevron-right" size={26} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Footer Info Overlay */}
              <View style={styles.modalFooterInfo}>
                <Text style={styles.modalFooterText} numberOfLines={1} ellipsizeMode="middle">
                  {activePhotoRawKey ? `S3 Key: ${activePhotoRawKey}` : `Photo #${selectedPhotoIndex + 1}`}
                </Text>
              </View>
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
  statusDate: { fontSize: 11, color: MUTED },

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
  sectionBody: { padding: 18 },

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
  serviceName: { fontSize: 13, color: TEXT, flex: 1 },
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
  sheetTitle: { fontSize: 17, fontWeight: '700', color: TEXT, marginBottom: 10 },
  sheetOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetCancel: {
    marginTop: 10, paddingVertical: 14,
    borderRadius: 14, alignItems: 'center',
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: TEXT },

  /* Photos */
  photoSubText: { fontSize: 12, color: MUTED, marginBottom: 4 },
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
  photoDelBtn: {
    position: 'absolute', top: -5, right: -5,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    zIndex: 10, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  addPhotoBtnText: { fontSize: 11.5, fontWeight: '700', color: PRIMARY },
  noPhotoBox: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  noPhotoText: { fontSize: 13, color: MUTED, textAlign: 'center' },

  /* Image Modal */
  imageModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  imageModalContent: {
    width: '100%', height: '100%',
    justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 50 : 30,
  },
  modalHeaderBar: {
    width: '100%', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, zIndex: 30,
  },
  modalBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modalBadgeText: { fontSize: 12, fontWeight: '600', color: '#F8FAFC' },
  imageModalCloseBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalBodyRow: {
    width: '100%', flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  fullImage: { width: '85%', height: '80%' },
  navArrowBtn: {
    position: 'absolute', top: '45%',
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  navArrowLeft: { left: 16 },
  navArrowRight: { right: 16 },
  modalFallbackBox: {
    alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
  },
  modalFallbackText: { color: '#CBD5E1', fontSize: 13, textAlign: 'center' },
  modalFooterInfo: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)',
    marginBottom: 10, maxWidth: '90%',
  },
  modalFooterText: { fontSize: 11, color: '#94A3B8', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});

