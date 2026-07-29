import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { router } from 'expo-router';
import { isAxiosError } from 'axios';
import { STORAGE_KEYS } from '@/src/constants/storage';
import AuthService from '@/src/services/auth.service';
import StorageService from '@/src/services/storage.service';
import { useAuthStore } from '@/src/store/auth.store';
import type { SignUpPayload } from '@/src/types';

/** Extract a user-friendly message from any thrown error. */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const status = err.response?.status;
    const serverMsg: string | undefined =
      err.response?.data?.message ??
      err.response?.data?.error ??
      err.response?.data?.detail;

    // Map well-known statuses to clear copy
    if (status === 404) {
      return "No account found with this number. Please sign up first.";
    }
    if (status === 409) {
      return serverMsg ?? "An account with this number already exists.";
    }
    if (status === 400) {
      return serverMsg ?? "Invalid request. Please check your details.";
    }
    if (status === 429) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (serverMsg) return serverMsg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingMobile: string | null;
  signIn: (mobile: string) => Promise<void>;
  verifyOtp: (mobile: string, otp: string) => Promise<void>;
  signUp: (payload: SignUpPayload) => Promise<void>;
  resendOtp: (mobile: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated, isLoading, error, pendingMobile,
    setUser, setTokens, setLoading, setError, setPendingMobile,
    logout: storeLogout, initialize,
  } = useAuthStore();

  useEffect(() => { initialize(); }, [initialize]);

  const signIn = useCallback(async (mobile: string) => {
    try {
      setLoading(true);
      setError(null);
      await AuthService.signIn({ mobile });
      setPendingMobile(mobile);
      router.push('/(auth)/otp');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to send OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPendingMobile]);

  const verifyOtp = useCallback(async (mobile: string, otp: string) => {
    try {
      setLoading(true);
      setError(null);
      const tokenData = await AuthService.verifyOtp({ mobile, otp });
      await Promise.all([
        StorageService.set(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token),
        StorageService.set(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token),
      ]);
      if (tokenData.user) {
        await StorageService.setJson(STORAGE_KEYS.USER, tokenData.user);
        // Hydrate the Zustand store immediately so screens see the user
        // without waiting for a full app restart + initialize() re-run.
        setUser(tokenData.user);
      }
      setTokens(tokenData);
      setPendingMobile(null);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Invalid OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPendingMobile, setTokens, setUser]);

  const signUp = useCallback(async (payload: SignUpPayload) => {
    try {
      setLoading(true);
      setError(null);
      await AuthService.signUp(payload);
      setPendingMobile(payload.mobile);
      router.push('/(auth)/otp');
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Registration failed. Please try again.'));
      throw err; // let the caller inspect status code (e.g. 409 conflict)
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPendingMobile]);

  const resendOtp = useCallback(async (mobile: string) => {
    try {
      setError(null);
      await AuthService.sendOtp({ mobile });
    } catch (err: unknown) {
      setError(extractErrorMessage(err, 'Failed to resend OTP.'));
    }
  }, [setError]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await StorageService.get(STORAGE_KEYS.REFRESH_TOKEN);
      await AuthService.logout({ refresh_token: refreshToken }).catch(() => {});
    } finally {
      storeLogout();
      router.replace('/(auth)/welcome');
    }
  }, [storeLogout]);

  const clearError = useCallback(() => setError(null), [setError]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated, isLoading, error, pendingMobile,
      signIn, verifyOtp, signUp, resendOtp, logout, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
