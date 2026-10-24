import {
  CalendarDays,
  ChevronDown,
  Download,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import type { Filters as FilterType } from "../types";
import { defaultFilters } from "../types";
export function Filters({
  value,
  onChange,
  onExport,
  exporting,
  defaults = defaultFilters,
}: {
  value: FilterType;
  onChange: (value: FilterType) => void;
  onExport: () => void;
  exporting: boolean;
  defaults?: FilterType;
}) {
  const [advanced, setAdvanced] = useState(false);
  const update = (patch: Partial<FilterType>) =>
    onChange({ ...value, ...patch });
  return (
    <section className="filters" aria-label="Analysis filters">
      <div className="filter-main">
        <span className="filter-icon">
          <CalendarDays size={17} />
        </span>
        <label className="basis-field">
          <span className="sr-only">Date interpretation</span>
          <select
            value={value.basis}
            onChange={(e) =>
              update({ basis: e.target.value as FilterType["basis"] })
            }
          >
            <option value="decision">Decision dates</option>
            <option value="delivery">Delivery dates</option>
          </select>
        </label>
        <div className="date-range">
          <label>
            <span className="sr-only">Start date</span>
            <input
              type="date"
              min="2026-01-01"
              max={value.end}
              value={value.start}
              onChange={(e) =>
                e.target.value && update({ start: e.target.value })
              }
            />
          </label>
          <span>—</span>
          <label>
            <span className="sr-only">End date</span>
            <input
              type="date"
              min={value.start}
              max="2026-01-31"
              value={value.end}
              onChange={(e) =>
                e.target.value && update({ end: e.target.value })
              }
            />
          </label>
        </div>
        <span className="filter-divider" />
        <button
          className={`text-button filter-options ${advanced ? "selected" : ""}`}
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          <SlidersHorizontal size={14} /> Decision settings{" "}
          <ChevronDown size={13} />
        </button>
        <button
          className="reset-button text-button"
          onClick={() => {
            onChange({ ...defaults });
          }}
        >
          <RotateCcw size={13} /> Reset
        </button>
        <button
          className="button button-white export-button"
          onClick={onExport}
          disabled={exporting}
        >
          <Download size={14} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      {advanced && (
        <div className="advanced-filters">
          <label>
            Day-ahead cutoff (London)
            <input
              type="time"
              value={value.cutoff}
              onChange={(e) =>
                e.target.value && update({ cutoff: e.target.value })
              }
            />
          </label>
          <label>
            Delivery hour from
            <select
              value={value.hour_from}
              onChange={(e) => update({ hour_from: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option value={i} key={i}>
                  {String(i).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <label>
            Delivery hour to
            <select
              value={value.hour_to}
              onChange={(e) => update({ hour_to: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option value={i + 1} key={i}>
                  {String(i + 1).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <p>
            The cutoff is an explicit pilot assumption, applied on the day
            before delivery. All charts and metrics use these filters.
          </p>
        </div>
      )}
    </section>
  );
}
