---
name: Logo store pattern
description: How the garage logo URI is managed and displayed across screens in the GoFixCarz Partner app
---

## Rule
The profile screen (`app/(tabs)/profile.tsx`) MUST read `logoUri` from `useLogoStore(s => s.logoUri)` — never from local `useState`.

**Why:** A local state copy resets to `null` on every component re-render/remount and requires its own async `useEffect` seed from AsyncStorage. This causes the logo to flash away and not reflect picks immediately across screens. The Zustand store is the single source of truth; every screen subscribing to it updates synchronously when `setLogoUri` is called.

**How to apply:**
- `profile.tsx`: `const logoUri = useLogoStore(s => s.logoUri);` — no local useState.
- `applyLogo` helper in `pickLogo`: only calls `setLogoUri_store(uri)` + `StorageService.set(...)`, no local state setter.
- Seed useEffect in profile: checks `useLogoStore.getState().logoUri` first to avoid overwriting an already-seeded store; if empty, reads AsyncStorage → falls back to `garage.logo_url` → saves to AsyncStorage if not already there.
- `more/index.tsx` and other screens: already use `useLogoStore(s => s.logoUri)` correctly.
- On boot: `_layout.tsx` calls `useLogoStore.getState().initializeLogo()` (not awaited — runs in background).
- On logout: `AuthContext.tsx logout()` clears the store AND removes `STORAGE_KEYS.GARAGE_LOGO` from AsyncStorage.
