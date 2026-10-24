# Windward

**Day-ahead wind forecast intelligence for a UK energy procurement team.**

Windward reconstructs the wind forecast a buyer could have seen at a historical decision cutoff, compares it with delivered generation, and quantifies the uncertainty. It uses national Elexon **FUELHH / WIND** actuals and **WINDFOR** forecast vintages exclusively. The React/TypeScript dashboard is backed by a Python/FastAPI data and analytics layer.

**Submission status:** the application runs locally with real Elexon data. Public GitHub/Vercel URLs and the unlisted YouTube URL must be populated after authenticated publication; no live URLs are claimed here. See [the final audit](docs/REQUIREMENT_AUDIT.md) for verification evidence and outstanding external steps.

## Start in one command with Docker

Prerequisites: Docker Engine / Desktop with Compose v2. From the repository root:

```sh
docker compose up --build
```

Open **http://localhost:8080**. Backend health: http://localhost:8000/api/health. The bundled **real Elexon snapshot** makes first launch independent of upstream availability. No Elexon API key is needed.

For manual upstream refresh through Docker, copy `.env.example` to `.env`, set a random `REFRESH_TOKEN`, restart with `docker compose up -d`, click **Refresh data**, and enter that token. The token is never embedded in the frontend. With no token, public/proxied refresh requests are intentionally disabled; analysis and CSV export work normally.

```sh
docker compose down
```

The named cache volume survives normal shutdown. The Docker configuration is included, but a container run could not be verified in the implementation environment because Docker is not installed. CI includes a container smoke test.

## Local setup without Docker

Prerequisites: **Python 3.12** and **Node.js 22.12+** (Node 24 is also supported), npm. Commands run from the repository root.

Windows PowerShell, production build and a single server:

```powershell
./scripts/start.ps1 -Install
```

Open **http://127.0.0.1:8000**. Subsequent starts: `./scripts/start.ps1`.

Manual Windows setup / development:

```powershell
py -3.12 -m venv .venv
./.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
npm --prefix frontend ci
$env:PYTHONPATH = 'backend'
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

In a second terminal, `npm --prefix frontend run dev`. Open http://127.0.0.1:5173. Vite proxies `/api` to the Python service; React never calls Elexon.

macOS / Linux:

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
npm --prefix frontend ci
PYTHONPATH=backend uvicorn app.main:app --reload --port 8000
# A second terminal:
npm --prefix frontend run dev
```

Single-origin production run on macOS / Linux:

```sh
npm --prefix frontend run build
.venv/bin/python -m uvicorn index:app --host 127.0.0.1 --port 8000
```

## Capabilities

- Executive overview: latest selected forecast, MAE, RMSE, signed bias, coverage and procurement context.
- Actual vs. day-ahead forecast, precise hover information, signed errors with a zero reference, and 1-day / 7-day / month range selection.
- Accuracy analysis: MAE, RMSE, MAPE, WAPE, bias, maximum error, daily performance, half-hour-of-day pattern and signed error distribution.
- Shared date basis, date range, delivery hour range and configurable cutoff; all KPIs, charts and CSV use the same backend filter contract.
- Sortable, searchable, paginated interval table with publication time, generation, errors and explicit alignment labels.
- Provenance, source validation counts, coverage, cached/stale status, skeleton loading, useful failures and missing-value states.
- Desktop and mobile layouts, keyboard controls, native focus-trapping refresh dialog, metric explanations and a downloadable tabular chart alternative.
- Reproducible data snapshot, bounded concurrent upstream requests, retries, single-flight refresh, atomic cache writes and preservation of the last good dataset.

## January scope: an important distinction

The original challenge says **purchase decisions made in January 2026**. The expanded brief also requests January delivery analysis. Windward supports both explicitly:

| Date basis | Filter dates | Corresponding deliveries / decisions |
| --- | --- | --- |
| **Decision dates (default)** | 1–31 January 2026 | Delivery 2 January–1 February 2026 |
| Delivery dates | 1–31 January 2026 | Decisions 31 December 2025–30 January 2026 |

There are **1,488 half-hours** in either full-month selection. Including 1 February delivery in decision-date mode is deliberate: it follows a 31 January purchase decision. Fetching December publications is necessary to evaluate the first January delivery day correctly. Unrelated periods are never silently substituted.

## Forecast selection methodology

**Explicit pilot assumption: 10:00 Europe/London on the calendar day before delivery.** The challenge does not prescribe a specific gate-closure time. This configurable assumption is not asserted to be an exchange rule. Change it in **Decision settings**, the API `cutoff=HH:MM` parameter, or the default `DECISION_CUTOFF` environment variable.

For every delivery target T:

