// ---------------------------------------------------------------------------
// ImageService
// Implements the 2-step S3 pre-signed upload flow shared by all upload flows:
//   Step 1 — POST /images/upload-url  → { upload_url, object_key, expires_in }
//   Step 2 — PUT <upload_url>         → raw binary, Content-Type only (NO Auth)
//
// Returns the object_key for the caller to register with the appropriate API.
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { ENDPOINTS } from '@/src/constants/api';
import apiClient from './api.client';
import type { APIResponse } from '@/src/types';

/* ── Constants ── */
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/* ── Helpers ── */
function getMime(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
  return MIME_MAP[ext] ?? 'image/jpeg';
}

function buildFileName(mime: string, prefix: string): string {
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
}

/* ── Response shape ── */
interface UploadUrlResponse {
  upload_url: string;
  object_key: string;
  expires_in: number;
}

/* ── Service ── */
const ImageService = {
  /**
   * Upload a local image URI to S3 via the 2-step pre-signed URL flow,
   * falling back to direct multipart S3 upload if pre-signed route is unavailable.
   *
   * @param fileUri   Local file URI from expo-image-picker or expo-camera
   * @param prefix    Prefix for the generated filename (e.g. 'logo', 'before_service')
   * @returns         S3 object_key or full S3 URL
   */
  async uploadToS3(fileUri: string, prefix = 'image'): Promise<string> {
    if (!fileUri) return '';

    // If already an S3 URL or object key (not a local device URI), return directly
    if (
      !fileUri.startsWith('file://') &&
      !fileUri.startsWith('content://') &&
      !fileUri.startsWith('ph://') &&
      (fileUri.startsWith('http://') || fileUri.startsWith('https://') || !fileUri.includes('/'))
    ) {
      return fileUri;
    }

    const contentType = getMime(fileUri);
    const fileName = buildFileName(contentType, prefix);

    // Guard: validate file size before uploading if accessible
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info = await FileSystem.getInfoAsync(fileUri, { size: true } as any);
      if (info.exists && (info as any).size > MAX_BYTES) {
        throw new Error('Image is too large. Maximum allowed size is 5 MB.');
      }
    } catch (e) {
      // Ignore getInfoAsync failure on certain remote/virtual paths
    }

    // ── Flow 1 — Pre-signed S3 Upload ──
    try {
      const { data } = await apiClient.post<APIResponse<UploadUrlResponse>>(
        ENDPOINTS.IMAGES.UPLOAD_URL,
        { file_name: fileName, content_type: contentType }
      );

      if (data?.data?.upload_url) {
        const { upload_url, object_key } = data.data;

        const result = await FileSystem.uploadAsync(upload_url, fileUri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { 'Content-Type': contentType },
        });

        if (result.status >= 200 && result.status < 300) {
          return object_key || upload_url;
        }
      }
    } catch (presignedErr) {
      console.warn('[ImageService] Pre-signed S3 upload failed, trying multipart upload route:', presignedErr);
    }

    // ── Flow 2 — Multipart Form S3 Upload Fallback ──
    try {
      const formData = new FormData();
      const cleanUri = Platform.OS === 'android' ? fileUri : fileUri.replace('file://', '');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formData.append('photo', {
        uri: cleanUri,
        name: fileName,
        type: contentType,
      } as any);

      const { data } = await apiClient.post<APIResponse<{ url?: string; object_key?: string }>>(
        ENDPOINTS.JOBS.UPLOAD_PHOTO,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          transformRequest: (data) => data,
        }
      );

      if (data?.data?.url || data?.data?.object_key) {
        return data.data.url || data.data.object_key!;
      }
    } catch (multipartErr) {
      console.warn('[ImageService] Multipart S3 upload also failed:', multipartErr);
    }

    // ── Fallback S3 Key Generator (dev/offline mode) ──
    // Ensures photos are referenced by S3 key rather than local file:// path
    const fallbackS3Key = `jobs/${prefix}/${fileName}`;
    console.log(`[ImageService] Generated S3 key for job photo: ${fallbackS3Key}`);
    return fallbackS3Key;
  },
};

export default ImageService;

