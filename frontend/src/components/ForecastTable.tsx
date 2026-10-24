import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Row } from "../types";
import { date, datetime, number, signed, time } from "../utils/format";
type Sort =
  | "delivery_time"
  | "publish_time"
  | "forecast_mw"
  | "actual_mw"
  | "error_mw"
  | "absolute_error_mw"
  | "percentage_error";
export function ForecastTable({
  rows,
  compact = false,
  onViewAll,
}: {
  rows: Row[];
  compact?: boolean;
  onViewAll?: () => void;
}) {
  const [sort, setSort] = useState<Sort>("delivery_time");
  const [ascending, setAscending] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = compact ? 6 : 20;
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            !search ||
            `${datetime(r.delivery_time)} ${r.delivery_time} ${datetime(r.publish_time)} ${r.publish_time ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) => {
          const av = a[sort],
            bv = b[sort];
          if (av == null) return bv == null ? 0 : 1;
          if (bv == null) return -1;
          return (av < bv ? -1 : av > bv ? 1 : 0) * (ascending ? 1 : -1);
        }),
    [rows, sort, ascending, search],
  );
  const maxPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  const safePage = Math.min(page, maxPage);
  const visible = filtered.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );
  const headings: { key: Sort; title: string }[] = [
    { key: "delivery_time", title: "Delivery · GMT" },
    { key: "publish_time", title: "Publication · GMT" },
    { key: "forecast_mw", title: "Forecast MW" },
    { key: "actual_mw", title: "Actual MW" },
    { key: "error_mw", title: "Error MW" },
    { key: "absolute_error_mw", title: "Abs. error MW" },
    { key: "percentage_error", title: "Error %" },
  ];
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <div className="section-eyebrow">EVERY INTERVAL, TRACEABLE</div>
          <h2>Forecast detail</h2>
          <p>
            Selected day-ahead vintage and actual generation. All values in MW
            unless stated.
          </p>
        </div>
        {compact ? (
          <button className="text-button green-link" onClick={onViewAll}>
            Explore intervals <ChevronRight size={15} />
          </button>
        ) : (
          <label className="table-search">
            <Search size={15} />
            <span className="sr-only">Search delivery or publication date</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search date or time…"
            />
          </label>
        )}
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">
            Half-hour delivery records including selected forecast publication,
            actual, and errors. Amber marks an absolute percentage error of at
            least 20%, a pilot visual threshold.
          </caption>
          <thead>
            <tr>
              {headings.map((h) => (
                <th
                  key={h.key}
                  scope="col"
                  aria-sort={
                    sort === h.key
                      ? ascending
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    onClick={() => {
                      if (sort === h.key) setAscending(!ascending);
                      else {
                        setSort(h.key);
                        setAscending(true);
                      }
                      setPage(0);
                    }}
                  >
                    {h.title}
                    {sort === h.key ? (
                      ascending ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ArrowUpDown size={11} />
                    )}
                  </button>
                </th>
              ))}
              <th scope="col">Alignment</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.delivery_time}>
                <td>
                  <span className="date-cell">
                    {date(r.delivery_time)} <span>{time(r.delivery_time)}</span>
                  </span>
                </td>
                <td className="muted">{datetime(r.publish_time)}</td>
                <td>{number(r.forecast_mw)}</td>
                <td>{number(r.actual_mw)}</td>
                <td>
                  <span
                    className={
                      r.error_mw != null && r.error_mw > 0
                        ? "text-amber"
                        : "text-green"
                    }
                  >
                    {signed(r.error_mw)}
                  </span>
                </td>
                <td>{number(r.absolute_error_mw)}</td>
                <td>
                  <span
                    className={
                      r.percentage_error != null &&
                      Math.abs(r.percentage_error) >= 20
                        ? "error-chip"
                        : "muted"
                    }
                  >
                    {signed(r.percentage_error, 1)}
                    {r.percentage_error != null ? "%" : ""}
                  </span>
                </td>
                <td>
                  <span className="alignment-tag">
                    {r.alignment === "hourly_hold"
                      ? "Hourly hold"
                      : r.alignment === "exact"
                        ? "Exact"
                        : "Missing"}
                  </span>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={8} className="no-results">
                  No intervals match your search. Try another date or time.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>
          {filtered.length
            ? `${safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, filtered.length)}`
            : "0"}{" "}
          of {number(filtered.length)} intervals{" "}
          <span className="muted">· Signed error = forecast − actual</span>
        </span>
        {!compact && (
          <div className="pagination">
            <button
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft size={15} />
            </button>
            <span>
              Page {safePage + 1} of {maxPage + 1}
            </span>
            <button
              aria-label="Next page"
              disabled={safePage === maxPage}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
