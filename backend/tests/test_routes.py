import json
from unittest.mock import patch

import pytest
from django.db import connection
from django.test import Client

from api.models import Route, RouteStop
from tests.factories import ElevatorComplaintFactory

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
    assert abs(stop["lon"] - (-73.9857)) < 0.001
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
    assert len(stop["outage_alerts"]) == 1
    assert stop["outage_alerts"][0]["outage_alert"] is True


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
    assert stop["outage_alerts"] == []
