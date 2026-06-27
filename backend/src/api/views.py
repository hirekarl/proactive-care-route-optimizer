from typing import Any

from django.db import connection
from rest_framework.generics import RetrieveAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.geocoding import geocode_address
from api.models import Route, RouteStop
from api.serializers import OutageSerializer, RouteCreateSerializer, RouteSerializer

ALERT_RADIUS_M = 804.67  # 0.5 miles in metres

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
    ORDER BY distance_m ASC;
"""


def _nearby_outages(lat: float, lon: float) -> list[dict[str, Any]]:
    """Return active complaints within ALERT_RADIUS_M of the given point."""
    with connection.cursor() as cursor:
        cursor.execute(PROXIMITY_SQL, [lon, lat, lon, lat, ALERT_RADIUS_M])
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]


class HealthCheckView(APIView):
    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


class OutagesView(APIView):
    def get(self, request: Request) -> Response:
        try:
            lat = float(request.query_params["lat"])
            lon = float(request.query_params["lon"])
        except (KeyError, ValueError):
            return Response({"detail": "lat and lon query params are required."}, status=400)

        outages = _nearby_outages(lat, lon)
        return Response(OutageSerializer(outages, many=True).data)


class RouteCreateView(APIView):
    def post(self, request: Request) -> Response:
        serializer = RouteCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        data = serializer.validated_data
        route = Route.objects.create(name=data["name"], date=data["date"])

        stops: list[RouteStop] = []
        for order, address in enumerate(data["stops"]):
            lonlat = geocode_address(address)
            lat = lonlat[1] if lonlat else None
            lon = lonlat[0] if lonlat else None
            stops.append(RouteStop(route=route, address=address, lat=lat, lon=lon, order=order))
        RouteStop.objects.bulk_create(stops)

        route_out = Route.objects.prefetch_related("stops").get(pk=route.pk)
        return Response(RouteSerializer(route_out).data, status=201)


class RouteDetailView(RetrieveAPIView[Route]):
    queryset = Route.objects.prefetch_related("stops")
    serializer_class = RouteSerializer

    def retrieve(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        route = self.get_object()
        stops = list(route.stops.all())
        # alerts_by_stop_id is passed through serializer context so RouteStopSerializer
        # can embed outage data without dynamically patching model instances.
        alerts_by_stop_id: dict[int, list[dict[str, Any]]] = {}
        for stop in stops:
            if stop.lat is not None and stop.lon is not None:
                alerts_by_stop_id[stop.pk] = _nearby_outages(stop.lat, stop.lon)
        context = {**self.get_serializer_context(), "alerts_by_stop_id": alerts_by_stop_id}
        return Response(RouteSerializer(route, context=context).data)
