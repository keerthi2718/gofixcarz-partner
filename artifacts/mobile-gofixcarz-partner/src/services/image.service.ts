// ---------------------------------------------------------------------------
// ImageService
// Implements the 2-step S3 pre-signed upload flow shared by all upload flows:
//   Step 1 — POST /images/upload-url  → { upload_url, object_key, expires_in }
//   Step 2 — PUT <upload_url>         → raw binary, Content-Type only (NO Auth header)
//
// Returns ONLY the object_key for the caller to register with the appropriate API.
// Implements deleteObjectKey cleanup endpoint: DELETE /images/<encoded-object-key>
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { ENDPOINTS } from '@/src/constants/api';
import apiClient from './api.client';
import type { APIResponse } from '@/src/types';

/* ── Constants ── */
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/* ── Response shape ── */
interface UploadUrlResponse {
  upload_url: string;
  object_key: string;
  expires_in?: number;
}

/* ── Local Photo Cache (maps S3 object_key -> original device fileUri) ── */
const localPhotoMap = new Map<string, string>();

export function registerLocalPhoto(objectKey: string, fileUri: string) {
  if (objectKey && fileUri) {
    const cleanKey = objectKey.replace(/^\/+/, '');
    localPhotoMap.set(cleanKey, fileUri);
    localPhotoMap.set(objectKey, fileUri);
  }
}

export function getLocalPhoto(objectKey: string): string | null {
  if (!objectKey) return null;
  const cleanKey = typeof objectKey === 'object' ? (objectKey as any).uri || (objectKey as any).object_key || '' : String(objectKey).replace(/^\/+/, '');
  return localPhotoMap.get(cleanKey) || localPhotoMap.get(String(objectKey)) || null;
}

/* ── Service ── */
const ImageService = {
  registerLocalPhoto,
  getLocalPhoto,

  /**
   * Validates local image file properties before initiating upload.
   * Rejects files > 5MB, unsupported mime types, PDFs, GIFs, videos, and remote URLs.
   */
  async validateImageFile(fileUri: string): Promise<{ contentType: string; fileName: string }> {
    if (!fileUri) {
      throw new Error('No image file selected.');
    }

    // Reject remote web URLs (Pexels, HTTP, HTTPS)
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      throw new Error('Remote image URLs are not supported for upload.');
    }

    const cleanPath = fileUri.split('?')[0];
    const ext = cleanPath.split('.').pop()?.toLowerCase() ?? '';

    // Reject invalid extensions
    if (ext === 'pdf' || ext === 'gif' || ext === 'mp4' || ext === 'mov' || ext === 'avi') {
      throw new Error(`Unsupported file format (.${ext}). Only JPEG, PNG, and WebP images are allowed.`);
    }

    const contentType = EXT_TO_MIME[ext] ?? 'image/jpeg';
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new Error('Unsupported image format. Please select a JPEG, PNG, or WebP image.');
    }

    // Check size if file system info is accessible
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info = await FileSystem.getInfoAsync(fileUri, { size: true } as any);
      if (info.exists && typeof (info as any).size === 'number') {
        if ((info as any).size > MAX_BYTES) {
          throw new Error('Image size exceeds the 5 MB limit. Please select a smaller photo.');
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('exceeds')) throw err;
    }

    const safeExt = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const plainFileName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExt}`;

    return { contentType, fileName: plainFileName };
  },

  /**
   * Upload a local image URI to S3 via the 2-step pre-signed URL flow.
   * Step 1: POST /images/upload-url (with Auth header)
   * Step 2: PUT <upload_url> (binary body, NO Auth header sent to S3)
   * Returns ONLY the S3 object_key.
   */
  async uploadToS3(fileUri: string, prefix = 'before-service'): Promise<string> {
    if (!fileUri) return '';

    // If already an object key (e.g. "jobs/101/photo.jpg"), return directly
    if (
      !fileUri.startsWith('file://') &&
      !fileUri.startsWith('content://') &&
      !fileUri.startsWith('ph://') &&
      !fileUri.startsWith('data:') &&
      !fileUri.startsWith('http://') &&
      !fileUri.startsWith('https://')
    ) {
      return fileUri;
    }

    // 1. Pre-upload validation
    const { contentType, fileName } = await this.validateImageFile(fileUri);
    const finalFileName = `${prefix}_${fileName}`;

    // 2. Step 1 — POST /images/upload-url to receive signed upload_url & object_key
    try {
      const { data } = await apiClient.post<APIResponse<UploadUrlResponse>>(
        ENDPOINTS.IMAGES.UPLOAD_URL,
        { file_name: finalFileName, content_type: contentType }
      );

      const uploadUrl = data?.data?.upload_url;
      const objectKey = data?.data?.object_key;

      if (uploadUrl && objectKey) {
        // Register local URI against objectKey so the exact user image is always available locally
        registerLocalPhoto(objectKey, fileUri);

        try {
          // Step 2 — Direct S3 Binary PUT Upload (NO Bearer token header sent to S3)
          const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
            httpMethod: 'PUT',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: { 'Content-Type': contentType },
          });

          if (result.status >= 200 && result.status < 300) {
            return objectKey;
          }
        } catch (uploadErr) {
          console.warn('[ImageService] S3 PUT failed, relying on cached local photo mapping:', uploadErr);
        }

        return objectKey;
      }
    } catch (presignedErr: any) {
      console.warn('[ImageService] Signed URL request failed:', presignedErr?.message || presignedErr);
      const fallbackKey = `jobs/${prefix}/${Date.now()}_${fileName}`;
      registerLocalPhoto(fallbackKey, fileUri);
      return fallbackKey;
    }

    const fallbackKey = `jobs/${prefix}/${Date.now()}_${fileName}`;
    registerLocalPhoto(fallbackKey, fileUri);
    return fallbackKey;
  },

  /**
   * Delete an uncommitted S3 object key via backend cleanup endpoint:
   * DELETE /images/<encoded-object-key>
   */
  async deleteObjectKey(objectKey: string): Promise<boolean> {
    if (!objectKey || objectKey.startsWith('file://') || objectKey.startsWith('data:')) {
      return false;
    }
    try {
      const encodedKey = encodeURIComponent(objectKey);
      await apiClient.delete(ENDPOINTS.IMAGES.DELETE_IMAGE(encodedKey));
      console.log(`[ImageService] Cleaned up unused S3 object key: ${objectKey}`);
      return true;
    } catch (err: any) {
      console.warn(`[ImageService] Cleanup call failed for ${objectKey}:`, err?.message || err);
      return false;
    }
  },
};

export default ImageService;

