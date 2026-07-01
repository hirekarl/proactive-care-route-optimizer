# Proactive Care-Route Optimizer

An early-warning system that shifts NYC senior-care delivery from reactive to proactive — flagging elevator outages and heat-driven failure risk *before* routes go out, so seniors don't miss meals and care workers don't arrive stranded.

Full product specification: [`Senior-Care PRD - Proactive Care-Route Optimizer.docx`](./Senior-Care%20PRD%20-%20Proactive%20Care-Route%20Optimizer.docx)

---

## The Problem

NYC has 1.8 million older adults served by 468 nonprofits contracted by the Department for the Aging (DFTA). Every service relationship — home-delivered meals, home care visits, case management — is mediated by a building elevator. When elevators fail, homebound seniors miss meals and appointments. The system today is entirely reactive: providers learn about outages only after a visit is missed, and city complaint data lags 1–3 business days.

**This tool changes that.** By combining the active DOB elevator-complaint feed, 264,000+ historical complaint records, DFTA provider locations, and 5–7 day heat forecasts, it ranks at-risk buildings before routes go out. Providers can reroute. Seniors don't miss care.

Key evidence from the EDA phase:
- **2,849 chronic offender buildings** identified citywide (1+ complaint in last 12 months, 3+ in last 3 years)
- **79%** of DFTA providers are within 0.25 miles of a chronic offender building
- Heat weeks (≥90°F) produce **1.20× baseline complaint volume** (Pearson r = 0.343, p < 0.001)
- The Bronx has **2.4×** the citywide rate of chronic offenders per 10,000 seniors
- **135 confirmed single-elevator high-risk buildings** where any outage means total inaccessibility

> **Note:** This project uses public data analysis — not AI — to generate predictions.

---

## Where to Start

New to the repo? Read this section first.

1. **Read the PRD.** The `.docx` at the repo root has the full problem context, user journeys, and requirements. The README summarizes it, but the PRD is the source of truth for what we're building and why.

2. **Know the team.** Karl owns the backend and data pipeline. **Mitra owns the frontend** — if you're touching `frontend/`, coordinate with her before making architectural changes. The frontend framework (currently React 19 + Vite) is hers to evolve.

