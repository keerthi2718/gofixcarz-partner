// ---------------------------------------------------------------------------
// AuthContext
// Provides a React context API over the Zustand auth store.
// Handles login / logout side-effects (persisting tokens, navigating, etc.)
// ---------------------------------------------------------------------------

import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { router } from 'expo-router';

import { STORAGE_KEYS } from '@/src/constants/storage';
import AuthService from '@/src/services/auth.service';
import StorageService from '@/src/services/storage.service';
import { useAuthStore } from '@/src/store/auth.store';
import type { LoginPayload, RegisterPayload, User } from '@/src/types';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    setUser,
    setTokens,
    setError,
    setLoading,
    logout: storeLogout,
    initialize,
  } = useAuthStore();

  // Rehydrate from AsyncStorage on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------

  const login = useCallback(
    async (payload: LoginPayload) => {
      try {
        setLoading(true);
        setError(null);

        const { user: loggedInUser, tokens } = await AuthService.login(payload);

        // Persist tokens and user
        await Promise.all([
          StorageService.set(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
          StorageService.set(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
          StorageService.setJson(STORAGE_KEYS.USER, loggedInUser),
        ]);

        setUser(loggedInUser);
        setTokens(tokens);

        router.replace('/(tabs)');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Login failed. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setTokens, setUser]
  );

  // -------------------------------------------------------------------------
  // Register
  // -------------------------------------------------------------------------

  const register = useCallback(
    async (payload: RegisterPayload) => {
      try {
        setLoading(true);
        setError(null);

        const { user: newUser, tokens } = await AuthService.register(payload);

        await Promise.all([
          StorageService.set(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
          StorageService.set(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
          StorageService.setJson(STORAGE_KEYS.USER, newUser),
        ]);

        setUser(newUser);
        setTokens(tokens);

        router.replace('/(tabs)');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Registration failed. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setTokens, setUser]
  );

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------

  const logout = useCallback(async () => {
    try {
      const refreshToken = await StorageService.get(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await AuthService.logout(refreshToken).catch(() => {
          // best effort — proceed even if the server call fails
        });
      }
    } finally {
      storeLogout();
      router.replace('/(auth)/login');
    }
  }, [storeLogout]);

  // -------------------------------------------------------------------------
  // Clear error
  // -------------------------------------------------------------------------

  const clearError = useCallback(() => setError(null), [setError]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
