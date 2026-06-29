import json
from typing import Any
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

TEST_API_KEY = "dispatcher-test-key"
AUTH = {"HTTP_AUTHORIZATION": f"Api-Key {TEST_API_KEY}"}


def _set_location(complaint_number: str, lon: float, lat: float) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE elevator_complaints SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
            " WHERE complaint_number = %s",
            [lon, lat, complaint_number],
        )


@pytest.mark.django_db
class TestRoutes:
    @pytest.fixture(autouse=True)
    def _set_api_key(self, settings: Any) -> None:
        settings.ROUTE_API_KEY = TEST_API_KEY

    def test_create_route_geocodes_stops(self) -> None:
        client = Client()
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
                **AUTH,
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

    def test_create_route_invalid_payload_returns_400(self) -> None:
        client = Client()
        response = client.post(
            "/api/routes/",
            data=json.dumps({"name": "Route A"}),
            content_type="application/json",
            **AUTH,
        )
        assert response.status_code == 400

    def test_route_detail_embeds_outage_alerts(self) -> None:
        client = Client()
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
                **AUTH,
            )

        route_id = create_response.json()["id"]
        detail_response = client.get(f"/api/routes/{route_id}/", **AUTH)
        assert detail_response.status_code == 200
        stop = detail_response.json()["stops"][0]
        assert len(stop["outageAlerts"]) == 1
        assert stop["outageAlerts"][0]["outageAlert"] is True

    def test_route_detail_no_alerts_when_no_nearby_complaints(self) -> None:
        client = Client()
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
                **AUTH,
            )

        route_id = create_response.json()["id"]
        detail_response = client.get(f"/api/routes/{route_id}/", **AUTH)
        assert detail_response.status_code == 200
        stop = detail_response.json()["stops"][0]
        assert stop["outageAlerts"] == []

    def test_missing_api_key_returns_403(self) -> None:
        client = Client()
        response = client.post(
            "/api/routes/",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_wrong_api_key_returns_403(self) -> None:
        client = Client()
        response = client.post(
            "/api/routes/",
            data=json.dumps({}),
            content_type="application/json",
            HTTP_AUTHORIZATION="Api-Key wrong-key",
        )
        assert response.status_code == 403
