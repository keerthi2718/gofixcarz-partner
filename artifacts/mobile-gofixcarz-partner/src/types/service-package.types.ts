export interface ServicePackageResponse {
  id: string;
  garage_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServicePackageCreate {
  name: string;
  description?: string | null;
  price: number;
  duration_minutes?: number | null;
  is_active?: boolean;
}

export interface ServicePackageUpdate {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  duration_minutes?: number | null;
  is_active?: boolean | null;
}

export interface ServicePackageListParams {
  search?: string;
  active_only?: boolean;
  page?: number;
  page_size?: number;
}
