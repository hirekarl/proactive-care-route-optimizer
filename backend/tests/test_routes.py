import datetime
import json
from unittest.mock import patch

import pytest
from django.db import connection
from django.test import Client

from api.models import Route, RouteStop
from tests.factories import DFTAProviderFactory, ElevatorComplaintFactory, RouteFactory, RouteStopFactory

GEOSEARCH_RESPONSE = {
    "features": [
        {
            "geometry": {
                "coordinates": [-73.9857, 40.7484]  # Empire State Building area
            }
        }
    ]
}


def _set_location(complaint_number: str, lon: float, lat: float) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE elevator_complaints SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
            " WHERE complaint_number = %s",
            [lon, lat, complaint_number],
        )


@pytest.mark.django_db
def test_create_route_geocodes_stops(client: Client) -> None:
    with patch("api.geocoding.httpx.get") as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json = lambda: GEOSEARCH_RESPONSE

        response = client.post(
            "/api/routes/",
            data=json.dumps(
                {
                    "name": "Route A",
                    "date": "2026-06-27",
                    "stops": ["350 Fifth Avenue New York NY 10118"],
                }
            ),
            content_type="application/json",
        )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Route A"
    assert len(data["stops"]) == 1
    stop = data["stops"][0]
    assert abs(stop["lat"] - 40.7484) < 0.001
    assert abs(stop["lon"] - (-73.9857)) < 0.001  # lon stays as-is (not snake_case)
    assert Route.objects.count() == 1
    assert RouteStop.objects.count() == 1


@pytest.mark.django_db
def test_create_route_invalid_payload_returns_400(client: Client) -> None:
    response = client.post(
        "/api/routes/",
        data=json.dumps({"name": "Route A"}),
        content_type="application/json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_route_detail_embeds_outage_alerts(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7484, lon=-73.9857)
    _set_location(complaint.complaint_number, -73.9857, 40.7484)

    with patch("api.geocoding.httpx.get") as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json = lambda: GEOSEARCH_RESPONSE

        create_response = client.post(
            "/api/routes/",
            data=json.dumps(
                {
                    "name": "Route B",
                    "date": "2026-06-27",
                    "stops": ["350 Fifth Avenue New York NY 10118"],
                }
            ),
            content_type="application/json",
        )

    route_id = create_response.json()["id"]
    detail_response = client.get(f"/api/routes/{route_id}/")
    assert detail_response.status_code == 200
    stop = detail_response.json()["stops"][0]
    assert len(stop["outageAlerts"]) == 1
    assert stop["outageAlerts"][0]["outageAlert"] is True


@pytest.mark.django_db
def test_route_detail_no_alerts_when_no_nearby_complaints(client: Client) -> None:
    with patch("api.geocoding.httpx.get") as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json = lambda: GEOSEARCH_RESPONSE

        create_response = client.post(
            "/api/routes/",
            data=json.dumps(
                {
                    "name": "Route C",
                    "date": "2026-06-27",
                    "stops": ["350 Fifth Avenue New York NY 10118"],
                }
            ),
            content_type="application/json",
        )

    route_id = create_response.json()["id"]
    detail_response = client.get(f"/api/routes/{route_id}/")
    assert detail_response.status_code == 200
    stop = detail_response.json()["stops"][0]
    assert stop["outageAlerts"] == []


@pytest.mark.django_db
def test_create_route_accepts_rich_stop_objects(client: Client) -> None:
    DFTAProviderFactory(provider_id="p1")

    with patch("api.geocoding.httpx.get") as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json = lambda: GEOSEARCH_RESPONSE

        response = client.post(
            "/api/routes/",
            data=json.dumps(
                {
                    "name": "Route D",
                    "date": "2026-06-27",
                    "stops": [
                        {
                            "address": "350 Fifth Avenue New York NY 10118",
                            "recipientName": "E. Alvarez",
                            "borough": "Manhattan",
                            "floor": 6,
                            "scheduledTime": "09:20",
                            "providerId": "p1",
                        }
                    ],
                }
            ),
            content_type="application/json",
        )

    assert response.status_code == 201
    stop = RouteStop.objects.get()
    assert stop.recipient_name == "E. Alvarez"
    assert stop.floor == 6
    assert stop.scheduled_time == "09:20"
    assert stop.provider_id == "p1"
    assert stop.borough == "Manhattan"


@pytest.mark.django_db
def test_list_route_stops_for_today(client: Client) -> None:
    route = RouteFactory(date=datetime.date(2026, 6, 27))
    RouteStopFactory(
        route=route,
        order=0,
        recipient_name="E. Alvarez",
        provider_id="p1",
    )

    response = client.get("/api/routes/stops/?date=2026-06-27")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["recipientName"] == "E. Alvarez"
    assert data[0]["routeId"] == str(route.pk)
    assert data[0]["sequence"] == 0


@pytest.mark.django_db
def test_at_risk_stops_returns_flagged_stop(client: Client) -> None:
    provider = DFTAProviderFactory(provider_id="p1")
    route = RouteFactory(date=datetime.date(2026, 6, 27))
    stop = RouteStopFactory(
        route=route,
        lat=40.7484,
        lon=-73.9857,
        provider_id=provider.provider_id,
        borough="Manhattan",
    )
    complaint = ElevatorComplaintFactory(lat=40.7484, lon=-73.9857)
    _set_location(complaint.complaint_number, -73.9857, 40.7484)

    response = client.get("/api/alerts/at-risk/?date=2026-06-27")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["stop"]["id"] == str(stop.pk)
    assert data[0]["provider"]["id"] == provider.provider_id
    assert data[0]["alert"]["stopId"] == str(stop.pk)
    assert data[0]["alert"]["severity"] in {"critical", "warning", "watch"}
    assert data[0]["alert"]["suggestedAction"]
