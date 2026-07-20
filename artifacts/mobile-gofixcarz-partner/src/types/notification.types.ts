export interface NotificationResponse {
  id: string;
  garage_id: string;
  title: string;
  message: string;
  type: string | null;
  reference_id: string | null;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationListParams {
  unread_only?: boolean;
  page?: number;
  page_size?: number;
}
