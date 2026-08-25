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
   * Step 1 & 2 — handled by ImageService.uploadToS3 (gets upload URL, PUTs raw binary)
   * Step 3     — POST /garage/logo with { object_key }
   *
   * Returns the updated GarageResponse (with fresh signed logo_url).
   */
  async uploadLogo(fileUri: string): Promise<GarageResponse | null> {
    const object_key = await ImageService.uploadToS3(fileUri, 'logo');

    try {
      const { data } = await apiClient.post<APIResponse<GarageResponse>>(
        ENDPOINTS.GARAGE_LOGO,
        { object_key }
      );
      return data.data ?? null;
    } catch (err) {
      // Clean up uploaded S3 object if registering with backend fails
      await ImageService.deleteObjectKey(object_key);
      throw err;
    }
  },
};

export default GarageService;
