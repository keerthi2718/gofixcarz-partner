import { ENDPOINTS } from '@/src/constants/api';
import type { APIResponse, ProfileResponse, ProfileUpdate } from '@/src/types';
import apiClient from './api.client';

const ProfileService = {
  async get() {
    const { data } = await apiClient.get<APIResponse<ProfileResponse>>(ENDPOINTS.PROFILE);
    return data.data;
  },

  async update(payload: ProfileUpdate) {
    const { data } = await apiClient.put<APIResponse<ProfileResponse>>(
      ENDPOINTS.PROFILE,
      payload
    );
    return data.data;
  },
};

export default ProfileService;
