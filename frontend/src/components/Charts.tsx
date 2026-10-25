import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowUpRight, ChartNoAxesCombined } from "lucide-react";
import type { Analysis, Filters, Row } from "../types";
import { date, datetime, number, signed } from "../utils/format";
const GREEN = "#2D6659",
  FORECAST = "#829A28",
  AMBER = "#D99A2B",
  GRID = "#E9EEEA";
const axis = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "#6B7771", fontSize: 12, fontFamily: "DM Sans, sans-serif" },
};
type Payload = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | null;
  color?: string;
  payload?: Row & { timestamp: number };
};
function GenerationTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Payload[];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  if (!r) return null;
  return (
    <div className="chart-tooltip">
      <strong>{datetime(r.delivery_time)} GMT</strong>
      <div>
        <span className="legend-dot actual" />
        Actual <b>{number(r.actual_mw)} MW</b>
      </div>
      <div>
        <span className="legend-line" />
        Day-ahead forecast <b>{number(r.forecast_mw)} MW</b>
      </div>
      <div>
        Error{" "}
        <b
          className={
            r.error_mw != null && r.error_mw > 0 ? "text-amber" : "text-green"
          }
        >
          {signed(r.error_mw)} MW
        </b>
      </div>
      <hr />
      <small>
        Published {datetime(r.publish_time)} GMT
        <br />
        Cutoff {datetime(r.decision_time)} GMT
        <br />
        {r.alignment === "hourly_hold"
          ? "Hourly value held to this half-hour"
          : r.alignment === "missing"
            ? "No eligible forecast at this cutoff"
            : "Exact target match"}
      </small>
    </div>
  );
}
export function ForecastChart({
  data,
  filters,
  onFilters,
}: {
  data: Analysis;
  filters: Filters;
  onFilters: (f: Filters) => void;
}) {
  const chartData = data.rows.map((r) => ({
    ...r,
    timestamp: new Date(r.delivery_time).getTime(),
  }));
  const singleDay = data.daily.length <= 1;
  const applyRange = (days: number) => {
    if (days === 31) {
      onFilters({ ...filters, start: "2026-01-01", end: "2026-01-31" });
      return;
    }
    const end = new Date(`${filters.end}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() - days + 1);
    const start = end.toISOString().slice(0, 10);
    onFilters({
      ...filters,
      start: start < "2026-01-01" ? "2026-01-01" : start,
    });
  };
  return (
    <section
      className="panel forecast-panel"
      aria-labelledby="generation-title"
    >
      <div className="panel-heading">
        <div>
          <div className="section-eyebrow">THE GENERATION PICTURE</div>
          <h2 id="generation-title">Actual vs. day-ahead forecast</h2>
          <p>
            The forecast available at the decision cutoff, compared with
            delivered wind.
          </p>
        </div>
        <div className="range-buttons" aria-label="Analysis range">
          {[1, 7, 31].map((d) => (
            <button
              key={d}
              className={
                Math.round(
                  (new Date(filters.end).getTime() -
                    new Date(filters.start).getTime()) /
                    86400000,
                ) +
                  1 ===
                d
                  ? "active"
                  : ""
              }
              onClick={() => applyRange(d)}
            >
              {d === 31 ? "Month" : `${d}D`}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot actual" />
          Actual wind
        </span>
        <span>
          <i className="legend-line" />
          Day-ahead forecast
        </span>
        <span className="chart-unit">Generation · MW</span>
      </div>
      <div
        className="generation-chart"
        role="img"
        aria-label={`Actual and day-ahead forecast wind generation, ${data.rows.length} half-hour intervals, ${data.metrics.coverage_pct.toFixed(1)} percent matched coverage. Exact values are available in the interval table and CSV.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 16, right: 16, bottom: 8, left: 4 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="actual-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.1} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              {...axis}
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              scale="time"
              minTickGap={48}
              tickFormatter={(v) =>
                date(
                  v,
                  singleDay
                    ? {
                        day: undefined,
                        month: undefined,
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    : {},
                )
              }
            />
            <YAxis
              {...axis}
              width={52}
              tickFormatter={(v) => `${number(v / 1000, v < 1000 ? 1 : 0)}k`}
            />
            <Tooltip content={<GenerationTooltip />} />
            <Area
              dataKey="actual_mw"
              name="Actual wind"
              type="linear"
              stroke={GREEN}
              strokeWidth={2.2}
              fill="url(#actual-fill)"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="forecast_mw"
              name="Day-ahead forecast"
              type="stepAfter"
              stroke={FORECAST}
              strokeWidth={1.9}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-caption">
        <span>
          <ChartNoAxesCombined size={13} /> Half-hourly actuals · hourly
          forecasts held across two half-hours
        </span>
        <span>
          Delivery: {date(data.meta.delivery_start)} –{" "}
          {date(data.meta.delivery_end)} 2026
        </span>
      </div>
    </section>
  );
}
export function ErrorChart({ data }: { data: Analysis }) {
  const chartData = data.rows.map((r) => ({
    ...r,
    timestamp: new Date(r.delivery_time).getTime(),
  }));
  const limit = Math.max(
    1000,
    Math.ceil(
      Math.max(...data.rows.map((r) => Math.abs(r.error_mw ?? 0))) / 1000,
    ) * 1000,
  );
  return (
    <section className="panel error-panel">
      <div className="panel-heading">
        <div>
          <div className="section-eyebrow">DIRECTION & MAGNITUDE</div>
          <h2>Where did the forecast miss?</h2>
          <p>
            Forecast minus actual · positive errors indicate a wind shortfall
            against forecast.
          </p>
        </div>
        <span className="formula-label">Forecast − Actual</span>
      </div>
      <div
        className="error-chart"
        role="img"
        aria-label="Signed forecast error in MW over delivery time. Positive indicates over-prediction; negative indicates under-prediction."
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 14, right: 8, left: 0, bottom: 0 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="error-stroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset="50%" stopColor={AMBER} />
                <stop offset="50%" stopColor={GREEN} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              {...axis}
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              minTickGap={70}
              tickFormatter={(v) =>
                data.daily.length <= 1
                  ? date(v, {
                      day: undefined,
                      month: undefined,
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : date(v)
              }
            />
            <YAxis
              {...axis}
              width={52}
              domain={[-limit, limit]}
              ticks={[-limit, -limit / 2, 0, limit / 2, limit]}
              tickFormatter={(v) => `${number(v / 1000, 1)}k`}
            />
            <ReferenceLine y={0} stroke="#62776D" strokeDasharray="4 4" />
            <Tooltip content={<GenerationTooltip />} />
            <Area
              dataKey="error_mw"
              type="linear"
              name="Forecast error"
              stroke="url(#error-stroke)"
              fill="url(#error-stroke)"
              fillOpacity={0.14}
              strokeWidth={1.6}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="error-legend">
        <span>
          <i className="legend-dot amber" />
          Over-forecast · less wind than expected
        </span>
        <span>
          <i className="legend-dot actual" />
          Under-forecast · more wind than expected
        </span>
      </div>
    </section>
  );
}
export function DailyChart({
  data,
  title = "When was uncertainty highest?",
}: {
  data: Analysis;
  title?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="section-eyebrow">DAILY PERFORMANCE</div>
          <h2>{title}</h2>
          <p>Mean absolute error by delivery day · MW</p>
        </div>
        <ArrowUpRight size={18} />
      </div>
      <div
        className="breakdown-chart"
        role="img"
        aria-label="Mean absolute forecast error by delivery date"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.daily}
            margin={{ left: 0, right: 8 }}
            accessibilityLayer
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              {...axis}
              dataKey="label"
              tickFormatter={(v) => date(v)}
              minTickGap={24}
            />
            <YAxis {...axis} width={48} />
            <Tooltip
              formatter={(v: number) => [`${number(v)} MW`, "MAE"]}
              labelFormatter={(v) => date(String(v))}
            />
            <Bar
              dataKey="mae_mw"
              fill={GREEN}
              radius={[2, 2, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
export function IntradayChart({
  data,
  title = "How does error change through the day?",
}: {
  data: Analysis;
  title?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="section-eyebrow">TIME-OF-DAY PATTERN</div>
          <h2>{title}</h2>
          <p>MAE by delivery half-hour · London time · MW</p>
        </div>
      </div>
      <div
        className="breakdown-chart"
        role="img"
        aria-label="Mean absolute error by half-hour of day"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data.time_of_day}
            margin={{ left: 0, right: 10 }}
            accessibilityLayer
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis {...axis} dataKey="label" minTickGap={32} />
            <YAxis {...axis} width={48} />
            <Tooltip formatter={(v: number) => [`${number(v)} MW`, "MAE"]} />
            <Area
              type="monotone"
              dataKey="mae_mw"
              stroke={GREEN}
              fill={GREEN}
              fillOpacity={0.08}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
export function DistributionChart({
  data,
  title = "How often were forecasts far off?",
}: {
  data: Analysis;
  title?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="section-eyebrow">ERROR DISTRIBUTION</div>
          <h2>{title}</h2>
          <p>Matched intervals grouped by signed error · MW</p>
        </div>
      </div>
      <div
        className="breakdown-chart"
        role="img"
        aria-label="Histogram of signed forecast errors"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.distribution}
            margin={{ left: 0, right: 8, bottom: 20 }}
            accessibilityLayer
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              {...axis}
              dataKey="label"
              angle={-25}
              textAnchor="end"
              interval={0}
            />
            <YAxis {...axis} width={48} allowDecimals={false} />
            <Tooltip formatter={(v: number) => [number(v), "Intervals"]} />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            >
              {data.distribution.map((d) => (
                <Cell
                  fill={d.direction === "under" ? GREEN : AMBER}
                  key={d.label}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
