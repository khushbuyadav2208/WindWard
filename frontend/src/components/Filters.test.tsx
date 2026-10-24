import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Filters } from "./Filters";
import { defaultFilters } from "../types";
describe("Shared analysis filters", () => {
  it("preserves cutoff and dates when changing date basis, and resets all controls", () => {
    const change = vi.fn();
    render(
      <Filters
        value={{ ...defaultFilters, cutoff: "09:00" }}
        onChange={change}
        onExport={vi.fn()}
        exporting={false}
      />,
    );
    fireEvent.change(screen.getByLabelText("Date interpretation"), {
      target: { value: "delivery" },
    });
    expect(change).toHaveBeenCalledWith({
      ...defaultFilters,
      basis: "delivery",
      cutoff: "09:00",
    });
    fireEvent.click(screen.getByText("Reset"));
    expect(change).toHaveBeenLastCalledWith(defaultFilters);
    fireEvent.click(screen.getByText("Decision settings"));
    expect(screen.getByLabelText("Day-ahead cutoff (London)")).toHaveValue(
      "09:00",
    );
  });
});
