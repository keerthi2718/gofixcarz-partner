export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface APIError {
  success: false;
  message: string;
  detail?: unknown;
}
