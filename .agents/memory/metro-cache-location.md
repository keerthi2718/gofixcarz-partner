---
name: Metro transform cache location
description: Where Metro stores its transform cache in Replit — critical for diagnosing "changes not reflected in UI" issues.
---

# Metro transform cache location

## The rule
The Metro transform cache lives in **`/tmp/metro-cache`** and **`/tmp/metro-file-map-*`**, NOT in `node_modules/.cache`. Clearing only `node_modules/.cache` does NOT clear the stale transform cache.

**Why:** After a workflow restart without `--clear`, Metro reads old compiled transforms from `/tmp/metro-cache`. Even if source files changed, Metro serves the cached output. The result: only 1 module is compiled on restart (the entry point), the rest are served from stale cache. Code changes are invisible in the app.

**How to apply:**
- The dev script now permanently includes `--clear` in `expo start --localhost --port $PORT --clear`. This forces Metro to rebuild from scratch on every workflow restart — startup takes ~23-30 seconds but ensures fresh code every time.
- Symptom of stale cache: Metro logs show "Bundled Xms ... (1 module)" on startup instead of "(3508 modules)".
- Manual fix (if `--clear` is removed): `rm -rf /tmp/metro-cache /tmp/metro-file-map-*` then restart the workflow.
