---
name: Job detail refetch pattern
description: How to reliably refresh the job detail (including timelines) after a status mutation
---

**The race condition:** When a status mutation succeeds, calling `invalidateQueries`
immediately on the job detail (`['job', id]`) fires a GET request before the server
has committed the new timeline entry to the database. The response comes back with
stale timelines. This is a server-side write-then-read race.

**Fix pattern in [id].tsx:**
```ts
const invalidate = () => {
  // Immediate: lists / dashboard / analytics are safe (don't include timelines)
  qc.invalidateQueries({ queryKey: ['jobs'] });
  qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
  qc.invalidateQueries({ queryKey: ['analytics'] });
  // Delayed 800ms: job detail needs server time to write the timeline entry
  setTimeout(() => {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.JOB(id) });
  }, 800);
};
```

**Also add:**
- `useFocusEffect(() => { refetch(); }, [refetch])` — refetches every time the screen gains focus
- `staleTime: 0` on the job detail query
- `RefreshControl` pull-to-refresh on the job detail ScrollView
- `metaFor(status)` must call `.toUpperCase()` on the input before the STATUS_META lookup
  to handle any API responses that return lowercase status strings

**Why:** The optimistic `applyCachedStatus` writes status immediately but cannot add
a timeline entry (no id/timestamp). The background refetch must wait for the server.
