import { CalendarDays, Clock3, Wind, Target, ArrowRight } from "lucide-react";
import type { Analysis } from "../types";
import { datetime, number, signed } from "../utils/format";

/** Presentation of the selected interval; all values are supplied by the API. */
export function ForecastTimeline({ data }: { data: Analysis }) {
  return (
    <section
      className="forecast-timeline"
      aria-label="Selected forecast timeline"
    >
      <div className="timeline-track">
        <div className="section-eyebrow">
          FORECAST TIMELINE · LATEST SELECTED INTERVAL
        </div>
        <ol>
          <li>
            <span className="timeline-marker">
              <CalendarDays size={16} />
            </span>
            <div>
              <h2>Forecast published</h2>
              <strong>{datetime(data.meta.latest?.publish_time)} GMT</strong>
              <p>Latest eligible forecast release</p>
            </div>
            <ArrowRight className="timeline-arrow" size={18} />
          </li>
          <li>
            <span className="timeline-marker">2</span>
            <div>
              <h2>Decision cutoff</h2>
              <strong>{datetime(data.meta.latest?.decision_time)} GMT</strong>
              <p>Day-ahead selection boundary</p>
            </div>
            <ArrowRight className="timeline-arrow" size={18} />
          </li>
          <li>
            <span className="timeline-marker">3</span>
            <div>
              <h2>Delivery time</h2>
              <strong>{datetime(data.meta.latest?.delivery_time)} GMT</strong>
              <p>Wind generation delivered</p>
            </div>
          </li>
        </ol>
      </div>
      <div className="timeline-lead">
        <span className="section-eyebrow">LEAD TIME</span>
        <strong>
          {number(data.meta.latest?.lead_hours, 1)}
          <span> hours</span>
        </strong>
        <p>Publication to delivery</p>
      </div>
    </section>
  );
}

export function ForecastPosition({ data }: { data: Analysis }) {
  return (
    <aside className="panel forecast-position">
      <h2>Latest forecast details</h2>
      <dl>
        <div>
          <CalendarDays size={16} />
          <dt>Delivery time · GMT</dt>
          <dd>{datetime(data.meta.latest?.delivery_time)}</dd>
        </div>
        <div>
          <Wind size={16} />
          <dt>Forecast generation</dt>
          <dd>{number(data.meta.latest?.forecast_mw)} MW</dd>
        </div>
        <div>
          <Target size={16} />
          <dt>Actual generation</dt>
          <dd>{number(data.meta.latest?.actual_mw)} MW</dd>
        </div>
        <div>
          <Target size={16} />
          <dt>Forecast error</dt>
          <dd>{signed(data.meta.latest?.error_mw)} MW</dd>
        </div>
        <div>
          <CalendarDays size={16} />
          <dt>Published · GMT</dt>
          <dd>{datetime(data.meta.latest?.publish_time)}</dd>
        </div>
        <div>
          <Clock3 size={16} />
          <dt>Lead time</dt>
          <dd>{number(data.meta.latest?.lead_hours, 1)} hours</dd>
        </div>
      </dl>
      <p>
        Latest delivery interval in your selection. Missing observations display
        “—”.
      </p>
    </aside>
  );
}