1. Compute cutoff C = D−1 at the configured local time, using `zoneinfo` rather than naive datetime arithmetic.
2. Consider source forecasts with `publishTime ≤ C` only; a publication exactly at C is eligible.
3. Select the **latest eligible publication** for that target. Never select today's latest forecast for a past delivery.
4. Within the same vintage, prefer an exact target. The retrieved January WINDFOR targets are hourly. For a :30 target, the :00 value from an hourly vintage may be held constant for the second half-hour. A vintage containing :30 targets is not treated as hourly. No interpolation, cross-hour carry or future publication is allowed.
5. Join actuals by exact normalized delivery timestamp. Keep missing actual/forecast values as null and exclude incomplete pairs from error metrics.

**Hourly hold is an alignment assumption**, visibly labelled in the table, chart caption, methodology and API. It is not represented as native half-hourly WINDFOR data. Actuals use the latest retrieved publication per target and may have historical revisions. `publishTime` is used as the availability proxy; network/transmission delay cannot be reconstructed from these fields.

## Accuracy metrics

For matched half-hour i: forecast Fᵢ, actual Aᵢ, signed error eᵢ = Fᵢ − Aᵢ. N = matched pair count. Each interval has equal weight.

| Metric | Formula | Meaning |
| --- | --- | --- |
| MAE, MW | Σ\|eᵢ\| / N | Typical magnitude of a miss |
| RMSE, MW | √(Σeᵢ² / N) | More weight on large errors |
| Bias / mean error, MW | Σeᵢ / N | Positive means wind over-prediction; negative means under-prediction |
| MAPE, % | 100 × mean(\|eᵢ\| / Aᵢ), Aᵢ > 0 | Mean percentage error; sensitive to low output |
| WAPE, % | 100 × Σ\|eᵢ\| / ΣAᵢ | Volume-weighted absolute percentage error |
| Maximum absolute error, MW | max(\|eᵢ\|) | Largest observed interval miss |
| P90 absolute error, MW | Nearest-rank 90th percentile | Historical magnitude at or below which 90% of observed misses fall |
| Coverage, % | 100 × matched / expected | Completeness of the comparison |

MAPE excludes zero-actual pairs and reports their count. WAPE includes their errors in the numerator and is null if total actual is zero. Empty paired sets return null metrics, never NaN/Infinity or misleading zero. The P90 is descriptive history, **not a future confidence bound**. Amber table badges mark absolute percentage error ≥20%, an illustrative pilot visual threshold, not a calibrated risk limit.

The bundled snapshot at the 10:00 cutoff yields 100% paired coverage for January decision dates, MAE ≈2,016 MW, RMSE ≈2,510 MW, bias ≈+1,730 MW. These figures are calculated on demand, not hardcoded API responses. They depend on the cutoff, scope and hourly-hold assumption. The product does not claim a utility-specific purchase recommendation without demand, contracted supply or price data.

## Data sources and reproducibility

- [Elexon FUELHH stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream): retain `fuelType=WIND`, `startTime`, `publishTime`, `generation`.
- [Elexon WINDFOR stream](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream): `startTime`, `publishTime`, `generation`.
- API base: `https://data.elexon.co.uk/bmrs/api/v1`.
- Requests use **publication** windows (`publishDateTimeFrom`, `publishDateTimeTo`), not delivery windows. The adapter requests 24 Dec 2025–3 Feb 2026, in three-day chunks with four concurrent requests and up to three attempts each.
- Delivery records retained for analytics: 1 Jan through 1 Feb inclusive. Earlier publications and subsequent actual publications allow correct boundary handling.
- `backend/data/january-2026.json` contains actual downloaded source records; `.manifest.json` records retrieval time, validation counts and SHA-256. No synthetic business dataset is used.
- Identical delivery/publication duplicates are removed. Conflicting values in the same vintage are quarantined; older valid vintages remain eligible. Naive/off-grid timestamps, null/negative/non-finite generation and booleans are rejected and counted.

Refresh the reproducible snapshot explicitly (from repository root):

```powershell
./.venv/Scripts/python.exe scripts/fetch_data.py
```

Use `.venv/bin/python` on Unix. This updates the committed snapshot and manifest after validation. Normal UI refresh updates a separate ignored runtime cache. Raw boundary duplicates remain in the source snapshot so its validation is reproducible. The snapshot describes Elexon's operationally metered national wind series, not every embedded wind installation.

## Architecture and folder structure

```text
React + TypeScript (display, filters, charts)
    → FastAPI REST contract (validation, safe HTTP responses)
        → Analytics (cutoff selection, joins, metrics, breakdowns)
        → Repository (cache, validation, provenance, refresh)
            → Elexon stream adapter (FUELHH/WIND + WINDFOR only)
```

