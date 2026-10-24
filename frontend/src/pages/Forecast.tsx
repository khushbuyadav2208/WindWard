import type { Analysis, Filters } from "../types";
import { ForecastChart, ErrorChart } from "../components/Charts";
import { DecisionBanner } from "../components/DecisionBrief";
import { ForecastTable } from "../components/ForecastTable";
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
    <>
      <DecisionBanner data={data} />
      <ForecastChart data={data} filters={filters} onFilters={onFilters} />
      <ErrorChart data={data} />
      <ForecastTable key={JSON.stringify(filters)} rows={data.rows} />
    </>
  );
}
