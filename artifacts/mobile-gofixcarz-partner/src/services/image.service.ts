// ---------------------------------------------------------------------------
// ImageService
// Implements the 2-step S3 pre-signed upload flow shared by all upload flows:
//   Step 1 — POST /images/upload-url  → { upload_url, object_key, expires_in }
//   Step 2 — PUT <upload_url>         → raw binary, Content-Type only (NO Auth)
//
// Returns the object_key for the caller to register with the appropriate API.
// ---------------------------------------------------------------------------

import * as FileSystem from 'expo-file-system/legacy';

import { ENDPOINTS } from '@/src/constants/api';
import apiClient from './api.client';
import type { APIResponse } from '@/src/types';

/* ── Constants ── */
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_MAP: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
};

/* ── Helpers ── */
function getMime(uri: string): string {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
  return MIME_MAP[ext] ?? 'image/jpeg';
}

function buildFileName(mime: string, prefix: string): string {
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return `${prefix}_${Date.now()}.${ext}`;
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
   * Upload a local image URI to S3 via the 2-step pre-signed URL flow.
   *
   * @param fileUri   Local file URI from expo-image-picker or expo-camera
   * @param prefix    Prefix for the generated filename (e.g. 'logo', 'photo')
   * @returns         object_key — pass this to the API in Step 3 of your flow
   */
  async uploadToS3(fileUri: string, prefix = 'image'): Promise<string> {
    const contentType = getMime(fileUri);
    const fileName    = buildFileName(contentType, prefix);

    // Guard: validate file size before uploading
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = await FileSystem.getInfoAsync(fileUri, { size: true } as any);
    if (info.exists && (info as any).size > MAX_BYTES) {
      throw new Error('Image is too large. Maximum allowed size is 5 MB.');
    }

    // ── Step 1 — request pre-signed upload URL (Bearer token via apiClient) ──
    const { data } = await apiClient.post<APIResponse<UploadUrlResponse>>(
      ENDPOINTS.IMAGES.UPLOAD_URL,
      { file_name: fileName, content_type: contentType },
    );

    const { upload_url, object_key } = data.data;

    // ── Step 2 — PUT raw binary to S3 (NO Authorization header) ──
    // FileSystem.uploadAsync sends a plain binary PUT without adding any
    // extra headers beyond what we specify, so the pre-signed URL works correctly.
    const result = await FileSystem.uploadAsync(upload_url, fileUri, {
      httpMethod:  'PUT',
      uploadType:  FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers:     { 'Content-Type': contentType },
    });

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`S3 upload failed with status ${result.status}.`);
    }

    return object_key;
  },
};

export default ImageService;
