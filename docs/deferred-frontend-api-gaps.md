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

**Closed by:** `build_at_risk_entries()` in `api/route_alerts.py`, wired into
`DashboardSummaryView` on `mh/route-stops-api`.

---

## 4. `DashboardSummary.providersAffected` — ~~always `0`~~ **CLOSED**

**Closed by:** Same as Gap 3 — counts distinct providers on at-risk stops.

---

## 5. `BoroughRisk.atRiskStops` — ~~always `0`~~ **CLOSED**

**Closed by:** Same as Gap 3 — per-borough counts from at-risk stop boroughs.

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

## 9. `GET /api/routes/stops/` — ~~not implemented; frontend uses mock~~ **CLOSED**

**Closed by:** `RouteStopsListView` on `mh/route-stops-api`. Returns all stops
for a route date (`?date=YYYY-MM-DD`, defaults to today). `RouteStop` model
extended with `recipient_name`, `floor`, `scheduled_time`, `provider_id`, and
`borough`; rich stop objects accepted on `POST /api/routes/`.

---

## 10. `GET /api/alerts/at-risk/` — ~~endpoint blocked on Gap 9~~ **CLOSED**

**Closed by:** `AtRiskStopsView` on `mh/route-stops-api`. Screens geocoded
stops for the requested date against active outages within 0.5 mi, applies
`classify_severity` / `suggest_action`, and returns the joined `AtRiskStop`
shape expected by Mitra's frontend.

---

## 11. `DashboardSummary.heatRiskMultiplier` — ~~hardcoded `1.20`~~ **CLOSED**

**Closed by:** Live `AVG(heat_ratio)` query in `DashboardSummaryView`
across `is_chronic = true` buildings with `confidence IN ('high', 'medium')`
and non-null `heat_ratio`. Falls back to `1.20` when `building_risk_scores`
is empty or no qualifying buildings have heat data yet.
