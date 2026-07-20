export interface WorkingHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

export interface GarageResponse {
  id: string;
  user_id: string;
  name: string;
  owner: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  country: string | null;
  alternate_number: string | null;
  wheelers: string[] | null;
  working_hours: WorkingHours | null;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  updated_at: string;
}

export interface GarageUpdate {
  name?: string | null;
  owner?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country?: string | null;
  alternate_number?: string | null;
  wheelers?: string[] | null;
  working_hours?: WorkingHours | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}
