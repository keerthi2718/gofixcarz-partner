import { ENDPOINTS } from '@/src/constants/api';
import type {
  APIResponse,
  BookingDetailResponse,
  BookingListParams,
  BookingResponse,
  JobResponse,
  PaginatedData,
} from '@/src/types';
import apiClient from './api.client';

const BookingService = {
  async list(params?: BookingListParams) {
    const { data } = await apiClient.get<APIResponse<PaginatedData<BookingDetailResponse>>>(
      ENDPOINTS.BOOKINGS.LIST,
      { params }
    );
    return data.data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<APIResponse<BookingDetailResponse>>(
      ENDPOINTS.BOOKINGS.DETAIL(id)
    );
    return data.data;
  },

  async accept(id: string) {
    const { data } = await apiClient.patch<APIResponse<BookingResponse>>(
      ENDPOINTS.BOOKINGS.ACCEPT(id)
    );
    return data.data;
  },

  async reject(id: string) {
    const { data } = await apiClient.patch<APIResponse<BookingResponse>>(
      ENDPOINTS.BOOKINGS.REJECT(id)
    );
    return data.data;
  },

  async createJob(bookingId: string) {
    const { data } = await apiClient.post<APIResponse<JobResponse>>(
      ENDPOINTS.BOOKINGS.CREATE_JOB(bookingId)
    );
    return data.data;
  },
};

export default BookingService;
