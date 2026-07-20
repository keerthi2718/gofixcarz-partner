// ---------------------------------------------------------------------------
// Authentication — GoFixCarz OTP-based auth
// ---------------------------------------------------------------------------

// Request payloads
export interface SendOTPPayload {
  mobile: string;
}

export interface SignInPayload {
  mobile: string;
}

export interface VerifyOTPPayload {
  mobile: string;
  otp: string;
}

export interface SignUpPayload {
  first_name: string;
  last_name?: string | null;
  workshop_name: string;
  email: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country?: string | null;
  country_code?: string;
  mobile: string;
  country_code_2?: string | null;
  mobile_2?: string | null;
  wheelers?: string[] | null;
  terms_accepted: boolean;
}

export interface RefreshTokenPayload {
  refresh_token: string;
}

export interface LogoutPayload {
  refresh_token?: string | null;
}

// Response shapes
export interface AuthUser {
  id: string;
  name: string | null;
  mobile: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user?: AuthUser;
}

// Zustand auth store shape
export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingMobile: string | null;
  error: string | null;
}

export interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setTokens: (tokens: Pick<AuthTokenData, 'access_token' | 'refresh_token'> | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPendingMobile: (mobile: string | null) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;
