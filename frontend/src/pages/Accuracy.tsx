import type { Analysis } from "../types";
import { number, signed } from "../utils/format";
import {
  DailyChart,
  DistributionChart,
  IntradayChart,
  ErrorChart,
} from "../components/Charts";
export function Accuracy({ data }: { data: Analysis }) {
  const m = data.metrics;
  const values = [
    [
      "MAE",
      `${number(m.mae_mw)} MW`,
      "Average absolute difference between forecast and actual. Describes the typical size of a wind forecast miss.",
    ],
    [
      "RMSE",
      `${number(m.rmse_mw)} MW`,
      "Penalizes large misses more heavily. A high RMSE relative to MAE indicates occasional substantial errors.",
    ],
    [
      "MAPE",
      `${number(m.mape_pct, 1)}%`,
      `Mean absolute percentage error. Excludes ${m.zero_actual_count} zero-actual pairs; sensitive when wind generation is very low.`,
    ],
    [
      "WAPE",
      `${number(m.wape_pct, 1)}%`,
      "Total absolute error divided by total actual generation. A volume-weighted percentage measure across matched intervals.",
    ],
    [
      "Mean error / bias",
      `${signed(m.bias_mw)} MW`,
      "Mean forecast minus actual. Positive: wind over-prediction and potential shortfall. Negative: under-prediction.",
    ],
    [
      "Maximum absolute error",
      `${number(m.max_absolute_error_mw)} MW`,
      "Largest single half-hour miss in the selection. Use to investigate extreme historical procurement exposure.",
    ],
  ];
  return (
    <>
      <div className="accuracy-workspace">
        <div className="accuracy-grid">
          {values.map(([label, value, description]) => (
            <article className="metric-detail" key={label}>
              <h2>{label}</h2>
              <strong>{value}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="accuracy-charts">
        <DailyChart data={data} title="Daily forecast performance" />
        <IntradayChart data={data} title="Forecast error by time of day" />
        <ErrorChart data={data} />
        <DistributionChart data={data} title="Forecast error distribution" />
      </div>
      <div className="accuracy-intro">
        <span className="section-eyebrow">MEASURE WHAT MATTERS</span>
        <p>
          Based on <strong>{number(m.count)} matched half-hours</strong> out of{" "}
          {number(m.expected_count)} expected. Missing pairs are excluded, never
          replaced with zero. All metrics describe historical performance.
        </p>
      </div>
      <div className="analysis-note">
        <strong>A procurement signal, with context.</strong>
        <p>
          Historical wind forecast errors describe uncertainty in national
          generation. These data alone do not determine your utility’s required
          purchase volume or financial exposure; demand, contracted supply and
          prices are outside this challenge’s scope.
        </p>
      </div>
    </>
  );
}