```text
backend/
  app/main.py                  FastAPI app, CORS, safe errors, response headers
  app/api/routes.py            Filters and REST endpoints
  app/config/settings.py       Validated environment configuration
  app/models/schemas.py        Source and response schemas
  app/services/analytics.py    Pure selection, alignment, error and metric functions
  app/services/elexon.py       Upstream HTTP adapter, bounded concurrency and retries
  app/services/repository.py   Persisted cache, snapshot fallback, atomic refresh
  data/                       Real snapshot and provenance manifest
  tests/                      Business logic, data quality, API and cache tests
  Dockerfile                  Non-root Python service
  requirements.txt            Pinned direct application dependencies
frontend/
  src/components/             Shell, filters, KPIs, charts, table, states, dialog
  src/pages/                  Overview, forecast, accuracy and methodology views
  src/hooks/                  Abortable data fetching
  src/services/               Typed API client and CSV download
  src/types/                  Shared frontend response/filter types
  src/utils/                  Timezone-aware presentation formatting
  src/styles.css              Responsive visual system
  src/accessibility.css       Contrast and reading density refinements
  e2e/                        Browser interactions, mobile and accessibility tests
  public/favicon.svg          Product mark
  Dockerfile, nginx.conf      Static frontend and same-origin API proxy
scripts/
  fetch_data.py               Rebuild the real Elexon snapshot
  start.ps1                   Windows setup / single-origin production launch
  record-demo.mjs             Browser tour recording (see demo documentation)
  narrate-demo.ps1            Optional Windows speech narration
  demo_timing.py              Per-part narration and duration validation
  render_demo.py             MP4 assembly with audio and subtitles
  verify_demo.py              Actual media streams, durations and full-decode check
  package_source.py           Reviewable source-only ZIP packaging
  prepare_repository.py       Optional local Git initialization without system Git
  requirements-tools.txt      Optional audit, media and packaging tools
docs/
  CHALLENGE_ANALYSIS.md        Requirement interpretation and scope decisions
  ARCHITECTURE.md              Design, contracts, reliability and tradeoffs
  DEPLOYMENT.md                Vercel and anonymous GitHub publication instructions
  DEMO_SCRIPT.md               Customer and technical presentation script
  REQUIREMENT_AUDIT.md         Explicit final status and verification evidence
.github/workflows/ci.yml       Python, frontend and Docker checks
index.py                      Same-origin production entrypoint
requirements.txt              Root deployment dependency pointer
vercel.json, pyproject.toml    Vercel Python configuration
docker-compose.yml            Two-service local deployment and persistent cache
.env.example                  Documented configuration without secrets
```

The Python API lives in `backend/app/api`. There is no database, login system, Redux or unrelated external business data.

## API contract

Interactive OpenAPI documentation: `/docs` on the Python service. Every analytical endpoint accepts the same query parameters:

