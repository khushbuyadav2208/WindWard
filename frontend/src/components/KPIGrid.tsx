import {
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Percent,
  Target,
  Activity,
  Scale,
} from "lucide-react";
import type { Analysis } from "../types";
import { number, signed } from "../utils/format";
export function KPIGrid({ data }: { data: Analysis }) {
  const { metrics: m } = data;
  const kpis = [
    {
      title: "Mean absolute error",
      value: number(m.mae_mw),
      unit: "MW",
      icon: Target,
      definition:
        "MAE: average absolute forecast error across matched half-hours. This describes the typical size of the wind forecast miss.",
      detail: "Typical forecast deviation",
      extra: `${number(m.count)} matched intervals`,
      tone: "",
    },
    {
      title: "Root mean square error",
      value: number(m.rmse_mw),
      unit: "MW",
      icon: Activity,
      definition:
        "RMSE: square root of the average squared error. Larger misses receive more weight, highlighting exposure to severe errors.",
      detail: "Greater weight on large misses",
      extra: "Lower indicates better accuracy",
      tone: "",
    },
    {
      title: "Forecast bias",
      value: signed(m.bias_mw),
      unit: "MW",
      icon: Scale,
      definition:
        "Mean forecast minus actual. Positive values mean wind is over-predicted; negative values mean it is under-predicted.",
      detail:
        m.bias_mw == null
          ? "No matched observations"
          : m.bias_mw > 0
            ? "Wind is over-predicted on average"
            : m.bias_mw < 0
              ? "Wind is under-predicted on average"
              : "No average directional bias",
      extra:
        m.bias_mw == null
          ? "—"
          : m.bias_mw > 0
            ? "Potential wind shortfall"
            : "Potential additional wind",
      tone: "amber",
    },
    {
      title: "MAPE",
      value: number(m.mape_pct, 1),
      unit: "%",
      icon: Percent,
      definition:
        "Mean absolute percentage error. Zero actuals are excluded; this measure is sensitive when actual generation is very low.",
      detail: "Mean absolute percentage error",
      extra: "Zero actual values excluded",
      tone: "",
    },
  ];
  return (
    <div className="kpi-grid">
      {kpis.map(
        ({
          title,
          value,
          unit,
          icon: Icon,
          definition,
          detail,
          extra,
          tone,
        }) => (
          <article className={`kpi ${tone}`} key={title}>
            <div className="kpi-heading">
              <span>{title}</span>
              <span
                className="metric-info"
                tabIndex={0}
                role="img"
                aria-label={definition}
              >
                <Info size={13} />
                <span className="metric-tooltip">{definition}</span>
              </span>
            </div>
            <div className="kpi-number">
              {value}
              <span>{unit}</span>
            </div>
            <p>{detail}</p>
            <div className="kpi-foot">
              <Icon size={13} />
              {extra}
              {title === "Forecast bias" &&
                (m.bias_mw != null && m.bias_mw > 0 ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowDownRight size={14} />
                ))}
            </div>
          </article>
        ),
      )}
    </div>
  );
}
