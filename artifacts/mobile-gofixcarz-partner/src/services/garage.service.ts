import { ENDPOINTS } from '@/src/constants/api';
import type { APIResponse, GarageResponse, GarageUpdate } from '@/src/types';
import apiClient from './api.client';

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

  async uploadLogo(fileUri: string): Promise<string | null> {
    const filename = fileUri.split('/').pop() ?? 'logo.jpg';
    const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime     = ext === 'png' ? 'image/png' : 'image/jpeg';

    const form = new FormData();
    form.append('logo', { uri: fileUri, name: filename, type: mime } as unknown as Blob);

    const { data } = await apiClient.post<APIResponse<{ url: string }>>(
      ENDPOINTS.GARAGE_LOGO,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data?.url ?? null;
  },
};

export default GarageService;
