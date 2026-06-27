# NYC Open Data — DOB Elevator Complaints: Integration Guide

For use by any application querying elevator complaint data for proximity alerting, chronic offender analysis, or building-level risk assessment.

---

## Important framing: there is no real-time elevator outage feed

NYC Open Data does not publish a live elevator outage stream. The closest proxy is the DOB Elevator Complaints dataset (`kqwi-7ncn`), which tracks complaints filed with the Department of Buildings. A complaint with `status = 'ACTIVE'` means it has been filed but not yet closed out by an inspector — treat this as your "possible outage" signal. These are not instantaneous; they reflect complaints that residents or building managers called in, usually within hours to days of an actual elevator stoppage. Design your UI copy and alert language accordingly.

The dataset is refreshed periodically. The field `dobrundate` (format: `YYYYMMDDHHMMSS` text, e.g., `20260626000000`) tells you when the dataset was last updated. Poll accordingly — every 5–15 minutes is reasonable; more frequent than that gains nothing because the source data doesn't change faster.

---

## Dataset 1 — DOB Elevator Complaints — `kqwi-7ncn`

**JSON endpoint:** `https://data.cityofnewyork.us/resource/kqwi-7ncn.json`
**Metadata (authoritative schema):** `https://data.cityofnewyork.us/api/views/kqwi-7ncn.json`
**Human docs:** `https://data.cityofnewyork.us/d/kqwi-7ncn`

### Schema

| Field | Type | Sample | Notes |
|---|---|---|---|
| `complaint_number` | text | `1236609` | Unique complaint ID — use as your dedup key |
| `status` | text | `CLOSED` | `ACTIVE` or `CLOSED` — your primary filter |
| `date_entered` | text | `09/17/2008` | **MM/DD/YYYY text** — see date gotcha below |
| `house_number` | text | `1595` | Street number |
| `house_street` | text | `LEXINGTON AVENUE` | Street name |
| `zip_code` | text | `10029` | |
| `bin` | text | `1085680` | 7-digit Building Identification Number — your join key to get coordinates |
| `community_board` | text | `111` | 3-digit: first digit = borough code (1=Manhattan, 2=Bronx, 3=Brooklyn, 4=Queens, 5=Staten Island) |
| `complaint_category` | text | `13` | **Always filter `= '13'` for elevator complaints.** `'51'` = boiler. Without this filter you get all DOB complaint types. |
| `unit` | text | `BEST` | Responding DOB unit code |
| `disposition_date` | text | `11/13/2008` | MM/DD/YYYY — when the complaint was closed |
| `disposition_code` | text | `L2` | Inspector outcome code |
| `inspection_date` | text | `11/13/2008` | MM/DD/YYYY — when inspector visited |
| `dobrundate` | text | `20260626000000` | Dataset refresh timestamp (YYYYMMDDHHMMSS) — use to detect stale polls |

**This dataset has no latitude/longitude fields.** You must join by `bin` to get coordinates (see Dataset 2 below).

### Date format gotcha — read this carefully

All date fields (`date_entered`, `disposition_date`, `inspection_date`) are **MM/DD/YYYY plain text**, not Socrata `calendar_date` type. This has two consequences:

1. **SoQL date functions do not work** on these fields (`date_trunc_y`, `date_extract_y`, etc. will error or return nothing).
2. **Text comparison is wrong across year boundaries.** `date_entered >= '01/01/2023'` works only within the same calendar year because `MM/DD/YYYY` sorts by month first. `'12/31/2022' > '01/01/2023'` evaluates as true because `'12'` > `'01'` lexicographically.

**Consequence for your ingest:** You cannot reliably filter by date range in SoQL for multi-year windows. Either:

