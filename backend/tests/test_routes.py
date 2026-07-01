import json
from typing import Any
from unittest.mock import patch

import pytest
from django.test import Client

from api.models import Route, RouteStop
from tests.factories import ElevatorComplaintFactory
from tests.helpers import _set_location

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
                        "stops": [{"address": "350 Fifth Avenue New York NY 10118"}],
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

    def test_create_route_uses_client_coords_and_persists_new_fields(self) -> None:
        client = Client()
        with patch("api.geocoding.httpx.get") as mock_get:
            response = client.post(
                "/api/routes/",
                data=json.dumps(
                    {
                        "name": "R-MN-04",
                        "date": "2026-06-30",
                        "stops": [
                            {
                                "address": "1595 Lexington Ave, New York, NY 10029",
                                "lat": 40.7918,
                                "lng": -73.9445,
                                "order": 0,
                                "recipientName": "E. Alvarez",
                                "floor": 6,
                                "scheduledTime": "09:20",
                                "providerId": "p1",
                                "borough": "Manhattan",
                            }
                        ],
                    }
                ),
                content_type="application/json",
                **AUTH,
            )
            mock_get.assert_not_called()

        assert response.status_code == 201
        stop = RouteStop.objects.get()
        assert stop.lat == 40.7918
        assert stop.lon == -73.9445
        assert stop.recipient_name == "E. Alvarez"
        assert stop.floor == 6
        assert stop.scheduled_time == "09:20"
        assert stop.provider_id == "p1"
        assert stop.borough == "Manhattan"

    def test_create_route_rejects_partial_coordinates(self) -> None:
        client = Client()
        response = client.post(
            "/api/routes/",
            data=json.dumps(
                {
                    "name": "Bad Coords",
                    "date": "2026-06-30",
                    "stops": [{"address": "123 Main St", "lat": 40.7}],
                }
            ),
            content_type="application/json",
            **AUTH,
        )
        assert response.status_code == 400

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
                        "stops": [{"address": "350 Fifth Avenue New York NY 10118"}],
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
                        "stops": [{"address": "350 Fifth Avenue New York NY 10118"}],
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

    def test_route_detail_alerts_include_severity_and_suggested_action(self) -> None:
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
                        "name": "Route Sev",
                        "date": "2026-06-27",
                        "stops": [{"address": "350 Fifth Avenue New York NY 10118"}],
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
        alert = stop["outageAlerts"][0]
        assert alert["severity"] in ("critical", "warning", "watch")
        assert isinstance(alert["suggestedAction"], str)
        assert len(alert["suggestedAction"]) > 0

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

    def test_route_detail_multiple_stops_batch_query(self) -> None:
        client = Client()
        # complaint at Times Square
        complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
        _set_location(complaint.complaint_number, -73.9855, 40.7580)

        route = Route.objects.create(name="Multi-Stop", date="2026-06-27")
        # stop A: near complaint
        RouteStop.objects.create(route=route, address="Stop A", lat=40.7580, lon=-73.9855, order=0)
        # stop B: far away (Brooklyn)
        RouteStop.objects.create(route=route, address="Stop B", lat=40.6501, lon=-73.9496, order=1)
        # stop C: also near complaint
        RouteStop.objects.create(route=route, address="Stop C", lat=40.7581, lon=-73.9856, order=2)

        detail_response = client.get(f"/api/routes/{route.pk}/", **AUTH)
        assert detail_response.status_code == 200
        stops = detail_response.json()["stops"]
        assert len(stops) == 3

        stop_a = next(s for s in stops if s["address"] == "Stop A")
        stop_b = next(s for s in stops if s["address"] == "Stop B")
        stop_c = next(s for s in stops if s["address"] == "Stop C")

        assert len(stop_a["outageAlerts"]) == 1
        assert stop_b["outageAlerts"] == []
        assert len(stop_c["outageAlerts"]) == 1

    def test_route_detail_stop_without_geocoords_skipped(self) -> None:
        client = Client()
        route = Route.objects.create(name="No Coords", date="2026-06-27")
        RouteStop.objects.create(
            route=route, address="Unknown Address", lat=None, lon=None, order=0
        )

        detail_response = client.get(f"/api/routes/{route.pk}/", **AUTH)
        assert detail_response.status_code == 200
        stop = detail_response.json()["stops"][0]
        assert stop["outageAlerts"] == []
