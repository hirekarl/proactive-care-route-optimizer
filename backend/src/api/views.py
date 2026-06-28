import datetime
from typing import Any

from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.geocoding import geocode_address
from api.models import BuildingRiskScore, DFTAProvider, Route, RouteStop
from api.route_alerts import (
    build_at_risk_entries,
    count_at_risk_by_borough,
    get_stops_for_date,
    providers_affected,
)
from api.serializers import (
    BuildingRiskScoreSerializer,
    BuildingUpdateSerializer,
    EnrichedOutageSerializer,
    FrontendRouteStopSerializer,
    ProviderSerializer,
    RouteCreateSerializer,
    RouteSerializer,
)

ALERT_RADIUS_M = 804.67  # 0.5 miles in metres

BOROUGH_BY_CODE = {
    "1": "Manhattan",
    "2": "Bronx",
    "3": "Brooklyn",
    "4": "Queens",
    "5": "Staten Island",
}

_HEAT_RISK_MULTIPLIER_FALLBACK = 1.20  # EDA baseline; used when no scored buildings exist yet

ALL_OUTAGES_SQL = """
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
        ) AS single_elevator
    FROM elevator_complaints ec
    LEFT JOIN building_risk_scores brs ON ec.bin = brs.bin
    WHERE ec.status = 'ACTIVE' AND ec.location IS NOT NULL
    ORDER BY ec.date_entered DESC
"""

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

# Used internally by RouteDetailView — compact shape for embedded stop alerts.
PROXIMITY_SQL = """
    SELECT
        complaint_number,
        bin,
        house_number,
        house_street,
        zip_code,
        date_entered,
        ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
        ) AS distance_m
    FROM elevator_complaints
    WHERE status = 'ACTIVE'
      AND location IS NOT NULL
      AND ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
            %s
          )
    ORDER BY distance_m ASC
"""


def _enrich_outage_row(row: dict[str, Any]) -> dict[str, Any]:
    cb = str(row.get("community_board") or "")
    borough = BOROUGH_BY_CODE.get(cb[:1], "") if cb else ""
    address = ", ".join(
        p
        for p in [
            f"{row.get('house_number', '')} {row.get('house_street', '')}".strip(),
            "New York, NY",
            str(row.get("zip_code") or ""),
        ]
        if p
    )
    return {
        **row,
        "id": row["complaint_number"],
        "borough": borough,
        "address": address,
        "lng": row["lon"],
    }


def _run_query(sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, row, strict=True)) for row in cursor.fetchall()]


def _nearby_outages(lat: float, lon: float) -> list[dict[str, Any]]:
    """Compact proximity results for embedding in route-stop alert lists."""
    return _run_query(PROXIMITY_SQL, [lon, lat, lon, lat, ALERT_RADIUS_M])


class HealthCheckView(APIView):
    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


class OutagesView(APIView):
    """
    GET /api/outages/          — all active outages (enriched)
    GET /api/outages/?lat=&lon= — active outages within 0.5 mi (enriched + distance_m)
    """

    def get(self, request: Request) -> Response:
        lat_str = request.query_params.get("lat")
        lon_str = request.query_params.get("lon")

        if lat_str is None and lon_str is None:
            rows = [_enrich_outage_row(r) for r in _run_query(ALL_OUTAGES_SQL)]
        elif lat_str is not None and lon_str is not None:
            try:
                lat, lon = float(lat_str), float(lon_str)
            except ValueError:
                return Response({"detail": "lat and lon must be valid floats."}, status=400)
            rows = [
                _enrich_outage_row(r)
                for r in _run_query(NEARBY_OUTAGES_SQL, [lon, lat, lon, lat, ALERT_RADIUS_M])
            ]
        else:
            return Response({"detail": "Provide both lat and lon, or neither."}, status=400)

        return Response(EnrichedOutageSerializer(rows, many=True).data)


