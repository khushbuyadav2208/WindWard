import type { Analysis, Filters } from "../types";
import { ForecastChart, ErrorChart } from "../components/Charts";
import { DecisionBanner } from "../components/DecisionBrief";
import { ForecastTable } from "../components/ForecastTable";
import {
  ForecastTimeline,
  ForecastPosition,
} from "../components/ForecastPosition";
export function Forecast({
  data,
  filters,
  onFilters,
}: {
  data: Analysis;
  filters: Filters;
  onFilters: (f: Filters) => void;
}) {
  return (
    <div className="forecast-workspace">
      <ForecastTimeline data={data} />
      <DecisionBanner data={data} />
      <div className="forecast-comparison-layout">
        <ForecastChart data={data} filters={filters} onFilters={onFilters} />
        <ForecastPosition data={data} />
      </div>
      <ForecastTable key={JSON.stringify(filters)} rows={data.rows} />
      <ErrorChart data={data} />
    </div>
  );
}
