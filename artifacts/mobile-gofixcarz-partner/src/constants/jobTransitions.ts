import type { JobStatus } from '@/src/types/job.types';

/**
 * Valid status transitions enforced by the production API.
 *
 * Rules (from GoFixCarz_Partner_API.postman_collection.json):
 *   OPEN              → IN_PROGRESS, CANCELLED
 *   IN_PROGRESS       → WAITING_FOR_PARTS, QUALITY_CHECK, CANCELLED
 *   WAITING_FOR_PARTS → IN_PROGRESS, CANCELLED
 *   QUALITY_CHECK     → READY, CANCELLED
 *   READY             → CANCELLED  (COMPLETED is triggered via the dedicated button)
 *   COMPLETED         → (terminal — no transitions)
 *   CANCELLED         → (terminal — no transitions)
 *
 * Update this map whenever the API transition rules change.
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  OPEN:              ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS:       ['WAITING_FOR_PARTS', 'QUALITY_CHECK', 'CANCELLED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS', 'CANCELLED'],
  QUALITY_CHECK:     ['READY', 'CANCELLED'],
  READY:             ['CANCELLED'],
  COMPLETED:         [],
  CANCELLED:         [],
};

/**
 * Returns the statuses the API will accept from `currentStatus`.
 * Never includes the current status itself.
 */
export function getValidNextStatuses(currentStatus: JobStatus): JobStatus[] {
  return JOB_STATUS_TRANSITIONS[currentStatus] ?? [];
}
