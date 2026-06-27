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

## 3. `DashboardSummary.atRiskStops` — always `0`

**Stubbed in:** `api/views.py` (`DashboardSummaryView`)
**Why:** Computing "at-risk stops" requires a persistent set of route
stops with geocoded coordinates that can be screened against the live
outage feed at dashboard load time. Our current `RouteStop` model only
holds stops from explicitly-submitted routes (via `POST /api/routes/`);
there is no standing daily route imported from the DFTA system.
**To close:** Either (a) agree on a daily route-import mechanism with
DFTA data and store those stops, or (b) make the frontend submit the
day's routes on startup and cache the count server-side.

---

## 4. `DashboardSummary.providersAffected` — always `0`

**Stubbed in:** `api/views.py` (`DashboardSummaryView`)
**Why:** Depends on Gap 3 — "providers affected" means providers who
have at least one at-risk stop.

---

## 5. `BoroughRisk.atRiskStops` — always `0`

**Stubbed in:** `api/views.py` (`DashboardSummaryView`, borough breakdown)
**Depends on:** Gap 3.

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

## 8. `Provider.seniorsServed` — always `0`

**Stubbed in:** `api/serializers.py` (`ProviderSerializer`)
**Why:** "Seniors served" is not a field in the DFTA provider dataset on
NYC Open Data. It would need to come from a separate DFTA data export or
a manually-maintained lookup table.
**To close:** Determine with Mitra whether this field is available in
any source; if not, consider removing it from the `Provider` type.

---

## 9. `GET /api/routes/stops/` — not implemented; frontend uses mock

**Why:** Mitra's `RouteStop` type includes `recipientName`, `floor`,
`scheduledTime`, and `providerId` — fields that imply a care-recipient
management system we have not built. Our `RouteStop` model only holds
`address`, `lat`, `lon`, `order`.
**Frontend impact:** `getStops()` falls back to `mockData.ts`; the Map
page and At-Risk Stops table are unaffected as long as `VITE_USE_MOCK`
is not `"false"` for those calls.
**To close:** Extend `RouteStop` model with `recipient_name`,
`floor_number`, `scheduled_time` fields and either (a) accept them on
`POST /api/routes/` or (b) build a separate recipient-import flow. Add
`GET /api/routes/stops/` that returns all stops across all routes for the
current date.

---

## 10. `GET /api/alerts/at-risk/` — not implemented; frontend uses mock

**Why:** The `AtRiskStop` type joins `RouteStop`, `ProximityAlert`,
`Outage`, and `Provider` into a single object. The `ProximityAlert`
shape includes `severity` (`critical`/`warning`/`watch`) and
`suggestedAction` (human-readable guidance string). Neither is computed
server-side today.
**Frontend impact:** `getAtRiskStops()` falls back to `mockData.ts`.
**To close:** After Gap 9 is closed (standing daily stops exist),
add a scheduled or on-demand proximity screening job that writes
`ProximityAlert` rows. Derive `severity` from distance + `is_chronic` +
`single_elevator`. Generate `suggestedAction` with a rule table keyed
on severity + floor + elevator type.

---

## 11. `DashboardSummary.heatRiskMultiplier` — ~~hardcoded `1.20`~~ **CLOSED**

**Closed by:** Live `AVG(heat_ratio)` query in `DashboardSummaryView`
across `is_chronic = true` buildings with `confidence IN ('high', 'medium')`
and non-null `heat_ratio`. Falls back to `1.20` when `building_risk_scores`
is empty or no qualifying buildings have heat data yet.
