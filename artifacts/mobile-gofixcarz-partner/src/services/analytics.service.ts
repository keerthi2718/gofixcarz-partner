import { ENDPOINTS } from '@/src/constants/api';
import type { APIResponse, AnalyticsParams, AnalyticsResponse } from '@/src/types';
import apiClient from './api.client';

const AnalyticsService = {
  async get(params?: AnalyticsParams) {
    const { data } = await apiClient.get<APIResponse<AnalyticsResponse>>(
      ENDPOINTS.ANALYTICS,
      { params }
    );
    return data.data;
  },
};

export default AnalyticsService;
