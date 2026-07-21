/**
 * GoFixCarz Partner — Design tokens
 * Theme: Deep red primary (GoFixAuto brand)
 */

const colors = {
  light: {
    text: '#111827',
    tint: '#C62828',

    background: '#F5F5F5',
    foreground: '#111827',

    card: '#FFFFFF',
    cardForeground: '#111827',

    // Primary — deep red
    primary: '#C62828',
    primaryDark: '#B71C1C',
    primaryLight: '#EF5350',
    primaryForeground: '#FFFFFF',

    // Accent (same red family)
    accent: '#C62828',
    accentLight: '#FFEBEE',
    accentForeground: '#FFFFFF',

    // Secondary
    secondary: '#F1F5F9',
    secondaryForeground: '#334155',

    // Muted
    muted: '#F1F5F9',
    mutedForeground: '#6B7280',

    // Feedback
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    destructive: '#EF4444',
    destructiveLight: '#FEE2E2',
    info: '#3B82F6',
    infoLight: '#DBEAFE',

    // UI elements
    border: '#E5E7EB',
    input: '#E5E7EB',
    inputBackground: '#F9FAFB',
    shadow: 'rgba(0, 0, 0, 0.08)',

    // Job status colours
    statusOpen: '#3B82F6',
    statusOpenBg: '#EFF6FF',
    statusInProgress: '#8B5CF6',
    statusInProgressBg: '#F5F3FF',
    statusWaiting: '#F59E0B',
    statusWaitingBg: '#FFFBEB',
    statusQualityCheck: '#6366F1',
    statusQualityCheckBg: '#EEF2FF',
    statusReady: '#10B981',
    statusReadyBg: '#ECFDF5',
    statusCompleted: '#059669',
    statusCompletedBg: '#D1FAE5',
    statusCancelled: '#EF4444',
    statusCancelledBg: '#FEF2F2',

    // Booking status colours
    bookingPending: '#F59E0B',
    bookingPendingBg: '#FFFBEB',
    bookingAccepted: '#10B981',
    bookingAcceptedBg: '#ECFDF5',
    bookingRejected: '#EF4444',
    bookingRejectedBg: '#FEF2F2',
    bookingConverted: '#8B5CF6',
    bookingConvertedBg: '#F5F3FF',
  },

  dark: {
    text: '#F9FAFB',
    tint: '#EF5350',
    background: '#0F172A',
    foreground: '#F9FAFB',
    card: '#1E293B',
    cardForeground: '#F9FAFB',
    primary: '#EF5350',
    primaryDark: '#C62828',
    primaryLight: '#FF8A80',
    primaryForeground: '#FFFFFF',
    accent: '#EF5350',
    accentLight: '#3D0A0A',
    accentForeground: '#FFFFFF',
    secondary: '#1E293B',
    secondaryForeground: '#CBD5E1',
    muted: '#1E293B',
    mutedForeground: '#94A3B8',
    success: '#34D399',
    successLight: '#064E3B',
    warning: '#FBBF24',
    warningLight: '#451A03',
    destructive: '#F87171',
    destructiveLight: '#450A0A',
    info: '#60A5FA',
    infoLight: '#1E3A5F',
    border: '#334155',
    input: '#334155',
    inputBackground: '#1E293B',
    shadow: 'rgba(0, 0, 0, 0.3)',
    statusOpen: '#60A5FA',
    statusOpenBg: '#1E3A5F',
    statusInProgress: '#A78BFA',
    statusInProgressBg: '#2E1065',
    statusWaiting: '#FBBF24',
    statusWaitingBg: '#451A03',
    statusQualityCheck: '#818CF8',
    statusQualityCheckBg: '#1E1B4B',
    statusReady: '#34D399',
    statusReadyBg: '#064E3B',
    statusCompleted: '#10B981',
    statusCompletedBg: '#022C22',
    statusCancelled: '#F87171',
    statusCancelledBg: '#450A0A',
    bookingPending: '#FBBF24',
    bookingPendingBg: '#451A03',
    bookingAccepted: '#34D399',
    bookingAcceptedBg: '#064E3B',
    bookingRejected: '#F87171',
    bookingRejectedBg: '#450A0A',
    bookingConverted: '#A78BFA',
    bookingConvertedBg: '#2E1065',
  },

  radius: 12,
};

export default colors;
