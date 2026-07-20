import { ENDPOINTS } from '@/src/constants/api';
import type { APIResponse, DashboardResponse } from '@/src/types';
import apiClient from './api.client';

const DashboardService = {
  async get() {
    const { data } = await apiClient.get<APIResponse<DashboardResponse>>(ENDPOINTS.DASHBOARD);
    return data.data;
  },
};

export default DashboardService;
