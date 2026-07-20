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
};

export default GarageService;
