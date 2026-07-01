# Deferred frontend–API gaps

Items that could not be fully reconciled when wiring Mitra's frontend
(`origin/Frontend`) against the Sprint 1 backend. Each entry notes what
was stubbed, why, and what would be needed to close the gap.

---

## 1. `Outage.singleElevator` — ~~always `false`~~ **CLOSED**

**Closed by:** `ingest_elevator_devices` management command +
`building_risk_scores.is_single_elevator` column (migration `0003`).
Two-step join: `e5aq-a4j2` (BIN → device numbers) → `juyv-2jek`
(`only_elevator_in_building`). SQL uses `COALESCE(brs.is_single_elevator, false)`;
unknown buildings default to `false` (no false-positive risk flags).

---

## 2. `DashboardSummary.singleElevatorBuildings` — ~~always `0`~~ **CLOSED**

**Closed by:** Same as Gap 1. `DashboardSummaryView` now queries
`COUNT(*) FROM building_risk_scores WHERE is_single_elevator = true`.

---

## 3. `DashboardSummary.atRiskStops` — ~~always `0`~~ **CLOSED**

**Closed by:** `DashboardSummaryView` now queries today's `RouteStop`
rows via `_batch_nearby_outages()` and returns the count of stops with
≥1 active nearby outage. Will be 0 when no routes have been submitted
for today, which is expected until a daily route-import flow exists.

**Note:** The response always includes `atRiskStopsError: bool`. When `true`, the
proximity scan failed (logged server-side) and `atRiskStops` soft-degrades to `0`.
The frontend should distinguish this from a genuine zero.

---

## 4. `DashboardSummary.providersAffected` — always `0`

**Stubbed in:** `api/views.py` (`DashboardSummaryView`)
**Why:** Depends on Gap 3 — "providers affected" means providers who
have at least one at-risk stop.

---

## 5. `BoroughRisk.atRiskStops` — always `0`

**Stubbed in:** `api/views.py` (`DashboardSummaryView`, borough breakdown)
**Depends on:** Adding borough attribution to `RouteStop` (a `borough` column or geo-boundary lookup). Gap 3 being closed is necessary but not sufficient — the top-level `atRiskStops` count is now live, but per-borough attribution requires knowing which borough each stop belongs to, which is not currently tracked on the model.

---

## 6. `Provider.borough` — ~~always `""`~~ **CLOSED**

**Closed by:** `DFTAProvider.borough` field (migration `0005`). Stored
directly from `row.get("borough", "")` during `ingest_dfta`; the raw
DFTA provider dataset carries a `borough` column with the full borough
name (e.g., "Bronx"). `ProviderSerializer` now reads the model field.

---

## 7. `Provider.address` — ~~always `""`~~ **CLOSED**

**Closed by:** `DFTAProvider.address` field (migration `0005`). Stored
as `row.get("address") or house_number + " " + street_name` during
`ingest_dfta`. `ProviderSerializer` now reads the model field.

---

## 8. `Provider.seniorsServed` — ~~always `0`~~ **REMOVED**

**Removed by:** `refactor: remove seniorsServed field from codebase` (Mitra, `Frontend` branch).
No machine-readable source exists in the DFTA Open Data catalog. The field was dropped
entirely from `Provider` type (`frontend/src/types/index.ts`), mock data, `OutageMap`
popup, `ProvidersPage` borough breakdown, `ProviderSerializer`, and the stub test in
`test_risk_scores.py`. If a data source is confirmed later, re-add as a real field.

---

## 9. `GET /api/routes/stops/` — ~~not implemented~~ **CLOSED**

**Closed by:** `RouteStopsView` + `RouteStopFlatSerializer` (Issues #5).
Returns all stops for a given date's routes (defaults to today).
Requires `Authorization: Api-Key` header. Optional `?date=YYYY-MM-DD`
param. Response shape: `id`, `routeId`, `routeName`, `routeDate`,
`address`, `lat`, `lon`, `order`.

**Note:** Fields `recipientName`, `floor`, `scheduledTime`, `providerId`
from Mitra's `RouteStop` type are not in the model and remain absent.
The frontend's `getStops()` will receive real data but without those
fields until a care-recipient import flow is built.

---

## 10. `GET /api/alerts/at-risk/` — ~~blocked on Gap 9~~ **CLOSED**

**Closed by:** `AlertsAtRiskView` + `AtRiskStopSerializer` (Issue #6).
Returns only stops with ≥1 active nearby outage. Requires API key.
Optional `?date=YYYY-MM-DD` param (defaults to today).
Response shape per stop: `id`, `routeId`, `routeName`, `routeDate`,
`address`, `lat`, `lon`, `order`, `outageAlerts` (list), `highestSeverity`.

`DashboardSummary.atRiskStops` is now computed from today's stops via
`_batch_nearby_outages()` — no longer hardcoded to 0.

---

## 11. `DashboardSummary.heatRiskMultiplier` — ~~hardcoded `1.20`~~ **CLOSED**

**Closed by:** Live `AVG(heat_ratio)` query in `DashboardSummaryView`
across `is_chronic = true` buildings with `confidence IN ('high', 'medium')`
and non-null `heat_ratio`. Falls back to `1.20` when `building_risk_scores`
is empty or no qualifying buildings have heat data yet.
