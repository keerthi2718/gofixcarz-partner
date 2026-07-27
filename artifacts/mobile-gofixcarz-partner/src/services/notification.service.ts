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

  /**
   * Register a device push token with the backend so the server can send
   * FCM (Android) / APNs (iOS) notifications to this device.
   * Failures are intentionally swallowed by the caller — never blocks startup.
   */
  async registerToken(token: string, platform: string) {
    const { data } = await apiClient.post<APIResponse<void>>(
      ENDPOINTS.NOTIFICATIONS.REGISTER_TOKEN,
      { token, platform }
    );
    return data;
  },
};

export default NotificationService;
