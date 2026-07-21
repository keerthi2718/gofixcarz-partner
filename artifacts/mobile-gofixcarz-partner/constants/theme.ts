import { Platform } from 'react-native';

/** Centralised design tokens — typography, spacing, radius, shadows */

export const font = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const typography = {
  display:  { fontSize: 32, fontWeight: '800' as const, lineHeight: 40 },
  headline: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  title:    { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  titleSm:  { fontSize: 17, fontWeight: '600' as const, lineHeight: 24 },
  body:     { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm:   { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
  caption:  { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  label:    { fontSize: 12, fontWeight: '600' as const, lineHeight: 18 },
  labelSm:  { fontSize: 11, fontWeight: '600' as const, lineHeight: 16 },
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:  12,
  base:16,
  lg:  20,
  xl:  24,
  xxl: 32,
  xxxl:40,
};

export const radius = {
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  pill:99,
};

export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }) as object,
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {},
  }) as object,
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
    android: { elevation: 8 },
    default: {},
  }) as object,
};

/** Hit-slop for accessibility — minimum 44×44 touch target */
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };
