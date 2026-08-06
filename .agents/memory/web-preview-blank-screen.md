---
name: Web preview blank screen causes
description: Why the Expo web preview shows blank white screens and how they were fixed.
---

# Web preview blank screen — causes and fixes

## Three root causes (all fixed)

### 1. Font-loading gate in `_layout.tsx`
`if (!appReady) return null` was blocking the entire React tree for 1-3 seconds while Inter downloaded. On web, `Font.loadAsync` is async HTTP — it takes time. During that window, the app returned nothing (blank white).

**Fix:** Load fonts fire-and-forget in `useEffect`, render children immediately. System fonts show briefly until Inter loads — completely acceptable.

### 2. Slide animation on web in `app/(auth)/_layout.tsx`
`animation: 'slide_from_right'` in the auth Stack kept the login screen off-viewport during the slide-in transition. Screenshot tool captured mid-animation = blank.

**Fix:** `animation: Platform.OS === 'web' ? 'none' : 'slide_from_right'`

### 3. 2.8s splash timer in `app/index.tsx`
`SPLASH_MS = 2800` made the web preview sit on the branded splash for 2.8 seconds before routing to login. Combined with the font gate, total wait was ~5 seconds — screenshot tool always captured before login appeared.

**Fix:** `const SPLASH_MS = Platform.OS === 'web' ? 0 : 2800`

## Result
Login screen now renders instantly on every page load. No blank white screens.

## How to apply
If blank web screens reappear: check these three files first before investigating Metro/bundle issues.
- `app/_layout.tsx` — must NOT have a blocking `return null` before font load
- `app/(auth)/_layout.tsx` — animation must be `'none'` on web
- `app/index.tsx` — SPLASH_MS must be 0 on web
