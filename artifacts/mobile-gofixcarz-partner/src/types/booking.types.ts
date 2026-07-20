export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';

export interface BookingResponse {
  id: string;
  garage_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  status: BookingStatus;
  booking_date: string | null;
  notes: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
  service_requested: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingDetailResponse extends BookingResponse {
  customer?: unknown;
  vehicle?: unknown;
}

export interface BookingListParams {
  status?: BookingStatus;
  page?: number;
  page_size?: number;
}
