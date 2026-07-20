export interface ProfileResponse {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
}
