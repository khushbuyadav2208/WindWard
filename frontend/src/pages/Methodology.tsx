import {
  ArrowUpRight,
  Database,
  FileCheck2,
  GitBranch,
  Info,
} from "lucide-react";
import type { Analysis } from "../types";
import { datetime, number } from "../utils/format";
export function Methodology({ data }: { data: Analysis | null }) {
  return (
    <div className="methodology">
      <section className="method-hero">
        <div className="section-eyebrow">
          <FileCheck2 size={14} /> DESIGNED TO BE AUDITABLE
        </div>
        <h2>
          A forecast is only useful if it was
          <br />
          available when the decision was made.
        </h2>
        <p>
          Windward reconstructs that historical view. Delivery time and
          publication time are separate throughout the pipeline, and future
          publications never enter the day-ahead comparison.
        </p>
      </section>
      <div className="two-column method-foundations">
        <section className="panel method-panel">
          <Database size={22} />
          <h2>Data sources</h2>
          <div className="source-blocks">
            <section className="source-block">
              <h3>
                <Database size={16} /> FUELHH
              </h3>
              <p>Actual generation</p>
              <dl>
                <div>
                  <dt>Provider</dt>
                  <dd>Elexon Insights / BMRS</dd>
                </div>
                <div>
                  <dt>Fuel type</dt>
                  <dd>WIND</dd>
                </div>
                <div>
                  <dt>Resolution</dt>
                  <dd>30 minutes</dd>
                </div>
                <div>
                  <dt>Fields</dt>
                  <dd>startTime · generation</dd>
                </div>
              </dl>
            </section>
            <section className="source-block">
              <h3>
                <Database size={16} /> WINDFOR
              </h3>
              <p>Forecast generation · all available vintages</p>
              <dl>
                <div>
                  <dt>Provider</dt>
                  <dd>Elexon Insights / BMRS</dd>
                </div>
                <div>
                  <dt>Fuel type</dt>
                  <dd>WIND</dd>
                </div>
                <div>
                  <dt>Resolution</dt>
                  <dd>Hourly targets, held to half-hours</dd>
                </div>
                <div>
                  <dt>Fields</dt>
                  <dd>startTime · publishTime · generation</dd>
                </div>
              </dl>
            </section>
          </div>
          <details className="method-disclosure">
            <summary>Source scope & documentation</summary>
            <dl className="method-facts">
              <div>
                <dt>Geography</dt>
                <dd>National Great Britain</dd>
              </div>
              <div>
                <dt>Comparison resolution</dt>
                <dd>30 minutes · generation in MW</dd>
              </div>
              <div>
                <dt>Timezone</dt>
                <dd>Europe/London · GMT in January</dd>
              </div>
            </dl>
            <p>
              Operationally metered national wind data; this is not a claim of
              coverage of every embedded wind installation.
            </p>
            <a
              className="green-link"
              href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
              target="_blank"
              rel="noreferrer"
            >
              Official Elexon API documentation <ArrowUpRight size={13} />
            </a>
          </details>
        </section>
        <section className="panel method-panel">
          <GitBranch size={22} />
          <h2>Decision reconstruction</h2>
          <ol className="method-steps">
            <li>
              <strong>Set the delivery day.</strong>
              <span>
                Decision-date mode maps 1–31 Jan decisions to 2 Jan–1 Feb
                deliveries. Delivery-date mode analyses 1–31 Jan deliveries.
              </span>
            </li>
            <li>
              <strong>Apply the D−1 cutoff.</strong>
              <span>
                Default 10:00 Europe/London, configurable under Decision
                settings. This is an explicit pilot assumption, not a mandated
                market rule.
              </span>
            </li>
            <li>
              <strong>Select the latest eligible vintage.</strong>
              <span>
                For each target, select the greatest publishTime ≤ cutoff. A
                publication exactly at cutoff is eligible.
              </span>
            </li>
            <li>
              <strong>Align, compare, explain.</strong>
              <span>
                Exact target preferred within a vintage. For :30 only, an
                eligible :00 hourly value may be held constant. No interpolation
                or actual-value filling.
              </span>
            </li>
          </ol>
        </section>
      </div>
      <div className="method-evidence">
        <section className="panel method-panel formula-panel">
          <h2>Accuracy metrics</h2>
          <p>
            For each matched interval: F = selected forecast, A = actual, e = F
            − A. N is the number of matched pairs. Every interval has equal
            weight.
          </p>
          <div className="table-scroll formula-table">
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Formula</th>
                  <th>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [
                    "Signed error",
                    "e = F − A",
                    "Positive: over-forecast; negative: under-forecast.",
                  ],
                  [
                    "Mean absolute error",
                    "MAE = Σ|e| / N",
                    "Typical absolute forecast deviation.",
                  ],
                  [
                    "Root mean square error",
                    "RMSE = √(Σe² / N)",
                    "Larger misses receive more weight.",
                  ],
                  [
                    "Mean bias",
                    "Bias = Σe / N",
                    "Average direction of forecast error.",
                  ],
                  [
                    "Percentage error",
                    "MAPE = 100 × mean(|e| / A), A > 0",
                    "Percentage miss; excludes zero actuals.",
                  ],
                  [
                    "Weighted percentage error",
                    "WAPE = 100 × Σ|e| / ΣA",
                    "Absolute error relative to total actual generation.",
                  ],
                  [
                    "Worst single miss",
                    "Max absolute error = max(|e|)",
                    "Largest single half-hour deviation.",
                  ],
                  [
                    "Historical error percentile",
                    "P90 = sorted |e| at rank ceil(0.90 × N)",
                    "Historical absolute-error percentile; not a future confidence bound.",
                  ],
                ].map(([label, formula, interpretation]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>
                      <code>{formula}</code>
                    </td>
                    <td>{interpretation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="method-disclosure">
            <summary>Metric definitions & edge cases</summary>
            <p>
              MAPE excludes zero actuals and can be unstable at low wind output.
              WAPE includes zero-actual pairs in its numerator and is undefined
              when total actual generation is zero. Undefined metrics display
              “—”. Amber table badges mark |percentage error| ≥ 20%, an
              illustrative visual threshold.
            </p>
          </details>
        </section>
        <section className="panel method-panel">
          <div className="quality-heading">
            <h2>Data health & provenance</h2>
            <span className="soft-badge">
              {data
                ? `${number(data.metrics.coverage_pct, 1)}% matched`
                : "Awaiting dataset"}
            </span>
          </div>
          {data ? (
            <>
              <div className="quality-stat-grid">
                <div>
                  <span>Matched intervals</span>
                  <strong>{number(data.metrics.count)}</strong>
                </div>
                <div>
                  <span>Missing actuals</span>
                  <strong>{number(data.meta.quality.missing_actual)}</strong>
                </div>
                <div>
                  <span>Data coverage</span>
                  <strong>{number(data.metrics.coverage_pct, 1)}%</strong>
                </div>
                <div>
                  <span>Retrieved · GMT</span>
                  <strong className="small-number">
                    {datetime(data.meta.fetched_at)}
                  </strong>
                </div>
              </div>
              <details className="method-disclosure provenance-details">
                <summary>Source validation & provenance</summary>
                <p>
                  Missing forecasts:{" "}
                  {number(data.meta.quality.missing_forecast)} · Hourly-held
                  intervals: {number(data.meta.quality.hourly_hold_intervals)}
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Source validation</th>
                        <th>Invalid</th>
                        <th>Duplicates removed</th>
                        <th>Conflicts quarantined</th>
                        <th>Outside delivery scope</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.meta.validation).map(([key, q]) => (
                        <tr key={key}>
                          <td>
                            {key === "actuals" ? "FUELHH / WIND" : "WINDFOR"}
                          </td>
                          <td>{number(q.invalid_records)}</td>
                          <td>{number(q.duplicate_records)}</td>
                          <td>{number(q.conflicting_records)}</td>
                          <td>{number(q.out_of_scope_records)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  Validation counts refer to the full loaded source extract; the
                  match counts above follow your current filters. Identical
                  delivery/publication duplicates are removed. Conflicting
                  values within one vintage are quarantined. For revised
                  actuals, the latest retrieved publication wins.
                </p>
                <p>
                  Cache source: <code>{data.meta.cache_source}</code>. Source
                  publications fetched from{" "}
                  {datetime(data.meta.provenance.publication_window_start)} to{" "}
                  {datetime(data.meta.provenance.publication_window_end)} GMT.
                  The bundled snapshot contains real Elexon records and has a
                  SHA-256 manifest in the repository.
                </p>
              </details>
            </>
          ) : (
            <p>Load an analysis to inspect validation counts and provenance.</p>
          )}
          <div className="method-callout">
            <Info size={18} />
            <p>
              Historical actuals are retrieved today and may contain revisions.
              Forecast reconstruction uses Elexon publication timestamps as the
              availability proxy; original transmission delays are not
              observable. A 24-hour cache age threshold flags staleness but does
              not invalidate the historical dataset.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
