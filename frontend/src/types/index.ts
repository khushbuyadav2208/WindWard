export type Page = "overview" | "forecast" | "accuracy" | "methodology";
export interface Filters {
  start: string;
  end: string;
  basis: "decision" | "delivery";
  cutoff: string;
  hour_from: number;
  hour_to: number;
}
export const defaultFilters: Filters = {
  start: "2026-01-01",
  end: "2026-01-31",
  basis: "decision",
  cutoff: "10:00",
  hour_from: 0,
  hour_to: 24,
};
export interface Row {
  delivery_time: string;
  decision_time: string;
  publish_time: string | null;
  source_target_time: string | null;
  forecast_mw: number | null;
  actual_mw: number | null;
  error_mw: number | null;
  absolute_error_mw: number | null;
  percentage_error: number | null;
  lead_hours: number | null;
  alignment: "exact" | "hourly_hold" | "missing";
}
export interface Metrics {
  count: number;
  expected_count: number;
  coverage_pct: number;
  mae_mw: number | null;
  rmse_mw: number | null;
  mape_pct: number | null;
  wape_pct: number | null;
  bias_mw: number | null;
  max_absolute_error_mw: number | null;
  p90_absolute_error_mw: number | null;
  zero_actual_count: number;
  mean_forecast_mw: number | null;
  mean_actual_mw: number | null;
}
export type Breakdown = Metrics & { label: string };
export interface Analysis {
  meta: Filters & {
    fetched_at: string;
    cache_source: string;
    stale: boolean;
    refresh_error: string | null;
    latest: Row | null;
    delivery_start: string;
    delivery_end: string;
    refresh_protected: boolean;
    quality: {
      missing_actual: number;
      missing_forecast: number;
      hourly_hold_intervals: number;
      matched_intervals: number;
      expected_intervals: number;
    };
    validation: Record<string, Record<string, number>>;
    provenance: {
      provider: string;
      base_url: string;
      publication_window_start: string;
      publication_window_end: string;
    };
    persistence_warning: string | null;
  };
  metrics: Metrics;
  rows: Row[];
  daily: Breakdown[];
  time_of_day: Breakdown[];
  distribution: { label: string; count: number; direction: "under" | "over" }[];
  insights: { title: string; text: string; tone: string }[];
}
