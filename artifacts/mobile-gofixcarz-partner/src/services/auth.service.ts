import { ENDPOINTS } from '@/src/constants/api';
import type {
  APIResponse,
  AuthTokenData,
  LogoutPayload,
  RefreshTokenPayload,
  SendOTPPayload,
  SignUpPayload,
  VerifyOTPPayload,
} from '@/src/types';
import apiClient from './api.client';

const AuthService = {
  /** Step 1 of login: send OTP to existing user's mobile */
  async signIn(payload: SendOTPPayload): Promise<APIResponse> {
    const { data } = await apiClient.post<APIResponse>(ENDPOINTS.AUTH.SIGN_IN, payload);
    return data;
  },

  /** Generic send-OTP (for new users / resend) */
  async sendOtp(payload: SendOTPPayload): Promise<APIResponse> {
    const { data } = await apiClient.post<APIResponse>(ENDPOINTS.AUTH.SEND_OTP, payload);
    return data;
  },

  /** Step 2: verify OTP → receive tokens */
  async verifyOtp(payload: VerifyOTPPayload): Promise<AuthTokenData> {
    const { data } = await apiClient.post<APIResponse<AuthTokenData>>(
      ENDPOINTS.AUTH.VERIFY_OTP,
      payload
    );
    return data.data;
  },

  /** Register a new garage owner */
  async signUp(payload: SignUpPayload): Promise<APIResponse> {
    const { data } = await apiClient.post<APIResponse>(ENDPOINTS.AUTH.SIGN_UP, payload);
    return data;
  },

  /** Refresh access token */
  async refreshToken(payload: RefreshTokenPayload): Promise<APIResponse> {
    const { data } = await apiClient.post<APIResponse>(ENDPOINTS.AUTH.REFRESH, payload);
    return data;
  },

  /** Logout — invalidates refresh token on server */
  async logout(payload: LogoutPayload): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT, payload);
  },
};

export default AuthService;
