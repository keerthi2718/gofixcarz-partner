// ---------------------------------------------------------------------------
// Navigation — route parameter type definitions
// Used for typed navigation throughout the app.
// ---------------------------------------------------------------------------

// Auth stack
export type AuthStackParamList = {
  login: undefined;
  register: undefined;
  'forgot-password': undefined;
  'reset-password': { token: string };
};

// Main tab navigator
export type MainTabParamList = {
  index: undefined;     // Dashboard
  bookings: undefined;
  services: undefined;
  profile: undefined;
};

// Bookings stack (nested)
export type BookingsStackParamList = {
  'bookings/index': undefined;
  'bookings/[id]': { id: string };
};

// Services stack (nested)
export type ServicesStackParamList = {
  'services/index': undefined;
  'services/[id]': { id: string };
  'services/create': undefined;
};

// Staff stack (nested)
export type StaffStackParamList = {
  'staff/index': undefined;
  'staff/[id]': { id: string };
  'staff/create': undefined;
};

// Profile / settings stack
export type ProfileStackParamList = {
  'profile/index': undefined;
  'profile/edit': undefined;
  'profile/change-password': undefined;
  'profile/notifications': undefined;
};
