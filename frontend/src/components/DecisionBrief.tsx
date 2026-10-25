import {
  ArrowUpRight,
  CircleCheck,
  Clock3,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import type { Analysis } from "../types";
import { datetime, number, signed } from "../utils/format";
export function DecisionBanner({ data }: { data: Analysis }) {
  return (
    <div className="decision-banner">
      <div className="banner-symbol">
        <ShieldCheck size={23} />
      </div>
      <div>
        <h2>Your decision-time view, reconstructed.</h2>
        <p>
          {data.meta.basis === "decision"
            ? "January purchase decisions → next-day deliveries."
            : "January deliveries → decisions made on the preceding day."}{" "}
          Latest available publication at or before{" "}
          <strong>{data.meta.cutoff} GMT on D−1.</strong>
        </p>
      </div>
      <span className="banner-badge">
        <CircleCheck size={14} />
        {number(data.metrics.coverage_pct, 1)}% paired coverage
      </span>
    </div>
  );
}
export function DecisionBrief({
  data,
  onMethodology,
}: {
  data: Analysis;
  onMethodology: () => void;
}) {
  const latest = data.meta.latest;
  return (
    <aside className="decision-brief">
      <div className="brief-heading">
        <div className="section-eyebrow">
          <Lightbulb size={14} /> PROCUREMENT LENS
        </div>
        <h2>What the data tells you.</h2>
      </div>
      <div className="brief-insights">
        {data.insights.slice(0, 2).map((insight, i) => (
          <div className={`brief-item ${insight.tone}`} key={insight.title}>
            <span className="brief-index">0{i + 1}</span>
            <div>
              <h3>{insight.title}</h3>
              <p>{insight.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="vintage-box">
        <div>
          <Clock3 size={13} />
          <strong>Latest selected interval</strong>
        </div>
        <dl>
          <div>
            <dt>Delivery</dt>
            <dd>{datetime(latest?.delivery_time)}</dd>
          </div>
          <div>
            <dt>Published</dt>
            <dd>{datetime(latest?.publish_time)}</dd>
          </div>
          <div>
            <dt>Decision cutoff</dt>
            <dd>{datetime(latest?.decision_time)}</dd>
          </div>
          <div>
            <dt>Interval error</dt>
            <dd>{signed(latest?.error_mw)} MW</dd>
          </div>
        </dl>
        <small>All times GMT · historical, as available at cutoff</small>
      </div>
      <button className="text-button green-link" onClick={onMethodology}>
        How the forecast is selected <ArrowUpRight size={14} />
      </button>
    </aside>
  );
}