class DashboardSummaryView(APIView):
    """GET /api/dashboard/summary/ — aggregate stats for the dispatcher dashboard."""

    def get(self, request: Request) -> Response:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM elevator_complaints WHERE status = 'ACTIVE'")
            active_outages: int = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM building_risk_scores WHERE is_chronic = true")
            chronic_offenders: int = cursor.fetchone()[0]
            cursor.execute(
                "SELECT COUNT(*) FROM building_risk_scores WHERE is_single_elevator = true"
            )
            single_elevator_buildings: int = cursor.fetchone()[0]
            cursor.execute("SELECT MAX(fetched_at) FROM elevator_complaints")
            last_ingest_at_raw = cursor.fetchone()[0]
            last_ingest_at = last_ingest_at_raw.isoformat() if last_ingest_at_raw else None

            cursor.execute(
                """
                SELECT AVG(heat_ratio)
                FROM building_risk_scores
                WHERE is_chronic = true
                  AND confidence IN ('high', 'medium')
                  AND heat_ratio IS NOT NULL
                """
            )
            heat_ratio_avg: float | None = cursor.fetchone()[0]
            heat_risk_multiplier = (
                round(float(heat_ratio_avg), 4)
                if heat_ratio_avg is not None
                else _HEAT_RISK_MULTIPLIER_FALLBACK
            )

            # Borough breakdown — first digit of community_board encodes the borough
            cursor.execute(
                """
                SELECT
                    LEFT(ec.community_board, 1) AS borough_code,
                    COUNT(*) AS active_outages,
                    SUM(CASE WHEN brs.is_chronic = true THEN 1 ELSE 0 END) AS chronic_offenders
                FROM elevator_complaints ec
                LEFT JOIN building_risk_scores brs ON ec.bin = brs.bin
                WHERE ec.status = 'ACTIVE'
                  AND ec.community_board != ''
                GROUP BY LEFT(ec.community_board, 1)
                ORDER BY borough_code
                """
            )
            borough_rows = cursor.fetchall()

            # Active outage counts for the last 7 calendar days
            cursor.execute(
                """
                SELECT date_entered, COUNT(*) AS outage_count
                FROM elevator_complaints
                WHERE status = 'ACTIVE'
                  AND date_entered >= CURRENT_DATE - INTERVAL '6 days'
                GROUP BY date_entered
                ORDER BY date_entered
                """
            )
            trend_rows = cursor.fetchall()

            cursor.execute("SELECT date, temp_max_f FROM weather_forecasts ORDER BY date")
            forecast_rows = cursor.fetchall()

        borough_breakdown = [
            {
                "borough": BOROUGH_BY_CODE.get(str(code), str(code)),
                "active_outages": int(active),
                "at_risk_stops": 0,
                "chronic_offenders": int(chronic),
            }
            for code, active, chronic in borough_rows
            if str(code) in BOROUGH_BY_CODE
        ]

        route_date = datetime.date.today()
        at_risk_entries = build_at_risk_entries(route_date, alert_radius_m=ALERT_RADIUS_M)
        at_risk_by_borough = count_at_risk_by_borough(at_risk_entries)
        for borough_row in borough_breakdown:
            borough_row["at_risk_stops"] = at_risk_by_borough.get(borough_row["borough"], 0)

        outages_trend = [
            {
                "date": (d.strftime("%-d %b") if isinstance(d, datetime.date) else str(d)),
                "outages": int(count),
            }
            for d, count in trend_rows
        ]

        forecast_temps = [float(t) for _, t in forecast_rows]
        forecast_days = [
            {
                "date": d.isoformat() if isinstance(d, datetime.date) else str(d),
                "temp_max_f": round(float(t), 1),
                "is_heat_day": float(t) >= 90.0,
            }
            for d, t in forecast_rows
        ]
        days_above_90 = sum(1 for t in forecast_temps if t >= 90.0)
        peak_temp_f: float | None = max(forecast_temps) if forecast_temps else None
        heat_forecast = {
            "is_heat_week": days_above_90 >= 3,
            "days_above_90": days_above_90,
            "peak_temp_f": peak_temp_f,
            "forecast": forecast_days,
        }

        return Response(
            {
                "active_outages": active_outages,
                "at_risk_stops": len(at_risk_entries),
                "providers_affected": len(providers_affected(at_risk_entries)),
                "chronic_offenders": chronic_offenders,
                "single_elevator_buildings": single_elevator_buildings,
                "heat_risk_multiplier": heat_risk_multiplier,
                "heat_forecast": heat_forecast,
                "last_ingest_at": last_ingest_at,
                "borough_breakdown": borough_breakdown,
                "outages_trend": outages_trend,
            }
        )


class ProvidersView(ListAPIView[DFTAProvider]):
    """GET /api/providers/ — DFTA provider locations."""

    queryset = DFTAProvider.objects.all().order_by("name")
    serializer_class = ProviderSerializer


