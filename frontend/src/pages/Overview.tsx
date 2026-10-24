import type { Analysis, Filters, Page } from "../types";
import { KPIGrid } from "../components/KPIGrid";
import { ForecastChart, ErrorChart } from "../components/Charts";
import { DecisionBanner, DecisionBrief } from "../components/DecisionBrief";
import { ForecastTable } from "../components/ForecastTable";
export function Overview({
  data,
  filters,
  onFilters,
  onPage,
}: {
  data: Analysis;
  filters: Filters;
  onFilters: (f: Filters) => void;
  onPage: (p: Page) => void;
}) {
  return (
    <>
      <DecisionBanner data={data} />
      <KPIGrid data={data} />
      <div className="overview-chart-grid">
        <ForecastChart data={data} filters={filters} onFilters={onFilters} />
        <DecisionBrief
          data={data}
          onMethodology={() => onPage("methodology")}
        />
      </div>
      <ErrorChart data={data} />
      <ForecastTable
        key={JSON.stringify(filters)}
        rows={data.rows}
        compact
        onViewAll={() => onPage("forecast")}
      />
    </>
  );
}
