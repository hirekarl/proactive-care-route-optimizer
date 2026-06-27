# Proactive Care-Route Optimizer

An early-warning system that shifts NYC senior-care delivery from reactive to proactive — flagging elevator outages and heat-driven failure risk *before* routes go out, so seniors don't miss meals and care workers don't arrive stranded.

Full product specification: [`Senior-Care PRD - Proactive Care-Route Optimizer.docx`](./Senior-Care%20PRD%20-%20Proactive%20Care-Route%20Optimizer.docx)

---

## The Problem

NYC has 1.8 million older adults served by 468 nonprofits contracted by the Department for the Aging (DFTA). Every service relationship — home-delivered meals, home care visits, case management — is mediated by a building elevator. When elevators fail, homebound seniors miss meals and appointments. The system today is entirely reactive: providers learn about outages only after a visit is missed, and city complaint data lags 1–3 business days.

**This tool changes that.** By combining a real-time pipeline of 264,000+ elevator complaints with DFTA provider locations and 5–7 day heat forecasts, it ranks at-risk buildings before outages happen. Providers can reroute. Seniors don't miss care.

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

```
┌─────────────────────────────────┐      ┌────────────────────────────────┐
│  Frontend (Mitra's domain)      │ ───▶ │  Django REST Framework (API)   │
│  frontend/                      │      │  backend/                      │
│  Currently: React 19 + Vite     │      └──────────────┬─────────────────┘
└─────────────────────────────────┘                     │
                                               ┌────────▼──────────┐
                                               │  PostgreSQL (DB)   │
                                               └───────────────────┘
```

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

## Getting Started

```bash
# Clone and enter the project
git clone <repo-url>
cd proactive-care-route-optimizer

# Install git hooks (both paths — see Hook Installation below)
git config core.hooksPath .githooks
pre-commit install --hook-type commit-msg

# ── Backend ──────────────────────────────────────────────
cd backend
cp .env.example .env        # fill in DJANGO_SECRET_KEY and DATABASE_URL
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

This project enforces two quality gates at commit time, via two complementary mechanisms.

### 1. pre-commit framework (recommended)

Handles ruff (Python lint/format), Prettier (TypeScript/CSS/JSON format), and the no-AI-attribution commit-msg check.

```bash
# From repo root:
pre-commit install --hook-type commit-msg
```

Re-runs automatically on every `git commit`. To run manually on all files:

```bash
pre-commit run --all-files
```

### 2. Standalone `.githooks/commit-msg`

A minimal shell script that enforces the no-AI-attribution rule without the pre-commit framework. Install by pointing git at this project's hooks directory:

```bash
git config core.hooksPath .githooks
```

Both mechanisms enforce the same rule — run both for belt-and-suspenders protection.

### What gets blocked

Any commit message containing a `Co-Authored-By:` line that references `claude` or `anthropic` (case-insensitive) is rejected at the hook level. Collaborators are expected to author their own commits. Remove the co-author line and recommit.

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

### Required environment variables

The backend requires these env vars (Render generates/injects most of them via the Blueprint):

| Variable | Source |
|---|---|
| `DJANGO_SECRET_KEY` | Auto-generated by Render |
| `DATABASE_URL` | Injected from `pcro-db` |
| `DJANGO_DEBUG` | Set to `False` in `render.yaml` |
| `ALLOWED_HOSTS` | Set to `.onrender.com` in `render.yaml` |

---

## Project Structure

```text
proactive-care-route-optimizer/
├── README.md
├── CLAUDE.md                  Claude Code session config and project guide
├── CHANGELOG.md
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
│       └── api/               DRF app (health check; expand here)
│   └── tests/
└── frontend/                  Mitra's domain — framework subject to change
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── eslint.config.js
    ├── .prettierrc
    └── src/
        ├── main.tsx
        └── App.tsx
```

---

## Team

| Person | GitHub | Role |
|---|---|---|
| Karl Johnson | @hirekarl | Backend, NYC Open Data pipeline, elevator risk model |
| Mitra Kermanian | @MITRAKER | **Frontend owner** — DFTA data, provider data, UI/UX |
| Mofazzal Hossain | @mofazzal0413 | Pursuit AI-Native Fellow |