| Parameter | Default | Validation |
| --- | --- | --- |
| `start`, `end` | `2026-01-01`, `2026-01-31` | Inclusive dates in January 2026, start ≤ end |
| `basis` | `decision` | `decision` or `delivery` |
| `cutoff` | `DECISION_CUTOFF` | `HH:MM`, Europe/London on D−1 |
| `hour_from`, `hour_to` | `0`, `24` | Inclusive starting hour, exclusive ending hour, from < to |

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/health` | Liveness and analysis period |
| GET | `/api/config` | Safe public default configuration |
| GET | `/api/dashboard` | Metadata, metrics, comparison rows, breakdowns, insights |
| GET | `/api/actuals` | Normalized delivery actuals, including missing slots |
| GET | `/api/forecasts` | Cutoff-selected forecasts, publication, lead time and alignment |
| GET | `/api/forecast-comparison` | Aligned interval rows and metadata |
| GET | `/api/accuracy` | Metrics, daily, time-of-day and distribution |
| GET | `/api/summary` | Metadata, KPIs and backend-generated observations |
| GET | `/api/export` | CSV of the complete filtered interval selection |
| POST | `/api/refresh` | Refresh source data; `X-Refresh-Token` on protected deployments |

Example: `/api/dashboard?start=2026-01-05&end=2026-01-05&basis=delivery&cutoff=10:00&hour_from=6&hour_to=18`.

Validation errors return 422, denied refresh returns 403, upstream/no-data failures return 503, and unexpected failures return a safe 500 message. Logging retains server-side diagnostics; API consumers do not receive stack traces.

## Environment variables

Copy `.env.example` to `.env` if changing defaults. None is required for local analysis.

| Variable | Default / purpose |
| --- | --- |
| `DECISION_CUTOFF` | `10:00`; backend/UI default, validated HH:MM |
| `CORS_ORIGINS` | JSON array of the two local Vite origins; use explicit origins if deploying separately |
| `CACHE_PATH` | `backend/data/cache.json`; Docker uses mounted volume, Vercel uses `/tmp/windward-cache.json` |
| `CACHE_TTL_SECONDS` | `86400`; stale indicator threshold, not a background refresh schedule |
| `ELEXON_TIMEOUT_SECONDS` | `40`; each upstream request timeout |
| `REFRESH_TOKEN` | Empty; required to enable manual refresh on public/proxied hosts |
| `VITE_API_BASE_URL` | Empty for same-origin requests; optional absolute backend origin at frontend build time |

The default CORS origins are restricted, credentials are not allowed, and the production same-origin setup needs no cross-origin calls. Refresh tokens live only in server environment configuration and transient form state. Never commit `.env` or pass a secret through a URL.

## Testing and validation

```powershell
./.venv/Scripts/python.exe -m pytest -q
npm --prefix frontend test
npm --prefix frontend run build
```

Browser checks require both servers to be running (or a single production server with `TEST_BASE_URL` set). They use the installed Microsoft Edge browser by default:

```powershell
cd frontend
npx playwright test
```

For Linux CI without Edge, install Chromium using `npx playwright install --with-deps chromium`, then set `PLAYWRIGHT_CHANNEL=chromium`. To test a deployed or single-origin production app, set `TEST_BASE_URL` to its origin. Each browser test uses a fresh isolated browser context without stored login cookies. This is useful anonymous-access evidence, but public URL verification still requires actual deployment.

Optional security/review tools: `pip install -r scripts/requirements-tools.txt`, then `python -m pip_audit -r backend/requirements.txt` and `npm --prefix frontend audit`. Source snapshot integration tests do not require network. Elexon HTTP tests use mock transports; browser tests use the real local API.

## Deployment and submission

The checked-in Vercel configuration uses the Python/FastAPI entrypoint and builds the React assets. **Frontend and API share one origin.** No production frontend URL points to localhost. See [deployment instructions](docs/DEPLOYMENT.md), based on [Vercel's official FastAPI guide](https://vercel.com/docs/frameworks/backend/fastapi).

| Submission item | Current state |
| --- | --- |
| Public anonymous GitHub repository | Awaiting authenticated GitHub publication |
| Vercel application URL | Awaiting authenticated Vercel deployment |
| Unlisted YouTube video | Local demo and script provided; authenticated upload remains |

Do not submit the [original challenge form](https://forms.cloud.microsoft/r/Ljmf1aWESK) until all three links exist and pass a signed-out/incognito access check. Its exact URL was extracted from the Word document's embedded hyperlink. The original explicitly says evaluation starts with the video. The form could not be inspected through the research tool and no submission is claimed.

## AI usage disclosure

**OpenAI Codex** was used to analyse the challenge, design and implement the React and Python application, research the official Elexon and deployment documentation, write tests/documentation, and run local validation. The optional generated demo uses Windows speech synthesis for narration. AI generated no business observations or source data: all displayed analytics are deterministically calculated from real Elexon records. Human review of business assumptions and final submission remains appropriate.

## Assumptions and limitations

- The 10:00 D−1 cutoff and hourly hold are explicit pilot assumptions. No exact cutoff or hourly-to-half-hour mapping was prescribed in the challenge.
- The publication timestamp is the only available availability proxy; actual receipt delay and historical actual revisions are not reconstructed.
- A week of earlier publications is fetched to cover day-ahead boundaries; the application does not claim an infinite vintage archive. Missing eligible forecasts stay missing.
- Cache/refresh locking is per process. Docker persistence is durable across normal container restarts; Vercel `/tmp` and memory are instance-local and ephemeral. Cold instances use the bundled verified historical snapshot. This keeps a bounded pilot simple, with no shared database.
- A 24-hour age flag does not imply that January data are wrong; it reports source retrieval age. There is no automatic background refresh.
- There is no authentication or utility-specific contract/demand data. Only public national data are served; administrative refresh requires a token on public deployments.
- Historical error is not a calibrated future uncertainty band or financial-risk estimate. No purchasing volume, price or profit claim is made.
- Fonts are loaded from Google Fonts with local sans-serif fallbacks; business data come only from Elexon.
- Native Docker execution and live/public URL verification require tools/account access unavailable at implementation time. Their exact state is tracked in the audit.

The implementation prioritizes the challenge's 16-hour effort constraint: four purposeful views, pure tested analytics, one persisted dataset, one API contract, two simple Docker services and a single-origin production entrypoint.
