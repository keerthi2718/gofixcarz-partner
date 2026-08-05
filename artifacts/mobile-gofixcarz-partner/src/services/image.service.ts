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
const TAG = '[ImageService]';

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
   * Uses fetch → blob for the S3 PUT so that ONLY the Content-Type header is
   * sent — S3 pre-signed URLs reject requests with unexpected signed headers
   * (e.g. Transfer-Encoding) that some upload helpers add automatically.
   *
   * @param fileUri   Local file URI from expo-image-picker or expo-camera
   * @param prefix    Prefix for the generated filename (e.g. 'logo', 'photo')
   * @returns         object_key — pass this to the API in Step 3 of your flow
   */
  async uploadToS3(fileUri: string, prefix = 'image'): Promise<string> {
    const contentType = getMime(fileUri);
    const fileName    = buildFileName(contentType, prefix);

    console.log(`${TAG} step 0 — starting upload`, { prefix, contentType, fileName });

    // ── Guard: validate file size ──────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = await FileSystem.getInfoAsync(fileUri, { size: true } as any);
    const fileSizeBytes: number = info.exists ? ((info as any).size ?? 0) : 0;

    console.log(`${TAG} step 0 — file info`, { exists: info.exists, sizeBytes: fileSizeBytes });

    if (fileSizeBytes > MAX_BYTES) {
      throw new Error(`Image too large (${(fileSizeBytes / 1_048_576).toFixed(1)} MB). Maximum allowed is 5 MB.`);
    }

    // ── Step 1 — request a pre-signed upload URL ───────────────────────────
    // Uses apiClient so the Authorization header is included for our API.
    console.log(`${TAG} step 1 — requesting pre-signed URL`, { endpoint: ENDPOINTS.IMAGES.UPLOAD_URL });

    const { data: urlData } = await apiClient.post<APIResponse<UploadUrlResponse>>(
      ENDPOINTS.IMAGES.UPLOAD_URL,
      { file_name: fileName, content_type: contentType },
    );

    const { upload_url, object_key } = urlData.data;
    console.log(`${TAG} step 1 — got pre-signed URL`, { object_key, urlPrefix: upload_url.slice(0, 60) });

    // ── Step 2 — PUT raw binary to S3 (NO Authorization header) ───────────
    // We use fetch to read the file as a Blob and then PUT it directly to S3.
    // This guarantees only the Content-Type header is sent — FileSystem.uploadAsync
    // can silently add Transfer-Encoding: chunked, which S3 rejects on
    // signed-header-only PUT requests (returns 403 SignatureDoesNotMatch).
    console.log(`${TAG} step 2 — reading file as blob`);

    const fileResponse = await fetch(fileUri);
    if (!fileResponse.ok && fileResponse.status !== 0) {
      // status 0 is normal for local file:// URIs in React Native
      throw new Error(`Could not read local file (status ${fileResponse.status})`);
    }
    const blob = await fileResponse.blob();
    console.log(`${TAG} step 2 — blob ready`, { size: blob.size, type: blob.type });

    console.log(`${TAG} step 2 — PUT to S3`);
    const s3Response = await fetch(upload_url, {
      method:  'PUT',
      headers: { 'Content-Type': contentType },
      body:    blob,
    });

    console.log(`${TAG} step 2 — S3 response`, { status: s3Response.status });

    if (!s3Response.ok) {
      const errBody = await s3Response.text().catch(() => '(no body)');
      console.error(`${TAG} step 2 — S3 PUT failed`, { status: s3Response.status, body: errBody });
      throw new Error(`S3 upload failed (HTTP ${s3Response.status}): ${errBody}`);
    }

    console.log(`${TAG} step 2 — upload complete ✓`, { object_key });
    return object_key;
  },
};

export default ImageService;
