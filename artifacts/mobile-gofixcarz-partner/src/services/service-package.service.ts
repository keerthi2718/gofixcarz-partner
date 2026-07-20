import { ENDPOINTS } from '@/src/constants/api';
import type {
  APIResponse,
  PaginatedData,
  ServicePackageCreate,
  ServicePackageListParams,
  ServicePackageResponse,
  ServicePackageUpdate,
} from '@/src/types';
import apiClient from './api.client';

const ServicePackageService = {
  async list(params?: ServicePackageListParams) {
    const { data } = await apiClient.get<APIResponse<PaginatedData<ServicePackageResponse>>>(
      ENDPOINTS.SERVICE_PACKAGES.LIST,
      { params }
    );
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<APIResponse<ServicePackageResponse>>(
      ENDPOINTS.SERVICE_PACKAGES.DETAIL(id)
    );
    return data.data;
  },

  async create(payload: ServicePackageCreate) {
    const { data } = await apiClient.post<APIResponse<ServicePackageResponse>>(
      ENDPOINTS.SERVICE_PACKAGES.CREATE,
      payload
    );
    return data.data;
  },

  async update(id: string, payload: ServicePackageUpdate) {
    const { data } = await apiClient.put<APIResponse<ServicePackageResponse>>(
      ENDPOINTS.SERVICE_PACKAGES.UPDATE(id),
      payload
    );
    return data.data;
  },

  async delete(id: string) {
    await apiClient.delete(ENDPOINTS.SERVICE_PACKAGES.DELETE(id));
  },
};

export default ServicePackageService;
