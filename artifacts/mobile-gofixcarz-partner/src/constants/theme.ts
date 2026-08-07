/**
 * GoFixCarz Partner — Design Tokens
 * Single source of truth for the new premium design system.
 */
import { Platform } from 'react-native';

// ── Palette ──────────────────────────────────────────────────────────────────
export const COLORS = {
  // Backgrounds
  BG:         '#F8FAFC',
  CARD:       '#FFFFFF',

  // Brand — Royal Navy & Cobalt Blue
  PRIMARY:    '#2563EB',
  PRIMARY_BG: '#EFF6FF',  // soft blue tint for chips/avatars

  // Text
  TEXT:       '#0F172A',
  MUTED:      '#64748B',
  SUBTLE:     '#94A3B8',

  // Borders
  BORDER:     '#E2E8F0',
  DIVIDER:    '#F1F5F9',

  // Status — foreground / background pairs
  STATUS: {
    PENDING:     { color: '#D97706', bg: '#FFFBEB' },
    CONFIRMED:   { color: '#2563EB', bg: '#EFF6FF' },
    COMPLETED:   { color: '#059669', bg: '#ECFDF5' },
    CANCELLED:   { color: '#DC2626', bg: '#FEF2F2' },
    IN_PROGRESS: { color: '#0284C7', bg: '#F0F9FF' },
    OPEN:        { color: '#3B82F6', bg: '#EFF6FF' },
    QC:          { color: '#6366F1', bg: '#F5F3FF' },
    READY:       { color: '#059669', bg: '#ECFDF5' },
  },

  // Semantic
  SUCCESS:     '#059669',
  SUCCESS_BG:  '#ECFDF5',
  WARNING:     '#D97706',
  WARNING_BG:  '#FFFBEB',
  DANGER:      '#EF4444',
  DANGER_BG:   '#FEF2F2',
  INFO:        '#2563EB',
  INFO_BG:     '#EFF6FF',
} as const;

// ── Typography ────────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  h1:     { fontSize: 20, fontWeight: '700' as const, color: COLORS.TEXT },
  h2:     { fontSize: 18, fontWeight: '700' as const, color: COLORS.TEXT },
  h3:     { fontSize: 16, fontWeight: '600' as const, color: COLORS.TEXT },
  body:   { fontSize: 14, fontWeight: '400' as const, color: COLORS.TEXT },
  bodyMd: { fontSize: 14, fontWeight: '500' as const, color: COLORS.TEXT },
  bodySm: { fontSize: 13, fontWeight: '400' as const, color: COLORS.MUTED },
  label:  { fontSize: 12, fontWeight: '500' as const, color: COLORS.MUTED },
  xs:     { fontSize: 11, fontWeight: '400' as const, color: COLORS.SUBTLE },
  caption:{ fontSize: 10, fontWeight: '500' as const, color: COLORS.SUBTLE },
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
} as const;

// ── Radii ─────────────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
} as const;

// ── Shadows ───────────────────────────────────────────────────────────────────
export const SHADOW = {
  card: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
    android: { elevation: 2 },
    default: {},
  }) ?? {},
  md: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    android: { elevation: 4 },
    default: {},
  }) ?? {},
} as const;

// ── Nav bar ───────────────────────────────────────────────────────────────────
export const NAV_HEIGHT = 60;
