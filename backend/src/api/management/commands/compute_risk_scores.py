"""Compute per-building composite vulnerability score and heat correlation metrics."""

import datetime
import math
from typing import Any

import pandas as pd
from django.core.management.base import BaseCommand
from django.db import connection, transaction
from scipy import stats

from api.models import BuildingRiskScore

ANALYSIS_YEARS = 3
HEAT_THRESHOLD_F = 90.0
PROXIMITY_M = 804.67  # 0.5 miles
MIN_COMPLAINTS_FOR_R = 8
EARTH_RADIUS_MILES = 3958.8
HEAT_TERCILE = 0.67


# ---------------------------------------------------------------------------
# Haversine distance
# ---------------------------------------------------------------------------


def _haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return EARTH_RADIUS_MILES * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Proximity via PostGIS (avoids loading all coordinates into Python memory)
# ---------------------------------------------------------------------------


def _bins_near_table(table: str, radius_m: float) -> set[str]:
    """Return BINs from building_risk_scores within radius_m of any row in table."""
    sql = f"""
        SELECT DISTINCT b.bin
        FROM building_risk_scores b
        JOIN {table} t
          ON ST_DWithin(b.location::geography, t.location::geography, %s)
        WHERE b.location IS NOT NULL AND t.location IS NOT NULL
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [radius_m])
        return {row[0] for row in cursor.fetchall()}


# ---------------------------------------------------------------------------
# Heat correlation per building
# ---------------------------------------------------------------------------


def _score_building_heat(
    bin_id: str,
    building_weekly: pd.DataFrame,
    all_weeks: pd.DataFrame,
    n_complaints_3yr: int,
) -> dict[str, Any]:
    merged = all_weeks[["week_start", "weekly_max_f", "is_heat_week"]].merge(
        building_weekly[building_weekly["bin"] == bin_id][["week_start", "n_complaints"]],
        on="week_start",
        how="left",
    )
    merged["n_complaints"] = merged["n_complaints"].fillna(0)

    n_heat = int(merged["is_heat_week"].sum())
    n_nonheat = int((~merged["is_heat_week"]).sum())
    heat_c = float(merged.loc[merged["is_heat_week"], "n_complaints"].sum())
    nonheat_c = float(merged.loc[~merged["is_heat_week"], "n_complaints"].sum())

    heat_rate = heat_c / n_heat if n_heat > 0 else 0.0
    nonheat_rate = nonheat_c / n_nonheat if n_nonheat > 0 else 0.0

    if nonheat_rate > 0:
        heat_ratio: float | None = round(heat_rate / nonheat_rate, 3)
    elif heat_rate > 0:
        heat_ratio = None  # effectively infinite; signal noted via confidence
    else:
        heat_ratio = None

    total = int(merged["n_complaints"].sum())
    pearson_r: float | None = None
    pearson_p: float | None = None
    if total >= MIN_COMPLAINTS_FOR_R:
        r, p = stats.pearsonr(merged["n_complaints"], merged["weekly_max_f"])
        pearson_r = round(float(r), 4)
        pearson_p = round(float(p), 4)

    if n_complaints_3yr >= 15:
        confidence = "high"
    elif n_complaints_3yr >= 5:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "heat_ratio": heat_ratio,
        "pearson_r": pearson_r,
        "pearson_p": pearson_p,
        "n_complaints_analyzed": total,
        "confidence": confidence,
    }


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------


class Command(BaseCommand):
    help = "Compute composite vulnerability scores and heat correlation metrics per building."

    def handle(self, *args: object, **options: object) -> None:
        today = datetime.date.today()
        cutoff_1yr = today - datetime.timedelta(days=365)
        cutoff_3yr = today - datetime.timedelta(days=365 * ANALYSIS_YEARS)

        # ── 1. Load complaint history ─────────────────────────────────────
        self.stdout.write("Loading complaint history...")
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT bin, house_number, house_street, zip_code, community_board,
                       lat, lon, date_entered
                FROM elevator_complaints
                WHERE date_entered IS NOT NULL
                  AND lat IS NOT NULL AND lon IS NOT NULL
                  AND bin != ''
                """
            )
            cols = [c[0] for c in cursor.description]
            complaints = pd.DataFrame(cursor.fetchall(), columns=cols)

        if complaints.empty:
            self.stdout.write(self.style.WARNING("No complaint data — run ingest_outages first."))
            return

        complaints["date_entered"] = pd.to_datetime(complaints["date_entered"])
        self.stdout.write(f"  {len(complaints):,} complaint rows loaded.")

        # ── 2. Identify chronic offenders ─────────────────────────────────
        in_1yr = complaints[complaints["date_entered"].dt.date >= cutoff_1yr]
        in_3yr = complaints[complaints["date_entered"].dt.date >= cutoff_3yr]

        counts_1yr = in_1yr.groupby("bin").size().rename("complaints_1yr")
        counts_3yr = in_3yr.groupby("bin").size().rename("complaints_3yr")

        building_meta = (
            complaints.sort_values("date_entered", ascending=False)
            .drop_duplicates("bin")
            .set_index("bin")[
                ["house_number", "house_street", "zip_code", "community_board", "lat", "lon"]
            ]
        )

        chronic = (
            building_meta.join(counts_1yr, how="left")
            .join(counts_3yr, how="left")
            .fillna({"complaints_1yr": 0, "complaints_3yr": 0})
        )
        chronic["complaints_1yr"] = chronic["complaints_1yr"].astype(int)
        chronic["complaints_3yr"] = chronic["complaints_3yr"].astype(int)
        chronic["is_chronic"] = (chronic["complaints_1yr"] >= 1) & (chronic["complaints_3yr"] >= 3)
        self.stdout.write(
            f"  {int(chronic['is_chronic'].sum())} chronic offender buildings identified."
        )

        # ── 3. Upsert BuildingRiskScore rows (needed for PostGIS proximity) ──
        self.stdout.write("Upserting building records for proximity queries...")
        self._upsert_buildings(chronic)

        # ── 4. Proximity scores via PostGIS ───────────────────────────────
        self.stdout.write("Computing proximity scores via PostGIS...")
        bins_near_providers: set[str] = set()
        bins_near_centers: set[str] = set()

        from api.models import DFTAProvider, DFTASeniorCenter

        if DFTAProvider.objects.exists():
            bins_near_providers = _bins_near_table("dfta_providers", PROXIMITY_M)
            self.stdout.write(f"  {len(bins_near_providers)} buildings near a DFTA provider.")
        else:
            self.stdout.write(self.style.WARNING("  No DFTA providers — run ingest_dfta first."))

        if DFTASeniorCenter.objects.exists():
            bins_near_centers = _bins_near_table("dfta_senior_centers", PROXIMITY_M)
            self.stdout.write(f"  {len(bins_near_centers)} buildings near a senior center.")
        else:
            self.stdout.write(self.style.WARNING("  No senior centers — run ingest_dfta first."))

        # ── 5. Community board heat flag ───────────────────────────────────
        self.stdout.write("Computing community board heat flags...")
        high_heat_cbs = self._heat_flag_cbs(complaints)
        self.stdout.write(f"  {len(high_heat_cbs)} CBs in top heat tercile.")

        # ── 6. Weather data for heat correlation ──────────────────────────
        self.stdout.write("Loading weather data...")
        with connection.cursor() as cursor:
            cursor.execute("SELECT date, temp_max_f FROM weather_days ORDER BY date")
            weather_rows = cursor.fetchall()

        if not weather_rows:
            self.stdout.write(self.style.WARNING("  No weather data — run ingest_weather first."))
            weekly_weather: pd.DataFrame | None = None
        else:
            weather_df = pd.DataFrame(weather_rows, columns=["date", "weekly_max_f"])
            weather_df["date"] = pd.to_datetime(weather_df["date"])
            weather_df["week_start"] = weather_df["date"].dt.to_period("W").dt.start_time
            weekly_weather = weather_df.groupby("week_start")["weekly_max_f"].max().reset_index()
            weekly_weather["is_heat_week"] = weekly_weather["weekly_max_f"] >= HEAT_THRESHOLD_F
            self.stdout.write(f"  {len(weekly_weather)} weeks of weather data.")

        # ── 7. Weekly complaints per BIN for heat correlation ─────────────
        complaints["week_start"] = complaints["date_entered"].dt.to_period("W").dt.start_time
        weekly_complaints = (
            complaints[complaints["date_entered"].dt.date >= cutoff_3yr]
            .groupby(["bin", "week_start"])
            .size()
            .reset_index(name="n_complaints")
        )

        # ── 8. Compute and persist final scores ───────────────────────────
        self.stdout.write("Scoring buildings and persisting results...")
        with transaction.atomic():
            for bin_id, row in chronic.iterrows():
                s_provider = 1 if str(bin_id) in bins_near_providers else 0
                s_center = 1 if str(bin_id) in bins_near_centers else 0
                s_heat_cb = 1 if str(row["community_board"]) in high_heat_cbs else 0

                heat_metrics: dict[str, Any] = {
                    "heat_ratio": None,
                    "pearson_r": None,
                    "pearson_p": None,
                    "n_complaints_analyzed": 0,
                    "confidence": "low",
                }
                if weekly_weather is not None:
                    heat_metrics = _score_building_heat(
                        str(bin_id),
                        weekly_complaints,
                        weekly_weather,
                        int(row["complaints_3yr"]),
                    )

                BuildingRiskScore.objects.update_or_create(
                    bin=str(bin_id),
                    defaults={
                        "house_number": str(row["house_number"]),
                        "house_street": str(row["house_street"]),
                        "zip_code": str(row["zip_code"]),
                        "community_board": str(row["community_board"]),
                        "lat": float(row["lat"]),
                        "lon": float(row["lon"]),
                        "complaints_1yr": int(row["complaints_1yr"]),
                        "complaints_3yr": int(row["complaints_3yr"]),
                        "is_chronic": bool(row["is_chronic"]),
                        "vulnerability_score": s_provider + s_center + s_heat_cb,
                        "score_provider": s_provider,
                        "score_center": s_center,
                        "score_heat_cb": s_heat_cb,
                        **heat_metrics,
                    },
                )

            # Sync PostGIS geometry column
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE building_risk_scores"
                    " SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)"
                )

        total = BuildingRiskScore.objects.count()
        chronic_count = BuildingRiskScore.objects.filter(is_chronic=True).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {total} buildings scored ({chronic_count} chronic offenders)."
            )
        )

    def _upsert_buildings(self, chronic: pd.DataFrame) -> None:
        """Insert placeholder BuildingRiskScore rows so PostGIS proximity queries work."""
        with transaction.atomic():
            for bin_id, row in chronic.iterrows():
                BuildingRiskScore.objects.get_or_create(
                    bin=str(bin_id),
                    defaults={
                        "house_number": str(row["house_number"]),
                        "house_street": str(row["house_street"]),
                        "zip_code": str(row["zip_code"]),
                        "community_board": str(row["community_board"]),
                        "lat": float(row["lat"]),
                        "lon": float(row["lon"]),
                        "complaints_1yr": int(row["complaints_1yr"]),
                        "complaints_3yr": int(row["complaints_3yr"]),
                        "is_chronic": bool(row["is_chronic"]),
                        "vulnerability_score": 0,
                        "score_provider": 0,
                        "score_center": 0,
                        "score_heat_cb": 0,
                        "n_complaints_analyzed": 0,
                        "confidence": "low",
                    },
                )
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE building_risk_scores"
                    " SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)"
                    " WHERE location IS NULL"
                )

    def _heat_flag_cbs(self, complaints: pd.DataFrame) -> set[str]:
        """Return community board IDs in the top HEAT_TERCILE by summer complaint ratio."""
        # community_board is a 3-digit string; first digit encodes borough
        c = complaints.dropna(subset=["community_board"]).copy()
        c = c[c["community_board"] != ""]
        c["is_summer"] = complaints["date_entered"].dt.month.isin([6, 7, 8])
        total = c.groupby("community_board").size()
        summer = c[c["is_summer"]].groupby("community_board").size()
        ratio = (summer / total).fillna(0)
        threshold = ratio.quantile(HEAT_TERCILE)
        return set(ratio[ratio >= threshold].index)
