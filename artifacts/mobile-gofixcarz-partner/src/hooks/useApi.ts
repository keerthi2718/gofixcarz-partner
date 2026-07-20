// ---------------------------------------------------------------------------
// useApi — lightweight hook for one-off imperative API calls
// (Use @tanstack/react-query hooks for data-fetching flows instead)
// ---------------------------------------------------------------------------

import { useCallback, useState } from 'react';
import type { AxiosError } from 'axios';

interface ApiCallState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiReturn<T, TArgs extends unknown[]> extends ApiCallState<T> {
  execute: (...args: TArgs) => Promise<T | null>;
  reset: () => void;
}

/**
 * Wraps an async service function with loading/error state management.
 *
 * @example
 * const { execute, isLoading, error } = useApi(AuthService.forgotPassword);
 * await execute({ email: 'user@example.com' });
 */
export function useApi<T, TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<T>
): UseApiReturn<T, TArgs> {
  const [state, setState] = useState<ApiCallState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: TArgs): Promise<T | null> => {
      setState({ data: null, isLoading: true, error: null });
      try {
        const result = await fn(...args);
        setState({ data: result, isLoading: false, error: null });
        return result;
      } catch (err: unknown) {
        const axiosError = err as AxiosError<{ message?: string }>;
        const message =
          axiosError.response?.data?.message ??
          (err instanceof Error ? err.message : 'An unexpected error occurred.');
        setState({ data: null, isLoading: false, error: message });
        return null;
      }
    },
    [fn]
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