class RouteCreateView(APIView):
    def post(self, request: Request) -> Response:
        serializer = RouteCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        route = Route.objects.create(name=data["name"], date=data["date"])

        stops: list[RouteStop] = []
        for order, stop_data in enumerate(data["stops"]):
            address = stop_data["address"]
            lonlat = geocode_address(address)
            lat = lonlat[1] if lonlat else None
            lon = lonlat[0] if lonlat else None
            stops.append(
                RouteStop(
                    route=route,
                    address=address,
                    borough=stop_data.get("borough", ""),
                    lat=lat,
                    lon=lon,
                    order=order,
                    recipient_name=stop_data.get("recipient_name", ""),
                    floor=stop_data.get("floor"),
                    scheduled_time=stop_data.get("scheduled_time", ""),
                    provider_id=stop_data.get("provider_id", ""),
                )
            )
        RouteStop.objects.bulk_create(stops)

        route_out = Route.objects.prefetch_related("stops").get(pk=route.pk)
        return Response(RouteSerializer(route_out).data, status=201)


class RouteDetailView(RetrieveAPIView[Route]):
    queryset = Route.objects.prefetch_related("stops")
    serializer_class = RouteSerializer

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        route = self.get_object()
        stops = list(route.stops.all())
        alerts_by_stop_id: dict[int, list[dict[str, Any]]] = {}
        for stop in stops:
            if stop.lat is not None and stop.lon is not None:
                alerts_by_stop_id[stop.pk] = _nearby_outages(stop.lat, stop.lon)
        context = {**self.get_serializer_context(), "alerts_by_stop_id": alerts_by_stop_id}
        return Response(RouteSerializer(route, context=context).data)


class RouteStopsListView(APIView):
    """GET /api/routes/stops/ — all stops for a route date (defaults to today)."""

    def get(self, request: Request) -> Response:
        date_str = request.query_params.get("date")
        if date_str is None:
            route_date = datetime.date.today()
        else:
            try:
                route_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response({"detail": "date must be ISO 8601 (YYYY-MM-DD)."}, status=400)

        stops = get_stops_for_date(route_date)
        return Response(FrontendRouteStopSerializer(stops, many=True).data)


class AtRiskStopsView(APIView):
    """GET /api/alerts/at-risk/ — route stops screened against active outages."""

    def get(self, request: Request) -> Response:
        date_str = request.query_params.get("date")
        if date_str is None:
            route_date = datetime.date.today()
        else:
            try:
                route_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response({"detail": "date must be ISO 8601 (YYYY-MM-DD)."}, status=400)

        entries = build_at_risk_entries(route_date, alert_radius_m=ALERT_RADIUS_M)
        return Response(entries)


class BuildingListView(ListAPIView[BuildingRiskScore]):
    """List buildings with risk scores. Optional filters: min_score, is_chronic, borough."""

    serializer_class = BuildingRiskScoreSerializer

    def get_queryset(self) -> Any:
        qs = BuildingRiskScore.objects.all().order_by("-vulnerability_score", "-complaints_3yr")

        min_score = self.request.query_params.get("min_score")
        if min_score is not None:
            try:
                qs = qs.filter(vulnerability_score__gte=int(min_score))
            except ValueError:
                pass

        is_chronic = self.request.query_params.get("is_chronic")
        if is_chronic is not None:
            qs = qs.filter(is_chronic=(is_chronic.lower() == "true"))

        # borough encoded as first digit of community_board (1–5)
        borough = self.request.query_params.get("borough")
        if borough and borough in {"1", "2", "3", "4", "5"}:
            qs = qs.filter(community_board__startswith=borough)

        return qs


class BuildingDetailView(APIView):
    """
    GET  /api/buildings/<bin>/ — full risk score record
    PATCH /api/buildings/<bin>/ — set/clear elevator_count_override
    """

    def get(self, request: Request, bin: str) -> Response:
        building = get_object_or_404(BuildingRiskScore, bin=bin)
        return Response(BuildingRiskScoreSerializer(building).data)

    def patch(self, request: Request, bin: str) -> Response:
        building = get_object_or_404(BuildingRiskScore, bin=bin)
        serializer = BuildingUpdateSerializer(building, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response(BuildingRiskScoreSerializer(building).data)
