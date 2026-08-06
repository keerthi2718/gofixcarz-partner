---
name: Query invalidation rules
description: Which React Query caches must be invalidated after each job-mutating operation; missing any of these causes silent staleness across screens
---

After any mutation that creates, updates, or changes a job's status, invalidate ALL three:

1. `QUERY_KEYS.JOBS()` — jobs list screen
2. `QUERY_KEYS.DASHBOARD` — KPI tiles (active jobs count, revenue)
3. `['analytics']` as a prefix — invalidates all period variants (week, month, year)

**Why:** The dashboard and analytics screens each maintain separate React Query caches. If a mutation only invalidates JOBS, the KPI tiles and charts remain stale indefinitely — the user sees wrong counts and charts until they force-quit and re-open the app.

**How to apply:**
- In `create.tsx` `onSuccess`: invalidate all three
- In `[id].tsx` `invalidate()` helper: invalidate all three (already includes JOB(id) for the detail)
- Any future mutation screens (batch status, bulk complete, etc.) must follow the same pattern

**Confirmed pattern (in [id].tsx):**
```ts
const invalidate = () => {
  qc.invalidateQueries({ queryKey: QUERY_KEYS.JOB(id) });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.JOBS() });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  qc.invalidateQueries({ queryKey: ['analytics'] });
};
```
