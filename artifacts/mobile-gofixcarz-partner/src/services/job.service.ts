import { ENDPOINTS } from '@/src/constants/api';
import type {
  APIResponse,
  JobCompleteUpdate,
  JobCreate,
  JobDetailResponse,
  JobListParams,
  JobResponse,
  JobStatusUpdate,
  JobUpdate,
  PaginatedData,
} from '@/src/types';
import apiClient from './api.client';

const JobService = {
  async list(params?: JobListParams) {
    const { data } = await apiClient.get<APIResponse<PaginatedData<JobResponse>>>(
      ENDPOINTS.JOBS.LIST,
      { params }
    );
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<APIResponse<JobDetailResponse>>(
      ENDPOINTS.JOBS.DETAIL(id)
    );
    return data.data;
  },

  async create(payload: JobCreate) {
    const { data } = await apiClient.post<APIResponse<JobResponse>>(
      ENDPOINTS.JOBS.CREATE,
      payload
    );
    return data.data;
  },

  async update(id: string, payload: JobUpdate) {
    const { data } = await apiClient.put<APIResponse<JobResponse>>(
      ENDPOINTS.JOBS.UPDATE(id),
      payload
    );
    return data.data;
  },

  async delete(id: string) {
    await apiClient.delete(ENDPOINTS.JOBS.DELETE(id));
  },

  async updateStatus(id: string, payload: JobStatusUpdate) {
    const { data } = await apiClient.patch<APIResponse<JobResponse>>(
      ENDPOINTS.JOBS.STATUS(id),
      payload
    );
    return data.data;
  },

  async complete(id: string, payload: JobCompleteUpdate) {
    const { data } = await apiClient.patch<APIResponse<JobResponse>>(
      ENDPOINTS.JOBS.COMPLETE(id),
      payload
    );
    return data.data;
  },

  async uploadPhoto(formData: FormData) {
    const { data } = await apiClient.post<APIResponse<{ url: string }>>(
      ENDPOINTS.JOBS.UPLOAD_PHOTO,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data.data;
  },
};

export default JobService;
