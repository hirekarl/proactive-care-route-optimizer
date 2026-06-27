# CLAUDE.md — Proactive Care-Route Optimizer

This file is loaded automatically by Claude Code at the start of every session. Read it fully before taking any action.

---

## Non-Negotiable Rule: No AI Co-Author Attribution

**Do not add `Co-Authored-By:` lines referencing `claude`, `anthropic`, or any AI tool to commit messages.** This is enforced by a `commit-msg` hook that will reject the commit — but the rule exists before the hook: never generate, suggest, or include such lines in the first place. Collaborators author their own commits. If you are using Claude Code or any AI assistant to help with this project, strip all co-author attribution before committing.

---

## Session Start Ceremony

Run these checks at the start of every session, before doing anything else. Report any failures and stop until they are resolved.

### 1. Tool availability

```bash
uv --version          # ≥ 0.6 required
npm --version         # ≥ 10 required (Node ≥ 20)
pre-commit --version  # ≥ 3 required
```

If any are missing, surface the install instructions from the README and stop.

### 2. Git hooks

```bash
git config core.hooksPath   # must print: .githooks
ls .git/hooks/commit-msg    # must exist
```

If either check fails, install:

```bash
git config core.hooksPath .githooks
pre-commit install --hook-type commit-msg
```

### 3. Backend dependencies

```bash
cd backend && uv sync
```

### 4. Frontend dependencies

```bash
cd frontend && npm install
```

Report anything that fails and wait for the collaborator to fix it before proceeding.

---

## Project Context

**What this is:** An early-warning web app for NYC senior-care dispatchers. It cross-references delivery stops against live elevator outage data (NYC Open Data) and a heat-driven risk model, flagging inaccessible buildings *before* routes go out — shifting senior-care delivery from reactive to proactive for the first time.

**Why it matters:** 1.8M older New Yorkers depend on DFTA-contracted providers for meals, home care, and wellness checks. When elevators break, homebound seniors on upper floors go without food and care. The current system is entirely reactive — dispatchers only find out when a worker is already stranded in the lobby. This tool changes that.

**Core feature:** A proximity alert engine that screens each address against the live elevator-outage feed. Any stop near an active outage gets a warning banner and a suggested alternative before the worker ever leaves the depot.

**Evidence base:** 79% of DFTA providers are within 0.25 miles of a chronic-offender building. Heat weeks (≥90°F) produce 1.20× baseline complaint volume. The Bronx has 2.4× the citywide rate of chronic offenders per 10,000 seniors. 135 confirmed single-elevator high-risk buildings where any outage means total inaccessibility.

Full product spec: `Senior-Care PRD - Proactive Care-Route Optimizer.docx`

---

## Team & Ownership

| Person | GitHub | Domain |
|---|---|---|
| Karl Johnson | @hirekarl | Backend, NYC Open Data pipeline, elevator risk model |
| Mitra Kermanian | @MITRAKER | **Frontend owner** — DFTA data, provider data, UI/UX |
| Mofazzal Hossain | @mofazzal0413 | Pursuit AI-Native Fellow |

**Frontend ownership:** Mitra owns the frontend entirely. The current scaffold is React 19 + Vite + TypeScript + Tailwind, but Mitra may change the framework, library choices, or toolchain at her discretion. If you are not Mitra and are working on the frontend, coordinate with her before making architectural changes. When the framework changes, update this file and README.md to match.

---

## Architecture

Three layers:

- **Frontend** (Mitra) — React SPA with two main views: Dispatcher Dashboard and an Interactive Map (Mapbox or Leaflet). Framework subject to change.
- **Backend** (Karl) — Django REST Framework. Exposes `/api/routes`, `/api/outages`, and related endpoints. Contains the proximity alert logic and periodically polls the NYC Open Data elevator-complaint API.
- **Database** — PostgreSQL with the PostGIS extension. Stores provider locations, care recipient addresses, active routes, and ingested outage records. PostGIS powers the ≤0.5-mile geospatial proximity queries that are the core of the alert engine.

```
frontend/         ← Mitra owns this; framework subject to change
backend/          ← Django REST Framework (Karl)
  src/
    core/         ← Django project: settings, urls, wsgi, asgi
    api/          ← DRF app: routes, outages, proximity logic
  tests/
```

Deployed on Render via `render.yaml` Blueprint. Frontend proxies `/api` to the Django backend.

**NYC Open Data integration details:** `docs/nyc-open-data.md` — covers both datasets, the date format gotcha, the ingest flow, and the PostGIS schema and proximity query. Read it before touching any ingest or alert logic.

---

## Git Workflow

**Never commit to `main` directly.** Always branch, push, and open a pull request.

### Branch naming

```
<initials>/<short-description>
```

Examples: `kj/alert-endpoint`, `mk/provider-import`, `mh/risk-scoring`

### Commit format (Conventional Commits)

```
<type>(<scope>): <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`
Scopes: `backend`, `frontend`, `infra`, `deps`

### AI co-author attribution is blocked

The `commit-msg` hook rejects any `Co-Authored-By:` line referencing `claude` or `anthropic`. Remove it and recommit. This is intentional — collaborators author their own commits.

---

## Backend

- **Runtime:** Python 3.12 managed by `uv`
- **Framework:** Django 5.x + Django REST Framework
- **Lint / format:** `ruff` (line length 100)
- **Types:** `mypy` strict with `django-stubs` + `djangorestframework-stubs`
- **Tests:** `pytest` + `pytest-django`; tests require a running Postgres — do not mock the database

```bash
cd backend
uv run ruff check .        # lint
uv run ruff format .       # format
uv run mypy src/           # type-check
uv run pytest              # tests
```

Docstrings: Google style, one line max. No multi-paragraph blocks.

---

## Frontend

**Mitra owns the frontend.** Current scaffold:

- React 19 + Vite 6 + TypeScript (strict)
- Tailwind CSS 3
- Prettier (print width 100) + ESLint with `jsx-a11y`
- Import sort: `@trivago/prettier-plugin-sort-imports`

```bash
cd frontend
npm run dev             # dev server → http://localhost:5173
npm run format          # format in-place
npm run format:check    # CI mode
npm run lint            # ESLint
npx tsc --noEmit        # type-check
```

If Mitra changes the framework, update these commands to match.

---

## Code Style (all contributors)

- No comments that explain *what* the code does — names do that.
- Comments only when the *why* is non-obvious: a hidden constraint, a workaround, a subtle invariant.
- No multi-line comment blocks or multi-paragraph docstrings.
- No features, abstractions, or error handling beyond what the current task requires.
- No backwards-compatibility shims for code that's been removed.
