import { ENDPOINTS } from '@/src/constants/api';
import type { APIResponse, GarageResponse, GarageUpdate } from '@/src/types';
import apiClient from './api.client';
import ImageService from './image.service';

const GarageService = {
  async get() {
    const { data } = await apiClient.get<APIResponse<GarageResponse>>(ENDPOINTS.GARAGE);
    return data.data;
  },

  async update(payload: GarageUpdate) {
    const { data } = await apiClient.put<APIResponse<GarageResponse>>(
      ENDPOINTS.GARAGE,
      payload
    );
    return data.data;
  },

  /**
   * Upload a garage logo via the 3-step S3 pre-signed URL flow.
   *
   * Step 1 & 2 — handled by ImageService.uploadToS3 (gets URL, PUTs binary)
   * Step 3     — POST /garage/logo with { object_key }
   *
   * Returns the updated GarageResponse (with a fresh signed logo_url).
   * Always load the logo from this response — signed URLs expire after 1 hour.
   */
  async uploadLogo(fileUri: string): Promise<GarageResponse | null> {
    // Steps 1 & 2: upload raw binary to S3, get back the object_key
    const object_key = await ImageService.uploadToS3(fileUri, 'logo');

    // Step 3: register the object_key with the garage API
    const { data } = await apiClient.post<APIResponse<GarageResponse>>(
      ENDPOINTS.GARAGE_LOGO,
      { object_key },
    );
    return data.data ?? null;
  },
};

export default GarageService;
