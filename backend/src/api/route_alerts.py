"""Screen route stops against active outages for dispatcher alerts."""

import datetime
from typing import Any

from django.db import connection

from api.alerts import classify_severity, get_is_heat_week, suggest_action
from api.models import DFTAProvider, RouteStop

METERS_PER_MILE = 1609.34

NEARBY_OUTAGES_SQL = """
    SELECT
        ec.complaint_number,
        ec.bin,
        ec.house_number,
        ec.house_street,
        ec.zip_code,
        ec.community_board,
        ec.date_entered,
        ec.status,
        ec.lat,
        ec.lon,
        COALESCE(brs.is_chronic, false) AS chronic_offender,
        COALESCE(
            CASE
                WHEN brs.elevator_count_override IS NOT NULL THEN (brs.elevator_count_override = 1)
                ELSE brs.is_single_elevator
            END,
            false
        ) AS single_elevator,
        brs.heat_ratio,
        brs.confidence,
        ST_Distance(
            ec.location::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
        ) AS distance_m
    FROM elevator_complaints ec
    LEFT JOIN building_risk_scores brs ON ec.bin = brs.bin
    WHERE ec.status = 'ACTIVE'
      AND ec.location IS NOT NULL
      AND ST_DWithin(
            ec.location::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
          )
    ORDER BY distance_m ASC
"""

BOROUGH_BY_CODE = {
    "1": "Manhattan",
    "2": "Bronx",
    "3": "Brooklyn",
    "4": "Queens",
    "5": "Staten Island",
}


def _run_query(sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, row, strict=True)) for row in cursor.fetchall()]


def _outage_address(row: dict[str, Any]) -> str:
    return ", ".join(
        p
        for p in [
            f"{row.get('house_number', '')} {row.get('house_street', '')}".strip(),
            "New York, NY",
            str(row.get("zip_code") or ""),
        ]
        if p
    )


def _outage_borough(row: dict[str, Any]) -> str:
    cb = str(row.get("community_board") or "")
    return BOROUGH_BY_CODE.get(cb[:1], "") if cb else ""


def _serialize_outage(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["complaint_number"],
        "complaint_number": row["complaint_number"],
        "status": row["status"],
        "bin": row["bin"],
        "address": _outage_address(row),
        "borough": _outage_borough(row),
        "zip_code": row.get("zip_code") or "",
        "lat": row["lat"],
        "lng": row["lon"],
        "date_entered": row.get("date_entered"),
        "chronic_offender": bool(row.get("chronic_offender")),
        "single_elevator": bool(row.get("single_elevator")),
    }


def _serialize_stop(stop: RouteStop) -> dict[str, Any]:
    return {
        "id": str(stop.pk),
        "route_id": str(stop.route_id),
        "sequence": stop.order,
        "recipient_name": stop.recipient_name,
        "address": stop.address,
        "borough": stop.borough,
        "lat": stop.lat,
        "lng": stop.lon,
        "floor": stop.floor,
        "scheduled_time": stop.scheduled_time,
        "provider_id": stop.provider_id,
    }


def _serialize_provider(provider: DFTAProvider) -> dict[str, Any]:
    return {
        "id": provider.provider_id,
        "name": provider.name,
        "borough": provider.borough,
        "address": provider.address,
        "lat": provider.lat,
        "lng": provider.lon,
        "seniors_served": 0,
    }


def get_stops_for_date(route_date: datetime.date) -> list[RouteStop]:
    return list(
        RouteStop.objects.filter(route__date=route_date)
        .select_related("route")
        .order_by("route_id", "order")
    )


def build_at_risk_entries(
    route_date: datetime.date,
    *,
    alert_radius_m: float,
) -> list[dict[str, Any]]:
    """Return at-risk stop payloads sorted by severity (critical first)."""
    is_heat_week = get_is_heat_week()
    provider_cache: dict[str, DFTAProvider | None] = {}
    entries: list[dict[str, Any]] = []

    for stop in get_stops_for_date(route_date):
        if stop.lat is None or stop.lon is None:
            continue

        outage_rows = _run_query(
            NEARBY_OUTAGES_SQL,
            [stop.lon, stop.lat, stop.lon, stop.lat, alert_radius_m],
        )
        if not outage_rows:
            continue

        if stop.provider_id not in provider_cache:
            provider_cache[stop.provider_id] = (
                DFTAProvider.objects.filter(provider_id=stop.provider_id).first()
                if stop.provider_id
                else None
            )
        provider = provider_cache[stop.provider_id]
        if provider is None:
            continue

        best_row = outage_rows[0]
        distance_m = float(best_row["distance_m"])
        is_single = best_row.get("single_elevator")
        severity = classify_severity(
            distance_m,
            bool(best_row.get("chronic_offender")),
            is_single if is_single is not None else None,
            is_heat_week,
            best_row.get("heat_ratio"),
            str(best_row.get("confidence") or "low"),
        )
        action = suggest_action(severity, is_single if is_single is not None else None, is_heat_week)

        entries.append(
            {
                "stop": _serialize_stop(stop),
                "outage": _serialize_outage(best_row),
                "provider": _serialize_provider(provider),
                "alert": {
                    "id": f"{stop.pk}-{best_row['complaint_number']}",
                    "stop_id": str(stop.pk),
                    "outage_id": best_row["complaint_number"],
                    "distance_miles": round(distance_m / METERS_PER_MILE, 2),
                    "severity": severity,
                    "suggested_action": action,
                },
                "_severity_rank": {"critical": 3, "warning": 2, "watch": 1}[severity],
            }
        )

    entries.sort(key=lambda entry: (-entry["_severity_rank"], entry["alert"]["distance_miles"]))
    for entry in entries:
        entry.pop("_severity_rank", None)
    return entries


def count_at_risk_by_borough(
    entries: list[dict[str, Any]],
) -> dict[str, int]:
    counts: dict[str, int] = {}
    for entry in entries:
        borough = str(entry["stop"].get("borough") or "")
        if borough:
            counts[borough] = counts.get(borough, 0) + 1
    return counts


def providers_affected(entries: list[dict[str, Any]]) -> set[str]:
    return {entry["provider"]["id"] for entry in entries if entry["provider"]["id"]}
