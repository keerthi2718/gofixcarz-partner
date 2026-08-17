// ---------------------------------------------------------------------------
// Axios API Client
// Provides a pre-configured Axios instance with:
//   • Base URL from environment
//   • Auth token injection (reads from the auth store at request time)
//   • Automatic token refresh on 401
//   • Structured error normalisation
// ---------------------------------------------------------------------------

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL, API_TIMEOUT, ENDPOINTS } from '@/src/constants/api';
import { STORAGE_KEYS } from '@/src/constants/storage';
import StorageService from './storage.service';

// ---------------------------------------------------------------------------
// Instance
// ---------------------------------------------------------------------------

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — inject Bearer token safely (Android OkHttp compatible)
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await StorageService.get(STORAGE_KEYS.ACCESS_TOKEN);
      if (token) {
        // Sanitize token: remove quotes, carriage returns, newlines, and surrounding spaces
        const cleanToken = typeof token === 'string'
          ? token.trim().replace(/^"|"$/g, '').replace(/[\r\n]/g, '')
          : token;
        if (cleanToken) {
          if (config.headers && typeof config.headers.set === 'function') {
            config.headers.set('Authorization', `Bearer ${cleanToken}`);
          } else if (config.headers) {
            config.headers.Authorization = `Bearer ${cleanToken}`;
          }
        }
      }
    } catch (e) {
      console.warn('[API Client] Error reading auth token from storage:', e);
    }
    return config;
  },
  error => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 / token refresh & error logging
// ---------------------------------------------------------------------------

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onTokenRefreshed(newToken: string) {
  pendingRequests.forEach(resolve => resolve(newToken));
  pendingRequests = [];
}

apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    if (error.response) {
      console.warn(`[API Client] Error ${error.response.status} for ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response.data);
    } else {
      console.warn(`[API Client] Network / Connection Error for ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.message);
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // If the request itself is the refresh endpoint — do not retry
    if (originalRequest.url === ENDPOINTS.AUTH.REFRESH) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request until the refresh is done
        return new Promise(resolve => {
          pendingRequests.push((token: string) => {
            if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
            } else if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const rawRefreshToken = await StorageService.get(STORAGE_KEYS.REFRESH_TOKEN);
        const refreshToken = rawRefreshToken
          ? rawRefreshToken.trim().replace(/^"|"$/g, '').replace(/[\r\n]/g, '')
          : null;

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await apiClient.post<{
          data: { accessToken: string };
        }>(ENDPOINTS.AUTH.REFRESH, { refreshToken });

        const newAccessToken = data.data.accessToken;
        await StorageService.set(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);

        if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
          originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
        } else if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        onTokenRefreshed(newAccessToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Clear stored credentials on refresh failure
        await StorageService.removeMany([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
