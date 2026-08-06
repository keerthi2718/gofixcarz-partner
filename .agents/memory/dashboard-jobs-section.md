---
name: Dashboard shows jobs not bookings
description: The dashboard "Recent Jobs" section must use JobService, not BookingService; See All routes to jobs tab
---

**Rule:** The "Recent Jobs" section on the dashboard (`app/(tabs)/index.tsx`) queries:
```ts
JobService.list({ page_size: 10, sort_by: 'created_at', sort_dir: 'desc' })
```
with key `QUERY_KEYS.JOBS({ page_size: 10, sort_by: 'created_at', sort_dir: 'desc' })`.

**Why:** The old implementation showed bookings in a section labelled "Today's Jobs". Users who created jobs saw nothing there because jobs and bookings are separate entities. BookingService is no longer used in the dashboard component.

**"See all" routes to:** `/(tabs)/jobs` (not `/(tabs)/bookings`).

**Active Jobs KPI tile** shows: `(data?.open_jobs ?? 0) + (data?.in_progress_jobs ?? 0)` — sum of both open AND in-progress counts.

**Pull-to-refresh** calls both `refetch()` (dashboard) and `refetchJobs()` (jobs list) and gates `refreshing` on `isRefetching || jobsRefetching`.
