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

  /**
   * Attach photo object_keys to a job (Step 3 of the job-photo upload flow).
   *
   * Always pass the FULL desired array — this replaces the photos field.
   * Store object_key values here, not signed URLs (URLs expire after 1 hour;
   * always load fresh URLs from GET /jobs/:id).
   */
  async updatePhotos(id: string, photoKeys: string[]) {
    const { data } = await apiClient.patch<APIResponse<JobResponse>>(
      ENDPOINTS.JOBS.UPDATE(id),
      { photos: photoKeys },
    );
    return data.data;
  },
};

export default JobService;
