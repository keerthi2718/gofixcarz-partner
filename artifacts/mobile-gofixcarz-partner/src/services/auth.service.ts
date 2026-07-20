// ---------------------------------------------------------------------------
// AuthService — authentication API calls
// ---------------------------------------------------------------------------

import { ENDPOINTS } from '@/src/constants/api';
import type {
  ApiResponse,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  LoginResponse,
  RefreshTokenResponse,
  RegisterPayload,
  ResetPasswordPayload,
  User,
} from '@/src/types';
import apiClient from './api.client';

const AuthService = {
  /** Sign in with email and password. Returns user + tokens. */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
      ENDPOINTS.AUTH.LOGIN,
      payload
    );
    return data.data;
  },

  /** Create a new garage-owner account. */
  async register(payload: RegisterPayload): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
      ENDPOINTS.AUTH.REGISTER,
      payload
    );
    return data.data;
  },

  /** Sign out — invalidates the refresh token on the server. */
  async logout(refreshToken: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
  },

  /** Exchange a valid refresh token for a new access token. */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const { data } = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
      ENDPOINTS.AUTH.REFRESH,
      { refreshToken }
    );
    return data.data;
  },

  /** Trigger a password-reset email. */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, payload);
  },

  /** Submit the new password via the reset link token. */
  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, payload);
  },

  /** Get the currently authenticated user's profile. */
  async getMe(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>(ENDPOINTS.AUTH.ME);
    return data.data;
  },

  /** Change the authenticated user's password. */
  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await apiClient.post(ENDPOINTS.PROFILE.CHANGE_PASSWORD, payload);
  },
};

export default AuthService;
