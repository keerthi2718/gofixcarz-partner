// ---------------------------------------------------------------------------
// AsyncStorage — key constants
// Keep all keys centralised here to prevent typos across the codebase.
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@gofixcarz_partner:access_token',
  REFRESH_TOKEN: '@gofixcarz_partner:refresh_token',
  USER: '@gofixcarz_partner:user',
  ONBOARDING_COMPLETE: '@gofixcarz_partner:onboarding_complete',
  THEME: '@gofixcarz_partner:theme',
  PUSH_TOKEN: '@gofixcarz_partner:push_token',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