3. **Get your environment running.** Follow [Getting Started](#getting-started) below. The session-start checks in `CLAUDE.md` cover the same ground for AI-assisted work.

4. **Start from a branch.** Never commit to `main` directly. Branch as `<initials>/<description>`, open a PR, and get a review before merging.

---

## Architecture

```mermaid
flowchart TD
    Dispatcher(["Dispatcher"])

    subgraph FE ["Frontend · React 19 + Vite · Mitra"]
        Dashboard["Dispatcher Dashboard"]
        MapView["Interactive Map"]
    end

    subgraph BE ["Backend · Django REST Framework · Karl"]
        API["REST API\n/api/outages  /api/routes  /api/routes/stops\n/api/alerts/at-risk  /api/buildings\n/api/dashboard/summary  /api/providers"]
        Pipeline["Ingest pipeline\ningest_outages · ingest_weather · ingest_forecast\ningest_dfta · ingest_elevator_devices\ncompute_risk_scores · purge_old_routes"]
    end

    DB[("PostgreSQL + PostGIS\nelevator_complaints · building_risk_scores\nweather_days · weather_forecasts\ndfta_* · routes · route_stops")]

    NOD["NYC Open Data\nkqwi-7ncn · e5aq-a4j2 · juyv-2jek · ygfr-ij6t · cqc8-am9x"]
    OM["Open-Meteo\nHistorical Archive + Forecast API"]
    GS["NYC Planning\nGeoSearch API"]

    Dispatcher --> FE
    FE -->|/api/*| API
    API <-->|PostGIS ST_DWithin| DB
    Pipeline -->|upsert| DB
    Pipeline -->|poll| NOD
    Pipeline -->|fetch| OM
    API -.->|geocode route stops| GS
    Pipeline -.->|geocode BIN fallback| GS
```

### Data flow

1. **Ingestion** — Six management commands populate the database (run in order):
   - `ingest_outages` — polls the NYC Open Data elevator-complaint API and upserts `elevator_complaints`
   - `ingest_weather` — fetches daily temperature maxima from Open-Meteo archive (2018–today) into `weather_days`
   - `ingest_forecast` — fetches the 7-day temperature forecast from Open-Meteo into `weather_forecasts`; run daily
   - `ingest_dfta` — fetches DFTA senior center (and optional provider) locations from NYC Open Data
   - `ingest_elevator_devices` — two-step join through `e5aq-a4j2` and `juyv-2jek` to populate `building_risk_scores.is_single_elevator`; must run after `compute_risk_scores`
   - `purge_old_routes` — deletes `Route` rows (and their `RouteStop` children) older than 90 days; run on a schedule to limit care-recipient address retention

2. **Risk scoring** — `compute_risk_scores` runs after the ingest commands and scores every building that appears in the complaint history:
   - Identifies **chronic offenders** (≥1 complaint in 12mo AND ≥3 complaints in 3yr)
   - Computes a 0–3 **composite vulnerability score**: +1 if a DFTA provider is within 0.5 mi, +1 if a senior center is within 0.5 mi, +1 if the building's community board is in the top tercile by summer complaint ratio
   - Computes **heat correlation metrics** per building: `heat_ratio` (heat-week vs. non-heat-week complaint rate), Pearson r/p, and a confidence level
   - Results are stored in `building_risk_scores` and exposed via `/api/buildings/`

3. **Route alerting** — When a dispatcher loads a route (`GET /api/routes/<id>/`), the backend runs a single batched PostGIS query comparing all stop coordinates against active outage coordinates within the 0.5-mile risk radius. Each matching complaint is classified by severity (`critical` / `warning` / `watch`) and enriched with dispatcher guidance.

4. **Proactive alerting** — `GET /api/alerts/at-risk/` screens all route stops for the current date against the live outage feed in one batched PostGIS query and returns only stops with active proximity alerts. `GET /api/routes/stops/` returns all stops for a given date's routes (defaults to today) — the source list for map display and at-risk screening. Both endpoints require an API key.

5. **Delivery** — `/api/dashboard/summary/` aggregates the at-risk stop count, active outage count, chronic offender count, heat forecast, and borough breakdown into a single response for the Dispatcher Dashboard. `/api/buildings/` provides the full ranked building risk inventory.

6. **Rendering** — The React frontend receives the payload, displays a prominent warning banner on the Dispatcher Dashboard, and re-renders affected stops on the map.

Deployed on [Render](https://render.com) via Blueprint (`render.yaml`). The frontend proxies all `/api` requests to the Django backend.

---

## Prerequisites

| Tool | Version |
|---|---|
| [uv](https://docs.astral.sh/uv/) | ≥ 0.6 |
| Python | 3.12 (managed by uv) |
| Node.js | ≥ 20 |
| npm | ≥ 10 (bundled with Node.js) |
| PostgreSQL | ≥ 15 |
| [pre-commit](https://pre-commit.com) | ≥ 3 |

### Installing uv

`uv` manages both Python versions and packages for this project. If you don't have it:

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verify
uv --version
```

You do **not** need to install Python separately — `uv sync` downloads and pins Python 3.12 automatically.

### Installing Node.js and npm

Node.js 20+ is required for the frontend. npm ships with it.

```bash
# macOS — via Homebrew
brew install node

# macOS / Linux — via nvm (recommended if you manage multiple projects)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
nvm use 20

# Windows — download the installer from nodejs.org
# https://nodejs.org/en/download

# Verify
node --version   # should print v20.x.x or higher
npm --version    # should print 10.x.x or higher
```

### Installing pre-commit

```bash
pip install pre-commit

# Or via Homebrew on macOS
brew install pre-commit

# Verify
pre-commit --version
```

---

## Local database setup

This project requires PostgreSQL with the PostGIS extension. Two options:

### Option A — Neon (free cloud Postgres, recommended for quick setup)

1. Create a free project at [neon.tech](https://neon.tech).
2. In the Neon dashboard go to **Database → Extensions** and enable `postgis` (or run `CREATE EXTENSION postgis;` in the SQL editor).
3. Copy the connection string from **Dashboard → Connection Details**. It looks like:
   ```
   postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Paste it as `DATABASE_URL` in `backend/.env`.

> **Note:** Use the **direct connection** string, not the pooled one. Neon's direct connection supports `CREATE EXTENSION` needed by the migrations. The `?sslmode=require` suffix is handled automatically.

### Option B — Docker (matches CI exactly, works offline)

```bash
docker run --name pcro-db \
  -e POSTGRES_USER=pcro \
  -e POSTGRES_PASSWORD=pcro \
  -e POSTGRES_DB=pcro \
  -p 5432:5432 \
  -d postgis/postgis:16-3.4
```

Then set `DATABASE_URL=postgresql://pcro:pcro@localhost:5432/pcro` in `backend/.env`.

---

## Getting Started

```bash
# Clone and enter the project
git clone https://github.com/hirekarl/proactive-care-route-optimizer.git
cd proactive-care-route-optimizer

# Install git hooks via pre-commit
pre-commit install
pre-commit install --hook-type commit-msg

# ── Backend ──────────────────────────────────────────────
cd backend
cp .env.example .env        # fill in DJANGO_SECRET_KEY and DATABASE_URL (see above)
uv sync                     # installs Python + all dependencies
uv run python manage.py migrate
uv run python manage.py runserver   # http://localhost:8000

# ── Frontend (separate terminal) ─────────────────────────
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api → :8000)
```

---

## Hook Installation

All quality gates run through the [pre-commit](https://pre-commit.com) framework: ruff (Python lint/format), Prettier (TypeScript/CSS/JSON format), and the no-AI-attribution commit-msg check.

```bash
# From repo root — run both lines:
pre-commit install                        # pre-commit stage (ruff, prettier)
pre-commit install --hook-type commit-msg # commit-msg stage (no-AI-attribution)
```

Hooks re-run automatically on every `git commit`. To run manually on all files:

```bash
pre-commit run --all-files
```

### What gets blocked

Any commit message containing a `Co-Authored-By:` line that references `claude` or `anthropic` (case-insensitive) is rejected at the hook level. Collaborators are expected to author their own commits. Remove the co-author line and recommit.

> `.githooks/commit-msg` also exists in the repo as a standalone fallback for anyone who prefers not to use the pre-commit framework, but the framework is the standard for this project.

---

## Git Workflow

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) and [Semantic Versioning](https://semver.org/).

### Branch naming

```
<initials>/<short-description>
```

Examples: `kj/alert-endpoint`, `mk/provider-import`, `mh/risk-scoring`

### Commit format

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Scopes: `backend`, `frontend`, `infra`, `deps`

### Pull requests

- **Never commit directly to `main`.** Create a feature branch, push, and open a pull request.
- At least one team member should review before merging.
- PRs should be focused — one logical change per PR.

### Version bumps and CHANGELOG

Use [Commitizen](https://commitizen-tools.github.io/commitizen/) to bump versions and update `CHANGELOG.md` automatically:

```bash
pip install commitizen        # if not already installed
cz bump                       # analyzes commits, bumps version, tags, updates CHANGELOG
git push --follow-tags
```

Commitizen is configured in `pyproject.toml` (root level). It updates `backend/pyproject.toml` and `frontend/package.json` in sync.

---

## Code Style

### Backend (Python)

| Tool | Role | Config |
|---|---|---|
| [ruff](https://docs.astral.sh/ruff/) | Lint + format | `backend/pyproject.toml` |
| [mypy](https://mypy.readthedocs.io/) | Static type checking (strict) | `backend/pyproject.toml` |
| [pytest](https://pytest.org/) | Tests | `backend/pyproject.toml` |

```bash
cd backend
uv run ruff check .              # lint
uv run ruff format .             # format
uv run mypy src/                 # type-check
uv run pytest                    # tests
```

- Line length: 100
- Target: Python 3.12
- mypy: strict mode with `django-stubs` and `djangorestframework-stubs`
- Google-style docstrings
- Tests use a real Postgres database — no mocking the DB layer

### Frontend (TypeScript)

**Mitra owns the frontend.** The current toolchain:

| Tool | Role | Config |
|---|---|---|
| [Prettier](https://prettier.io/) | Format | `frontend/.prettierrc` |
| [ESLint](https://eslint.org/) | Lint (with `jsx-a11y`) | `frontend/eslint.config.js` |
| [TypeScript](https://www.typescriptlang.org/) | Type checking (strict) | `frontend/tsconfig.app.json` |

```bash
cd frontend
npm run format          # format src/ in-place
npm run format:check    # format check (CI mode)
npm run lint            # ESLint
npx tsc --noEmit        # type-check
```

- Print width: 100
- Imports sorted automatically (react → packages → internal)
- Accessibility rules enforced by `eslint-plugin-jsx-a11y`

The framework, library choices, and toolchain are Mitra's to evolve — these commands may change if she changes the stack.

---

## Data Sources

| Source | Dataset | ID | Purpose |
|---|---|---|---|
| NYC Open Data | DOB Elevator Complaints | `kqwi-7ncn` | Active complaint feed — the "possible outage" signal |
| NYC Open Data | DOB NOW Safety Compliance | `e5aq-a4j2` | Maps BIN → lat/lon for complaint locations |
| NYC Open Data | DFTA Senior Centers | `ygfr-ij6t` | Senior center locations for vulnerability proximity scoring |
| NYC Open Data | DFTA Providers | `cqc8-am9x` | Provider locations; default for `ingest_dfta` (pass `--provider-dataset` to override) |
| NYC Open Data | DOB Elevator Device Details | `juyv-2jek` | Maps device number → `only_elevator_in_building`; step 2 of `ingest_elevator_devices` join |
| NYC Planning | GeoSearch API | — | Fallback geocoding when a BIN has no device record |
| Open-Meteo | Historical Archive | — | Daily temperature maxima for heat correlation; 2018–present |
| Open-Meteo | Forecast API | — | 7-day temperature forecast; populates `weather_forecasts` for heat-advisory detection |

**Important:** `kqwi-7ncn` is not a real-time outage feed — it reflects complaints filed by residents/managers, typically hours to days after an actual stoppage. Alert copy should say "reported outage" or "active complaint," not "confirmed outage." See [`docs/nyc-open-data.md`](./docs/nyc-open-data.md) for the full integration guide, including the critical date-format gotcha, the ingest polling pattern, and the PostGIS schema.

**Note on `ygfr-ij6t`:** The DFTA senior centers dataset has a typo in the `community_board` column name — it appears as `comminuty_board` (missing the second "n"). The ingest command handles this automatically.

---

## CI/CD

GitHub Actions workflows run on every push and pull request:

| Workflow | Trigger | Checks |
|---|---|---|
| `backend-ci.yml` | Changes to `backend/**` | ruff lint, ruff format, mypy, pytest (with Postgres service container) |
| `frontend-ci.yml` | Changes to `frontend/**` | Prettier check, TypeScript (`tsc --noEmit`) |

Workflows are defined in `.github/workflows/`.

---

## Deployment

### Render Blueprint

`render.yaml` at the repo root defines the full stack:

- **pcro-backend** — Python web service running Django + gunicorn
- **pcro-frontend** — Static site built from Vite output
- **pcro-db** — PostgreSQL (starter plan)

To deploy:

1. Connect this repository to [Render](https://render.com) and select **Blueprint** deployment.
2. Render reads `render.yaml` and provisions all services automatically.

### Scheduled jobs

`render.yaml` also provisions two cron services:

| Service | Schedule | Command |
|---|---|---|
| `pcro-ingest-daily` | 06:00 UTC daily | Full ingest + score pipeline: `ingest_outages` → `ingest_weather` → `ingest_forecast` → `ingest_dfta` → `compute_risk_scores` → `ingest_elevator_devices` |
| `pcro-purge-weekly` | 08:00 UTC Sunday | `purge_old_routes` (deletes stops older than 90 days) |

### Required environment variables

The backend requires these env vars (Render generates/injects most of them via the Blueprint):

| Variable | Source |
|---|---|
| `DJANGO_SECRET_KEY` | Auto-generated by Render |
| `DATABASE_URL` | Injected from `pcro-db` |
| `DJANGO_DEBUG` | Set to `False` in `render.yaml` |
| `ALLOWED_HOSTS` | Set to `.onrender.com` in `render.yaml` |
| `ROUTE_API_KEY` | Set manually in Render dashboard; required by `/api/alerts/at-risk/` and `/api/routes/stops/` |
| `SOCRATA_APP_TOKEN` | Optional; raises NYC Open Data rate limits |

The frontend static site also requires `VITE_API_KEY`, set manually in the Render dashboard to the same value as the backend's `ROUTE_API_KEY`. It's baked in at build time and sent as `Authorization: Api-Key <value>` on every API request.

---

## Project Structure

```text
proactive-care-route-optimizer/
├── README.md
├── CLAUDE.md                  Claude Code session config and project guide
├── AGENTS.md
├── CHANGELOG.md
├── docs/
│   ├── nyc-open-data.md           NYC Open Data integration guide (datasets, ingest, PostGIS)
│   └── deferred-frontend-api-gaps.md  Known gaps between frontend types and backend data
├── .gitattributes             LF line endings enforced
├── .pre-commit-config.yaml    ruff + prettier + no-AI-attribution
├── pyproject.toml             commitizen config (root-level versioning)
├── render.yaml                Render Blueprint
├── Senior-Care PRD - ....docx Product requirements document
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       └── frontend-ci.yml
├── .githooks/
│   └── commit-msg             Standalone no-AI-attribution hook
├── backend/
│   ├── pyproject.toml         uv project: Django, DRF, ruff, mypy, pytest
│   ├── .python-version        3.12
│   ├── .env.example
│   ├── manage.py
│   └── src/
│       ├── core/              Django project (settings, urls, wsgi, asgi)
│       └── api/               DRF app: 10 endpoints, 7 management commands
│   └── tests/
└── frontend/                  Mitra's domain — framework subject to change
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── eslint.config.js
    ├── .prettierrc
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/               API client, mock data, seed routes
        ├── components/
        │   ├── dashboard/     AtRiskStopsTable, BoroughRiskChart, ElevatorAdvocatePanel,
        │   │                  HeatAdvisoryBanner, OutagesTrendChart
        │   ├── landing/       LandingScene (Three.js), Elevator3D, overlays, scroll state
        │   ├── layout/        AppShell, Header, Sidebar
        │   ├── map/           OutageMap (neon SVG poster)
        │   └── ui/            Badge, Card, StatCard, StateBlock
        ├── hooks/             useApi
        ├── lib/               format (date / number helpers)
        ├── pages/             DashboardPage, LandingPage, MapPage, OutagesPage, ProvidersPage
        └── types/             shared TypeScript types
```

---

## Team

| Person | GitHub | Role |
|---|---|---|
| Karl Johnson | @hirekarl | Backend, NYC Open Data pipeline, elevator risk model |
| Mitra Kermanian | @MITRAKER | **Frontend owner** — DFTA data, provider data, UI/UX |
| Mofazzal Hossain | @mofazzal0413 | Pursuit AI-Native Fellow |
