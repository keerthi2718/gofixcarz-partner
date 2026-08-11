export interface TimeSeriesPoint {
  label: string;
  revenue: number;
  job_count: number;
  completed_count: number;
}

export interface JobStatusCounts {
  OPEN?: number;
  IN_PROGRESS?: number;
  QUALITY_CHECK?: number;
  COMPLETED?: number;
  CANCELLED?: number;
}

export interface AnalyticsResponse {
  period: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_jobs: number;
  status_counts: JobStatusCounts;
  graph_data: TimeSeriesPoint[];
}

export type AnalyticsPeriod = 'week' | 'month' | 'year' | 'custom';

export interface AnalyticsParams {
  period?: AnalyticsPeriod;
  start_date?: string;
  end_date?: string;
}
