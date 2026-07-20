---
name: GoFixCarz Partner App
description: Architecture decisions, API quirks, and design conventions for the GoFixCarz Partner mobile app (Expo / React Native).
---

## API
- Base URL: `https://api.gofixcarz.com/api/v1` (set via `EXPO_PUBLIC_API_BASE_URL` env var)
- Auth is OTP-based: `POST /auth/sign-in { mobile }` → sends OTP; `POST /auth/verify-otp { mobile, otp }` → returns `{ access_token, refresh_token, user? }`
- All responses wrapped in `APIResponse<T> = { success, message?, data: T }`
- Paginated lists return `{ items, total, page, page_size, total_pages }`
- **Excluded from Garage Owner scope:** Customers, Vehicles tags

## Auth Flow
1. Login: `AuthService.signIn(mobile)` → navigate to OTP screen → `AuthService.verifyOtp(mobile, otp)` → store tokens + navigate to `/(tabs)`
2. Register: `AuthService.signUp(payload)` → navigate to OTP screen → same verify step
3. Tokens stored in AsyncStorage via `STORAGE_KEYS` constants; api.client.ts auto-injects Bearer token

## Navigation Structure
```
app/index.tsx → auth redirect (checks isAuthenticated)
app/(auth)/ → welcome, login, otp, register
app/(tabs)/ → Dashboard, Bookings, Jobs, Services, More
  bookings/ → index (list), [id] (detail: accept/reject/create-job)
  jobs/     → index (list + search + filter), create, [id] (full detail + status change + complete)
  services/ → index (list), create, [id] (edit + delete)
  more/     → index (menu), notifications, analytics, garage, profile
```

## Design System
- Primary: #1B3A6B (navy), Accent: #FF6B2B (orange), Background: #F5F7FA
- Colors in `constants/colors.ts`; accessed via `hooks/useColors.ts`
- `useColors()` returns spread of light/dark palette + `radius`
- Tab bar uses `Tabs` from expo-router with BlurView on iOS, plain on Android/web

## Key Conventions
- React Query for all data fetching; query keys in `QUERY_KEYS` constant
- Services in `src/services/`, one file per API domain
- Types in `src/types/`, barrel via `src/types/index.ts`
- Components in `src/components/`, barrel via `src/components/index.ts`
- Auth state: Zustand store (`src/store/auth.store.ts`) + React context (`src/context/AuthContext.tsx`)

**Why:** The Zustand store handles raw token state; the context wraps it with navigation side-effects (router.replace). This separation keeps the store portable and testable.
