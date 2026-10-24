import { AlertCircle, Database, RefreshCw } from "lucide-react";
export function LoadingState() {
  return (
    <div
      role="status"
      aria-label="Loading wind analysis"
      className="skeleton-layout"
    >
      <div className="skeleton skeleton-banner" />
      <div className="skeleton-kpis">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="skeleton skeleton-kpi" />
        ))}
      </div>
      <div className="skeleton skeleton-chart" />
      <div className="skeleton skeleton-table" />
      <span className="sr-only">Retrieving and aligning Elexon data…</span>
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="state-panel" role="alert">
      <AlertCircle size={30} />
      <h2>We couldn’t load the analysis.</h2>
      <p>{message}</p>
      <button className="button button-green" onClick={onRetry}>
        <RefreshCw size={15} /> Try again
      </button>
    </div>
  );
}
export function EmptyState() {
  return (
    <div className="state-panel">
      <Database size={30} />
      <h2>No matched intervals in this selection.</h2>
      <p>
        Forecast or actual records are missing. Adjust your date range or
        refresh the Elexon data. Missing values are never treated as zero.
      </p>
    </div>
  );
}
