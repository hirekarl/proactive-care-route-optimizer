# Deferred frontend–API gaps

Items that could not be fully reconciled when wiring Mitra's frontend
(`origin/Frontend`) against the Sprint 1 backend. Each entry notes what
was stubbed, why, and what would be needed to close the gap.

---

## 1. `Outage.singleElevator` — always `false`

**Stubbed in:** `api/views.py` (`_enrich_outage_row`)
**Why:** The DOB Elevator Complaints dataset (`kqwi-7ncn`) does not carry
a field indicating whether a building has a single elevator. The DOB
Elevator Devices dataset (`bc8t-ecyu`) contains per-device records that
could be grouped by BIN to derive a `single_elevator` flag, but it has
not been ingested.
**To close:** Add an `ingest_elevator_devices` management command that
fetches `bc8t-ecyu`, groups by BIN, and writes `is_single_elevator`
(bool) to `building_risk_scores`. Surface that column in
`EnrichedOutageSerializer` and `BuildingRiskScoreSerializer`.

---

## 2. `DashboardSummary.singleElevatorBuildings` — always `0`

**Stubbed in:** `api/views.py` (`DashboardSummaryView`)
**Depends on:** Gap 1 — same data source.

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

## 6. `Provider.borough` — always `""`

**Stubbed in:** `api/serializers.py` (`ProviderSerializer`)
**Why:** `DFTAProvider` model only stores `provider_id`, `name`, `lat`,
`lon`. The DFTA provider dataset schema varies by contract cycle; no
borough column was captured at ingest time.
**To close:** Add a `borough` field to `DFTAProvider`, populate it
during `ingest_dfta` (derive from first digit of `community_board` if
present in the source data, or reverse-geocode from lat/lon), and
expose it in `ProviderSerializer`.

---

## 7. `Provider.address` — always `""`

**Stubbed in:** `api/serializers.py` (`ProviderSerializer`)
**Why:** Same model gap as Gap 6. The provider dataset may carry address
fields under varying column names depending on the year of the contract.
**To close:** Capture `address` (or `house_number` + `street_name`) in
`DFTAProvider` during ingest and surface it in the serializer.

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

## 11. `DashboardSummary.heatRiskMultiplier` — hardcoded `1.20`

**Stubbed in:** `api/views.py` (`HEAT_RISK_MULTIPLIER = 1.20`)
**Why:** The 1.20× figure comes from the EDA (Pearson r across 2018–2026
complaint data). The per-building `heat_ratio` field exists in
`building_risk_scores`, but a live citywide aggregate has not been wired
up to a single summary number.
**To close:** Add a query to `DashboardSummaryView` that computes a
weighted mean of `heat_ratio` across all `is_chronic = true` buildings
with `confidence IN ('high', 'medium')`.