- Fetch all `ACTIVE` complaints (there won't be that many — active elevator complaints rarely exceed a few thousand citywide at any moment), or
- Fetch all complaints for buildings you care about and filter dates in your application layer after parsing the MM/DD/YYYY strings into Date objects.

For the chronic offender calculation (see below), always do the date math server-side, not in SoQL.

### The right query for your ingest poller

Fetch all currently active elevator complaints citywide:

```
GET https://data.cityofnewyork.us/resource/kqwi-7ncn.json
  ?$where=status='ACTIVE' AND complaint_category='13'
  &$select=complaint_number,bin,house_number,house_street,zip_code,date_entered,community_board
  &$limit=50000
```

Add the app token header to avoid rate limiting:

```
X-App-Token: YOUR_SOCRATA_APP_TOKEN
```

If there are more than 50,000 active complaints (unlikely but defensible), paginate with `$offset=50000`, `$offset=100000`, etc., until a response returns fewer rows than your `$limit`.

---

## Dataset 2 — DOB NOW Safety Compliance — `e5aq-a4j2`

**JSON endpoint:** `https://data.cityofnewyork.us/resource/e5aq-a4j2.json`
**Metadata:** `https://data.cityofnewyork.us/api/views/e5aq-a4j2.json`
**Human docs:** `https://data.cityofnewyork.us/d/e5aq-a4j2`

This is how you get coordinates for complaint locations. `kqwi-7ncn` gives you a `bin`; this dataset maps `bin` → `latitude`, `longitude`.

### Relevant fields

| Field | Type | Notes |
|---|---|---|
| `bin` | text | 7-digit BIN — join key from complaints dataset |
| `bbl` | text | 10-digit BBL (Borough-Block-Lot) |
| `latitude` | number | WGS84 — ready for PostGIS |
| `longitude` | number | WGS84 — ready for PostGIS |
| `house_number` | text | |
| `street_name` | text | |
| `zip_code` | text | |
| `borough` | text | Full name: `MANHATTAN`, `BRONX`, `BROOKLYN`, `QUEENS`, `STATEN ISLAND` |
| `device_type` | text | `Elevator`, `Escalator`, `Amusement Ride` — filter to `Elevator` |
| `device_status` | text | `Active`, `Removed`, `Inactive` |

### Query to resolve coordinates for a batch of BINs

When your poller collects active complaints, extract the unique BIN list and batch-resolve coordinates:

```
GET https://data.cityofnewyork.us/resource/e5aq-a4j2.json
  ?$where=bin IN('2025860','1085680','3012345') AND device_type='Elevator' AND device_status='Active'
  &$select=bin,latitude,longitude,house_number,street_name,borough,zip_code
  &$limit=50000
```

**Important:** A BIN may have multiple elevator devices (multiple rows). Deduplicate by BIN after fetching — take the first row's coordinates, which will be the same building.

### Fallback geocoding

If a complaint's BIN returns no results in `e5aq-a4j2` (older buildings may not have registered devices), geocode the address string using the NYC Planning GeoSearch API:

```
GET https://geosearch.planninglabs.nyc/v2/search
  ?text=1595+LEXINGTON+AVENUE+New+York+NY+10029
  &size=1
```

The response is GeoJSON; coordinates are in `features[0].geometry.coordinates` as `[longitude, latitude]`.

---

## Chronic offender methodology

A building is a **chronic offender** if it has:

- **1 or more** elevator complaints filed in the past 12 months, **AND**
- **3 or more** elevator complaints filed in the past 3 years

Because date fields are MM/DD/YYYY text (not reliably filterable in SoQL across year boundaries), compute this entirely in your application layer.

```javascript
function parseDobDate(raw) {
  const [m, d, y] = raw.split('/');
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function isChronic(complaints) {
  const now = new Date();
  const cutoff12mo = new Date(now); cutoff12mo.setFullYear(now.getFullYear() - 1);
  const cutoff3yr  = new Date(now); cutoff3yr.setFullYear(now.getFullYear() - 3);

  const in12mo = complaints.filter(c => parseDobDate(c.date_entered) >= cutoff12mo).length;
  const in3yr  = complaints.filter(c => parseDobDate(c.date_entered) >= cutoff3yr).length;

  return in12mo >= 1 && in3yr >= 3;
}
```

To fetch the full complaint history for a BIN (all statuses, for chronic scoring):

```
GET https://data.cityofnewyork.us/resource/kqwi-7ncn.json
  ?$where=bin='2025860' AND complaint_category='13'
  &$select=complaint_number,status,date_entered
```

Do this on-demand when loading a specific building's detail view, not during the bulk proximity poll.

---

## PostGIS schema

```sql
CREATE TABLE elevator_complaints (
  complaint_number TEXT PRIMARY KEY,
  bin              TEXT NOT NULL,
  house_number     TEXT,
  house_street     TEXT,
  zip_code         TEXT,
  date_entered     DATE,           -- parse from MM/DD/YYYY in application before insert
  status           TEXT NOT NULL,  -- 'ACTIVE' or 'CLOSED'
  location         GEOMETRY(Point, 4326),  -- ST_SetSRID(ST_MakePoint(lon, lat), 4326)
  fetched_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON elevator_complaints USING GIST (location);
CREATE INDEX ON elevator_complaints (status);
CREATE INDEX ON elevator_complaints (bin);
```

### Proximity query — 0.5 miles = 804.67 meters

```sql
SELECT
  c.complaint_number,
  c.bin,
  c.house_number,
  c.house_street,
  ST_Distance(
    c.location::geography,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
  ) AS distance_m
FROM elevator_complaints c
WHERE c.status = 'ACTIVE'
  AND ST_DWithin(
        c.location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        804.67
      )
ORDER BY distance_m ASC;
-- $1 = route point longitude, $2 = route point latitude
```

---

## Ingest flow summary

1. **Poll** (every 5–15 minutes): Fetch all `status='ACTIVE' AND complaint_category='13'` rows from `kqwi-7ncn`. Compare `dobrundate` against your last-seen value — if unchanged, skip re-processing.
2. **Resolve coordinates**: For each unique BIN in the response, look up lat/lon from `e5aq-a4j2`. Fall back to GeoSearch geocoding if the BIN has no device records.
3. **Parse dates**: Convert `date_entered` from `MM/DD/YYYY` to a proper date before inserting into Postgres.
4. **Upsert**: Insert or update rows in `elevator_complaints` by `complaint_number`. Mark previously-ACTIVE rows as `CLOSED` if they no longer appear in the active query response.
5. **Alert**: Your `/api/outages` endpoint runs the `ST_DWithin` PostGIS query against the dispatcher's route coordinates and returns matching complaints with `outageAlert: true`.

---

## Socrata API essentials

- **No auth required** for public reads, but add `X-App-Token: YOUR_TOKEN` to raise rate limits. Get a free token at `https://data.cityofnewyork.us/profile/app_tokens`.
- **Default page size is 1000 rows.** Always set `$limit=50000` and paginate with `$offset` until you receive fewer rows than your limit.
- **Null fields are omitted** from JSON responses — write all field access defensively (`row.field ?? null`); never assume a field is present just because it appears in the schema.
- **SoQL is not SQL** — no JOINs, no subqueries, no CTEs. Cross-dataset enrichment (complaints → coordinates) must be done in your application layer with two separate API calls.

### SoQL quick reference

| Parameter | Purpose | Example |
|---|---|---|
| `$where` | Filter rows | `$where=status='ACTIVE' AND complaint_category='13'` |
| `$select` | Columns to return | `$select=bin,house_number,date_entered` |
| `$limit` | Max rows (default 1000, max 50000) | `$limit=50000` |
| `$offset` | Pagination | `$offset=50000` |
| `$order` | Sort | `$order=date_entered DESC` |
| `$group` | Aggregate grouping | `$group=bin` |
| `$having` | Filter after aggregation | `$having=count(*)>=3` |
