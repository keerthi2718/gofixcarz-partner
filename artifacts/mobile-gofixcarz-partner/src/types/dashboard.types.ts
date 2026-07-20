export interface RecentActivity {
  job_id: string;
  job_number: string;
  customer_name: string | null;
  status: string;
  notes: string | null;
  timestamp: string;
}

export interface DashboardResponse {
  jobs_today: number;
  open_jobs: number;
  in_progress_jobs: number;
  completed_jobs: number;
  cancelled_jobs: number;
  bookings_today: number;
  pending_bookings: number;
  revenue_today: number;
  revenue_this_month: number;
  recent_activities: RecentActivity[];
}
