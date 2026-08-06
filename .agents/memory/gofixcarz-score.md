---
name: GoFixCarz Score formula
description: How the partner performance score is computed and displayed in analytics
---

The GoFixCarz Score is computed entirely client-side from the analytics API response.
The API has NO score field — `AnalyticsResponse` returns `total_jobs`, `total_revenue`,
`status_counts`, and `graph_data` only.

**Formula:**
```
completionRate = COMPLETED / max(total_jobs, 1)
nonCancelRate  = 1 - (CANCELLED / max(total_jobs, 1))
score = min(100, round(completionRate * 70 + nonCancelRate * 30))
```

**Grades:**
- 90–100 → A (green #059669)
- 75–89  → B (blue #2563EB)
- 60–74  → C (amber #D97706)
- 40–59  → D (orange #EA580C)
- 0–39   → F (red #DC2626)

**Why:** The production API at api.gofixcarz.com returns no score metric. Computing
client-side from status_counts is accurate and updates immediately with analytics data.

**How to apply:** `computeScore(statusCounts, totalJobs)` in analytics.tsx returns
`{ score, completedJobs, totalJobs, cancelledJobs }`. The `GoFixCarzScoreCard` component
renders the SVG arc gauge and grade badge.
