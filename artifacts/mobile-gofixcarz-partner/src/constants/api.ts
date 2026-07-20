// ---------------------------------------------------------------------------
// API — base URL and endpoint constants
// ---------------------------------------------------------------------------

/** Base URL read from the Expo environment variable (set via Replit Secrets). */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api';

/** Timeout in milliseconds for all API requests. */
export const API_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Endpoint paths  (relative to API_BASE_URL)
// ---------------------------------------------------------------------------

export const ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    ME: '/auth/me',
  },

  // Garage
  GARAGE: {
    LIST: '/garages',
    DETAIL: (id: string) => `/garages/${id}`,
    CREATE: '/garages',
    UPDATE: (id: string) => `/garages/${id}`,
    DELETE: (id: string) => `/garages/${id}`,
  },

  // Bookings
  BOOKINGS: {
    LIST: '/bookings',
    DETAIL: (id: string) => `/bookings/${id}`,
    UPDATE_STATUS: (id: string) => `/bookings/${id}/status`,
  },

  // Services offered by the garage
  SERVICES: {
    LIST: '/services',
    DETAIL: (id: string) => `/services/${id}`,
    CREATE: '/services',
    UPDATE: (id: string) => `/services/${id}`,
    DELETE: (id: string) => `/services/${id}`,
  },

  // Staff
  STAFF: {
    LIST: '/staff',
    DETAIL: (id: string) => `/staff/${id}`,
    CREATE: '/staff',
    UPDATE: (id: string) => `/staff/${id}`,
    DELETE: (id: string) => `/staff/${id}`,
  },

  // Reviews
  REVIEWS: {
    LIST: '/reviews',
    DETAIL: (id: string) => `/reviews/${id}`,
    RESPOND: (id: string) => `/reviews/${id}/respond`,
  },

  // Dashboard / analytics
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
    EARNINGS: '/dashboard/earnings',
    RECENT_BOOKINGS: '/dashboard/recent-bookings',
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },

  // Profile
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
    CHANGE_PASSWORD: '/profile/change-password',
    UPLOAD_AVATAR: '/profile/avatar',
  },
} as const;
