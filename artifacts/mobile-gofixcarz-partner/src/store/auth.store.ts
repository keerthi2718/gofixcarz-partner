import { create } from 'zustand';
import { STORAGE_KEYS } from '@/src/constants/storage';
import StorageService from '@/src/services/storage.service';
import { useLogoStore } from '@/src/store/logo.store';
import type { AuthActions, AuthState, AuthStore, AuthUser } from '@/src/types';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  pendingMobile: null,
  error: null,
};

export const useAuthStore = create<AuthStore>()(set => ({
  ...initialState,

  setUser: (user: AuthUser | null) => set({ user, isAuthenticated: user !== null }),

  setTokens: (tokens) =>
    set({
      accessToken: tokens?.access_token ?? null,
      refreshToken: tokens?.refresh_token ?? null,
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPendingMobile: (pendingMobile) => set({ pendingMobile }),

  logout: () => {
    StorageService.removeMany([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.GARAGE_LOGO,
    ]).catch(() => {});
    useLogoStore.getState().setLogoUri(null);
    set({ ...initialState, isLoading: false });
  },

  initialize: async () => {
    try {
      const [accessToken, refreshToken, user] = await Promise.all([
        StorageService.get(STORAGE_KEYS.ACCESS_TOKEN),
        StorageService.get(STORAGE_KEYS.REFRESH_TOKEN),
        StorageService.getJson<AuthUser>(STORAGE_KEYS.USER),
      ]);
      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: !!accessToken,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ ...initialState, isLoading: false });
    }
  },
}));

export const getAccessToken = () => useAuthStore.getState().accessToken;
export const getRefreshToken = () => useAuthStore.getState().refreshToken;
