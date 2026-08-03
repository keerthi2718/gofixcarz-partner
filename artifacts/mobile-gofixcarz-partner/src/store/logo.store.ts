/**
 * Logo store — single source of truth for the garage logo URI.
 *
 * Zustand gives every subscriber an instant synchronous update when the URI
 * changes, so there is no need to coordinate React Query cache keys,
 * useFocusEffect hooks, or AsyncStorage reads across multiple screens.
 *
 * Lifecycle:
 *   1. On app boot, `initializeLogo()` reads AsyncStorage and seeds the store.
 *   2. When the user picks / uploads a new logo, `setLogoUri()` is called with
 *      the latest URI (local file path → stable copy → server URL).
 *   3. Every screen that calls `useLogoStore(s => s.logoUri)` re-renders
 *      immediately — no navigation or restart required.
 */

import { create } from 'zustand';
import { STORAGE_KEYS } from '@/src/constants/storage';
import StorageService from '@/src/services/storage.service';

interface LogoState {
  logoUri: string | null;
  setLogoUri: (uri: string | null) => void;
  initializeLogo: () => Promise<void>;
}

export const useLogoStore = create<LogoState>()(set => ({
  logoUri: null,

  setLogoUri: (uri) => {
    set({ logoUri: uri });
  },

  initializeLogo: async () => {
    try {
      const stored = await StorageService.get(STORAGE_KEYS.GARAGE_LOGO);
      if (stored) set({ logoUri: stored });
    } catch {
      // silently ignore — logo will load from server query
    }
  },
}));
