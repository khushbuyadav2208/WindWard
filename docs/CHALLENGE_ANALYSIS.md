# Challenge interpretation

The supplied Word document requests a first pilot for the UK day-ahead procurement team, using only national Elexon wind actuals and forecasts, React, Python, Docker, a Vercel/Heroku deployment, a public anonymously named GitHub repository, explicit AI disclosure and an unlisted YouTube demonstration of at most ten minutes. Each audience gets at most five minutes. The original explicitly requires the video before submission.

## Most important correctness risks

1. **Hindsight leakage:** filtering delivery dates is insufficient. `startTime` is a target, while `publishTime` determines whether a forecast could have informed the purchase. Windward selects `max(publishTime)` subject to `publishTime ≤ D−1 cutoff` independently for each target.
2. **January interpretation:** the original scopes purchase decisions in January. This maps to delivery 2 Jan–1 Feb. The expanded brief also scopes January deliveries, mapping to decisions 31 Dec–30 Jan. A visible basis selector supports both; decision dates are the default.
3. **Unspecified cutoff:** 10:00 Europe/London on D−1 is an explicit configurable pilot assumption. It is not presented as a market rule.
4. **Actual source resolution:** the downloaded WINDFOR contains hourly targets. Native FUELHH actuals are half-hourly. The pilot holds each hourly forecast across its two half-hours, indicates each hold and does not interpolate. Holding applies only to source publications with no :30 targets. The assumption changes the resulting error analysis and is disclosed.
5. **Coverage and bad input:** expected slots are generated independently of source rows. Missing values remain visible; metrics count matched pairs. Invalid generation and timestamps are rejected and counted, duplicate vintages deduplicated, conflicts quarantined.

## Customer experience

The first screen combines a decision-time banner, four useful KPIs, generation comparison, signed errors and a procurement interpretation. Forecast analysis adds traceable records. Accuracy analysis explains six metrics and answers when errors are largest. Methodology exposes assumptions and provenance. Global filters apply to all data-dependent views and exports.

The system supports uncertainty awareness; it does not estimate utility purchases or financial exposure without demand, existing supply or price data. Adding those datasets would exceed the requested Elexon-only scope.

## Bounded pilot architecture

React/TypeScript/Vite + Recharts, FastAPI, pure Python analytics, httpx Elexon adapter, persisted JSON cache and genuine historical snapshot. No database, event bus, worker queue, multi-tenant identity, Redux or decorative data integrations. The implementation is designed to be understandable inside the challenge's maximum 16 hours.

## Deliverable boundaries

Local code, real dataset, tests, build, source audit, reproducible setup, deployment configuration and demo materials can be verified in this workspace. Public repository creation, hosting publication, YouTube upload and final incognito URL verification require authenticated accounts. Docker runtime verification requires a Docker engine. The audit keeps these incomplete steps separate from implemented functionality.
