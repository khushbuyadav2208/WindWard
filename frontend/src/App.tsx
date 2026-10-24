import { useEffect, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { AppShell } from "./components/AppShell";
import { RefreshDialog } from "./components/RefreshDialog";
import { Filters } from "./components/Filters";
import { EmptyState, ErrorState, LoadingState } from "./components/States";
import { useForecastData } from "./hooks/useForecastData";
import { exportData, refreshData, getConfig } from "./services/api";
import { defaultFilters, type Page } from "./types";
import { Overview } from "./pages/Overview";
import { Forecast } from "./pages/Forecast";
import { Accuracy } from "./pages/Accuracy";
import { Methodology } from "./pages/Methodology";
const validPage = (hash: string): Page =>
  ["overview", "forecast", "accuracy", "methodology"].includes(hash)
    ? (hash as Page)
    : "overview";
export default function App() {
  const [page, setPage] = useState<Page>(() =>
    validPage(window.location.hash.slice(1)),
  );
  const [filters, setFilters] = useState({ ...defaultFilters });
  const [defaults, setDefaults] = useState({ ...defaultFilters });
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useForecastData(filters, revision);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [refreshOpen, setRefreshOpen] = useState(false);
  const [token, setToken] = useState("");
  useEffect(() => {
    let active = true;
    getConfig()
      .then((config) => {
        if (active) {
          const configured = {
            ...defaultFilters,
            cutoff: config.default_cutoff,
          };
          setDefaults(configured);
          setFilters((current) =>
            JSON.stringify(current) === JSON.stringify(defaultFilters)
              ? configured
              : current,
          );
        }
      })
      .catch(() => {
        /* Data request exposes connectivity errors. */
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const listener = () => setPage(validPage(window.location.hash.slice(1)));
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  const onPage = (next: Page) => {
    setPage(next);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const refresh = async () => {
    setRefreshOpen(false);
    setRefreshing(true);
    setNotice(null);
    try {
      await refreshData(token);
      setToken("");
      setRevision((r) => r + 1);
      setNotice({
        text: "Elexon data refreshed. All analyses now use the updated source extract.",
        error: false,
      });
    } catch (err) {
      setNotice({
        text: `${(err as Error).message} Your existing dataset remains available.`,
        error: true,
      });
    } finally {
      setRefreshing(false);
    }
  };
  const onRefresh = () => {
    if (
      data?.meta.refresh_protected ||
      !["127.0.0.1", "localhost"].includes(window.location.hostname)
    )
      setRefreshOpen(true);
    else void refresh();
  };
  const onExport = async () => {
    setExporting(true);
    try {
      await exportData(filters);
    } catch (err) {
      setNotice({ text: (err as Error).message, error: true });
    } finally {
      setExporting(false);
    }
  };
  const qualityIssues =
    data &&
    data.meta.quality.missing_actual +
      data.meta.quality.missing_forecast +
      Object.values(data.meta.validation).reduce(
        (sum, q) => sum + q.invalid_records + q.conflicting_records,
        0,
      );
  return (
    <AppShell
      page={page}
      onPage={onPage}
      data={data}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Filters
        value={filters}
        onChange={setFilters}
        onExport={onExport}
        exporting={exporting}
        defaults={defaults}
      />
      {notice && (
        <div
          className={`notice ${notice.error ? "warning" : "success"}`}
          role={notice.error ? "alert" : "status"}
        >
          {notice.error ? <AlertTriangle size={17} /> : <Check size={17} />}
          <span>{notice.text}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setNotice(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {data &&
      (data.meta.stale ||
        data.meta.refresh_error ||
        qualityIssues ||
        data.meta.persistence_warning) ? (
        <div className="notice warning" role="status">
          <AlertTriangle size={16} />
          <span>
            {data.meta.stale
              ? "This cached source extract is older than 24 hours. "
              : ""}
            {qualityIssues
              ? "Source validation or unmatched intervals require review. "
              : ""}
            {data.meta.refresh_error
              ? `Last refresh failed: ${data.meta.refresh_error} `
              : ""}
            {data.meta.persistence_warning || ""}
            <button
              className="inline-button"
              onClick={() => onPage("methodology")}
            >
              View data health
            </button>
          </span>
        </div>
      ) : null}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setRevision((r) => r + 1)} />
      ) : page === "methodology" ? (
        <Methodology data={data} />
      ) : data ? (
        <>
          {!data.metrics.count && <EmptyState />}
          {page === "overview" ? (
            <Overview
              data={data}
              filters={filters}
              onFilters={setFilters}
              onPage={onPage}
            />
          ) : page === "forecast" ? (
            <Forecast data={data} filters={filters} onFilters={setFilters} />
          ) : (
            <Accuracy data={data} />
          )}
        </>
      ) : (
        <EmptyState />
      )}
      {refreshOpen && (
        <RefreshDialog
          token={token}
          onToken={setToken}
          onClose={() => setRefreshOpen(false)}
          onRefresh={() => {
            void refresh();
          }}
        />
      )}
    </AppShell>
  );
}
