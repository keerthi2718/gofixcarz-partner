---
name: Feather icons Android Expo Go fix
description: How and why @expo/vector-icons Feather shows tofu on Android Expo Go SDK 54 new arch, and the definitive fix.
---

## Problem
`@expo/vector-icons` Feather icons render as tofu (□) on Android Expo Go with New Architecture (Fabric) enabled (`newArchEnabled: true`), even though `Font.isLoaded('feather')` returns true. iOS works fine.

## Root cause
`Font.loadAsync` calls `ReactFontManager.setTypeface('feather', ...)` which populates the **old-arch** font registry. Android Fabric's text renderer (`TextLayoutManager`) reads from a different path and never finds the font. Any `Text` with `fontFamily: 'feather'` falls back to the system font, showing PUA glyphs as tofu.

## Fix applied
Replaced all `@expo/vector-icons` Feather imports with a drop-in SVG shim:
- Installed `lucide-react-native@1.27.0` (SVG-based, same icon names as Feather — it's the maintained fork)
- Created `src/components/ui/FeatherIcon.tsx` — accepts `name`/`size`/`color` props, maps Feather names → lucide components
- Replaced all 30 `import { Feather } from '@expo/vector-icons'` with `import { Feather } from '@/src/components/ui/FeatherIcon'`
- Removed all Feather font-loading code from `app/_layout.tsx`
- `react-native-svg` (already in Expo Go) is the rendering engine — no font loading needed at all

## lucide-react-native v1.27.0 renamed icons (vs Feather)
| Feather name | lucide v1.27.0 export |
|---|---|
| home | House |
| pie-chart | ChartPie |
| bar-chart-2 | ChartBar |
| alert-circle | CircleAlert |
| check-circle | CircleCheck |
| x-circle | CircleX |
| help-circle | CircleHelp |
| edit-2 | Pencil |
| sliders | SlidersHorizontal |
| tool | Wrench |
| map-pin | MapPin (unchanged) |

**Why:** lucide v1.x+ reorganized icon naming to be more systematic. Old names like `Tool`, `Edit2`, `PieChart` no longer exist in v1.27.0.

## Standalone APK
The EAS build with `expo-font` plugin embeds fonts natively (no Fabric issue). The SVG approach also works in standalone — no regression.
