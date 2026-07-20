import { ENDPOINTS } from '@/src/constants/api';
import type {
  APIResponse,
  NotificationListParams,
  NotificationResponse,
  PaginatedData,
} from '@/src/types';
import apiClient from './api.client';

const NotificationService = {
  async list(params?: NotificationListParams) {
    const { data } = await apiClient.get<APIResponse<PaginatedData<NotificationResponse>>>(
      ENDPOINTS.NOTIFICATIONS.LIST,
      { params }
    );
    return data.data;
  },

  async markRead(id: string) {
    const { data } = await apiClient.patch<APIResponse<NotificationResponse>>(
      ENDPOINTS.NOTIFICATIONS.MARK_READ(id)
    );
    return data.data;
  },
};

export default NotificationService;
