---
name: Jobs list default stage
description: The Workshop jobs list must default to 'All' stage; any other default hides newly created or uncommon-status jobs
---

**Rule:** `DEFAULT_STAGE = 'All'` in `app/(tabs)/jobs/index.tsx`.

**Why:** Newly created jobs arrive with status `OPEN`. If the default stage is `'In Progress'`, users who create a job and immediately go to the jobs list see nothing — the job is invisible. This was the original bug.

**STAGE_STATUS_MAP includes:**
- `All` → all statuses (OPEN, IN_PROGRESS, WAITING_FOR_PARTS, QUALITY_CHECK, READY, COMPLETED, CANCELLED)
- `In Progress` → [IN_PROGRESS, WAITING_FOR_PARTS] (WAITING_FOR_PARTS is a sub-status of in-progress work)
- `Done` → [COMPLETED] (not DELIVERED — DELIVERED is not a real API status)
- `Cancelled` → [CANCELLED]

**JOB_STATUS config** must include WAITING_FOR_PARTS and CANCELLED; do NOT include DELIVERED (not an API status).
