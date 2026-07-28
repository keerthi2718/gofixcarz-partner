import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { router } from 'expo-router';
import { STORAGE_KEYS } from '@/src/constants/storage';
import AuthService from '@/src/services/auth.service';
import StorageService from '@/src/services/storage.service';
import { useAuthStore } from '@/src/store/auth.store';
import type { SignUpPayload } from '@/src/types';

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
      setError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
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
      setError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
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
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPendingMobile]);

  const resendOtp = useCallback(async (mobile: string) => {
    try {
      setError(null);
      await AuthService.sendOtp({ mobile });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP.');
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
