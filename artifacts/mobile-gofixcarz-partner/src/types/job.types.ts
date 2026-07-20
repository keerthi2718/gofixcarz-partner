export type JobStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_PARTS'
  | 'QUALITY_CHECK'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ServiceItem {
  name: string;
  price: number;
  qty?: number;
}

export interface LabourData {
  description?: string | null;
  charge: number;
}

export interface InspectionData {
  findings?: string | null;
  parts_needed?: string[] | null;
}

export interface BillingResponse {
  services_total: number;
  labour_total: number;
  subtotal: number;
  gst_amount: number;
  grand_total: number;
}

export interface JobTimelineResponse {
  id: string;
  job_id: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface JobResponse {
  id: string;
  job_number: string;
  garage_id: string;
  customer_id: string | null;
  vehicle_id: string | null;
  booking_id: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
  registration_number: string | null;
  brand: string | null;
  vehicle_model: string | null;
  fuel_type: string | null;
  odometer_km: number | null;
  photos: string[] | null;
  inspection: InspectionData | null;
  services: ServiceItem[] | null;
  labour: LabourData | null;
  billing: BillingResponse | null;
  status: JobStatus;
  description: string | null;
  estimated_amount: number | null;
  final_amount: number | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobDetailResponse extends JobResponse {
  customer?: unknown;
  vehicle?: unknown;
  timelines?: JobTimelineResponse[];
}

export interface JobCreate {
  customer_name?: string | null;
  customer_mobile?: string | null;
  registration_number?: string | null;
  brand?: string | null;
  vehicle_model?: string | null;
  fuel_type?: string | null;
  odometer_km?: number | null;
  photos?: string[] | null;
  customer_id?: string | null;
  vehicle_id?: string | null;
  booking_id?: string | null;
  description?: string | null;
  estimated_amount?: number | null;
}

export interface JobUpdate {
  description?: string | null;
  estimated_amount?: number | null;
  photos?: string[] | null;
  inspection?: InspectionData | null;
  services?: ServiceItem[] | null;
  labour?: LabourData | null;
}

export interface JobStatusUpdate {
  status: JobStatus;
  notes?: string | null;
}

export interface JobCompleteUpdate {
  notes?: string | null;
}

export interface JobListParams {
  search?: string;
  status?: JobStatus;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}
