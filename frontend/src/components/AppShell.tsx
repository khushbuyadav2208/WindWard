import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Radio,
  RefreshCw,
  Waves,
  Wind,
  X,
  Activity,
} from "lucide-react";
import { useState } from "react";
import type { Analysis, Page } from "../types";
import { datetime } from "../utils/format";
const navigation: { id: Page; label: string; icon: typeof Wind }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "forecast", label: "Forecast analysis", icon: Activity },
  { id: "accuracy", label: "Accuracy analysis", icon: BarChart3 },
  { id: "methodology", label: "Data & methodology", icon: BookOpen },
];
export function AppShell({
  page,
  onPage,
  data,
  refreshing,
  onRefresh,
  children,
}: {
  page: Page;
  onPage: (page: Page) => void;
  data: Analysis | null;
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#overview"
          onClick={() => onPage("overview")}
          aria-label="Windward overview"
        >
          <span className="brand-mark">
            <Waves size={25} />
          </span>
          <span>
            windward<span className="brand-dot">.</span>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <div className="workspace-label">PROCUREMENT INTELLIGENCE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className={page === id ? "nav-item active" : "nav-item"}
              aria-current={page === id ? "page" : undefined}
              onClick={() => {
                onPage(id);
                setOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {page === id && <ChevronRight size={15} />}
            </a>
          ))}
        </nav>
        <div className="sidebar-context">
          <span className="mini-label">ANALYSIS WORKSPACE</span>
          <strong>
            Great Britain <span>GB</span>
          </strong>
          <p>National wind generation</p>
          <div className="sidebar-divider" />
          <span className="sidebar-source">
            <span className="status-dot" />
            Elexon Insights · BMRS
          </span>
          <p>FUELHH + WINDFOR</p>
        </div>
        <div className="sidebar-bottom">
          <span className="pilot-tag">PILOT / 01</span>
          <p>
            Better visibility.
            <br />
            More informed decisions.
          </p>
          <a href="https://bmrs.elexon.co.uk/" target="_blank" rel="noreferrer">
            Explore the data source <ArrowUpRight size={13} />
          </a>
        </div>
      </aside>
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="mobile-menu icon-button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="history-badge">
              <Radio size={12} /> Historical analysis
            </span>
            <span className="topbar-period">January 2026</span>
            <span className="avatar" aria-label="Great Britain workspace">
              GB
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <Wind size={14} /> WIND GENERATION INTELLIGENCE
              </div>
              <h1>
                {page === "overview"
                  ? "A clearer view of the day ahead."
                  : page === "forecast"
                    ? "From forecast to delivery."
                    : page === "accuracy"
                      ? "Understand the uncertainty."
                      : "Confidence starts with the data."}
              </h1>
              <p>
                {page === "overview"
                  ? "Wind forecasts, measured against reality. Make every procurement decision better informed."
                  : page === "forecast"
                    ? "Inspect the forecast available at decision time, and trace every delivery interval."
                    : page === "accuracy"
                      ? "Quantify forecast reliability and identify where procurement exposure is greatest."
                      : "Transparent sources, explicit assumptions, and a reproducible analytical process."}
              </p>
            </div>
            <button
              className="button button-white refresh-button"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? "spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
          <div className="data-strip">
            <span>
              <span className="status-dot" /> Elexon national WIND{" "}
              <span className="strip-separator">/</span> 30-minute comparison
            </span>
            <span>
              Retrieved {data ? `${datetime(data.meta.fetched_at)} GMT` : "—"}{" "}
              <span className="snapshot-tag">
                {data?.meta.cache_source === "elexon_live_refresh"
                  ? "REFRESHED"
                  : "SNAPSHOT"}
              </span>
            </span>
          </div>
          {children}
          <footer className="footer">
            <span>
              WINDWARD <span className="footer-dot">/</span> Decision
              intelligence for a changing grid.
            </span>
            <span>Elexon BMRS · Europe/London (GMT) · January 2026 pilot</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
