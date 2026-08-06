// ---------------------------------------------------------------------------
// API — GoFixCarz Partner configuration
// Base URL points to the live GoFixCarz backend (FastAPI)
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.gofixcarz.com/api/v1';

export const API_TIMEOUT = 30_000;

// ---------------------------------------------------------------------------
// Endpoint paths  (relative to API_BASE_URL)
// ---------------------------------------------------------------------------

export const ENDPOINTS = {
  AUTH: {
    SIGN_IN: '/auth/sign-in',
    SIGN_UP: '/auth/sign-up',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  DASHBOARD: '/dashboard',

  ANALYTICS: '/analytics',

  GARAGE: '/garage',
  GARAGE_LOGO: '/garage/logo',

  PROFILE: '/profile',

  /** Pre-signed S3 upload URL — shared by all image upload flows */
  IMAGES: {
    UPLOAD_URL: '/images/upload-url',
  },

  BOOKINGS: {
    LIST: '/bookings',
    DETAIL: (id: string) => `/bookings/${id}`,
    ACCEPT: (id: string) => `/bookings/${id}/accept`,
    REJECT: (id: string) => `/bookings/${id}/reject`,
    CREATE_JOB: (id: string) => `/bookings/${id}/create-job`,
  },

  JOBS: {
    LIST: '/jobs',
    CREATE: '/jobs',
    DETAIL: (id: string) => `/jobs/${id}`,
    UPDATE: (id: string) => `/jobs/${id}`,
    DELETE: (id: string) => `/jobs/${id}`,
    COMPLETE: (id: string) => `/jobs/${id}/complete`,
    STATUS: (id: string) => `/jobs/${id}/status`,
    /** Multipart upload for job photos — returns { url } */
    UPLOAD_PHOTO: '/jobs/upload-photo',
  },

  SERVICE_PACKAGES: {
    LIST: '/service-packages',
    CREATE: '/service-packages',
    DETAIL: (id: string) => `/service-packages/${id}`,
    UPDATE: (id: string) => `/service-packages/${id}`,
    DELETE: (id: string) => `/service-packages/${id}`,
  },

  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id: string) => `/notifications/${id}/read`,
    REGISTER_TOKEN: '/notifications/device-token',
  },

  STATIC: {
    HELP: '/static/help-support',
    PRIVACY: '/static/privacy-policy',
  },
} as const;

// Query keys for React Query cache management
export const QUERY_KEYS = {
  DASHBOARD: ['dashboard'],
  ANALYTICS: (period: string) => ['analytics', period],
  GARAGE: ['garage'],
  PROFILE: ['profile'],
  LOGO: ['logo'],
  BOOKINGS: (params?: object) => ['bookings', params ?? {}],
  BOOKING: (id: string) => ['booking', id],
  JOBS: (params?: object) => ['jobs', params ?? {}],
  JOB: (id: string) => ['job', id],
  SERVICE_PACKAGES: (params?: object) => ['service-packages', params ?? {}],
  SERVICE_PACKAGE: (id: string) => ['service-package', id],
  NOTIFICATIONS: (unreadOnly?: boolean) => ['notifications', { unreadOnly }],
} as const;
