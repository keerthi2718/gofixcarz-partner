// ---------------------------------------------------------------------------
// Auth Zustand Store
// Holds authentication state across the app.
// Initialised from AsyncStorage on app start so sessions persist.
// ---------------------------------------------------------------------------

import { create } from 'zustand';

import { STORAGE_KEYS } from '@/src/constants/storage';
import StorageService from '@/src/services/storage.service';
import type { AuthActions, AuthState, AuthStore, AuthTokens, User } from '@/src/types';

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // true until initialize() resolves
  error: null,
};

export const useAuthStore = create<AuthStore>()(set => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Setters
  // -------------------------------------------------------------------------

  setUser: (user: User | null) =>
    set({ user, isAuthenticated: user !== null }),

  setTokens: (tokens: AuthTokens | null) =>
    set({
      accessToken: tokens?.accessToken ?? null,
      refreshToken: tokens?.refreshToken ?? null,
    }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: string | null) => set({ error }),

  // -------------------------------------------------------------------------
  // Logout — clear everything
  // -------------------------------------------------------------------------

  logout: () => {
    StorageService.removeMany([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]).catch(() => {
      // best effort
    });

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  // -------------------------------------------------------------------------
  // Initialize — rehydrate from AsyncStorage on app boot
  // -------------------------------------------------------------------------

  initialize: async () => {
    try {
      const [accessToken, refreshToken, user] = await Promise.all([
        StorageService.get(STORAGE_KEYS.ACCESS_TOKEN),
        StorageService.get(STORAGE_KEYS.REFRESH_TOKEN),
        StorageService.getJson<User>(STORAGE_KEYS.USER),
      ]);

      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: !!accessToken && !!user,
        isLoading: false,
        error: null,
      });
    } catch {
      set({ ...initialState, isLoading: false });
    }
  },
}));

// ---------------------------------------------------------------------------
// Selector helpers (used outside React components, e.g. in interceptors)
// ---------------------------------------------------------------------------

export const getAccessToken = () => useAuthStore.getState().accessToken;
export const getRefreshToken = () => useAuthStore.getState().refreshToken;
