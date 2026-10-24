import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KPIGrid } from "./KPIGrid";
import type { Analysis } from "../types";
describe("Procurement KPIs", () => {
  it("renders values, units, direction, and accessible business explanations", () => {
    const data = {
      metrics: { mae_mw: 250, rmse_mw: 380, bias_mw: 100, count: 48 },
      meta: {
        latest: {
          forecast_mw: 12000,
          delivery_time: "2026-01-02T23:30:00Z",
          lead_hours: 38,
        },
      },
    } as Analysis;
    render(<KPIGrid data={data} />);
    expect(screen.getByText("12,000")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(
      screen.getByText("Wind is over-predicted on average"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Positive values mean wind is over-predicted/),
    ).toBeInTheDocument();
  });
});
