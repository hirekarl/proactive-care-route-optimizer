import datetime
from typing import Any

import pytest
from django.test import Client

from api.models import DFTAProvider, Route, RouteStop
from tests.factories import BuildingRiskScoreFactory, ElevatorComplaintFactory
from tests.helpers import _set_location

TEST_API_KEY = "dispatcher-test-key"
AUTH = {"HTTP_AUTHORIZATION": f"Api-Key {TEST_API_KEY}"}


@pytest.mark.django_db
class TestAlertsAtRisk:
    @pytest.fixture(autouse=True)
    def _set_api_key(self, settings: Any) -> None:
        settings.ROUTE_API_KEY = TEST_API_KEY

    def test_stop_near_outage_appears_in_response(self) -> None:
        today = datetime.date.today()
        complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
        _set_location(complaint.complaint_number, -73.9855, 40.7580)

        route = Route.objects.create(name="At-Risk Route", date=today)
        RouteStop.objects.create(
            route=route, address="Near Stop", lat=40.7580, lon=-73.9855, order=0
        )

        response = Client().get("/api/alerts/at-risk/", **AUTH)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        entry = data[0]
        assert entry["stop"]["address"] == "Near Stop"
        assert entry["alert"]["severity"] in ("critical", "warning", "watch")
        assert entry["outage"]["id"] == complaint.complaint_number
        assert entry["provider"] is None

    def test_stop_far_from_outage_excluded(self) -> None:
        today = datetime.date.today()
        complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
        _set_location(complaint.complaint_number, -73.9855, 40.7580)

        route = Route.objects.create(name="Far Route", date=today)
        # Brooklyn — well outside 0.5 mi of Times Square
        RouteStop.objects.create(
            route=route, address="Far Stop", lat=40.6501, lon=-73.9496, order=0
        )

        response = Client().get("/api/alerts/at-risk/", **AUTH)
        assert response.status_code == 200
        assert response.json() == []

    def test_highest_severity_critical_for_single_elevator(self) -> None:
        today = datetime.date.today()
        bin_id = "SINGLE-1"
        BuildingRiskScoreFactory(bin=bin_id, is_single_elevator=True)
        complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855, bin=bin_id)
        _set_location(complaint.complaint_number, -73.9855, 40.7580)

        route = Route.objects.create(name="Critical Route", date=today)
        RouteStop.objects.create(
            route=route, address="Critical Stop", lat=40.7580, lon=-73.9855, order=0
        )

        response = Client().get("/api/alerts/at-risk/", **AUTH)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["alert"]["severity"] == "critical"

    def test_date_param_filters_by_date(self) -> None:
        target = datetime.date(2026, 1, 15)
        complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
        _set_location(complaint.complaint_number, -73.9855, 40.7580)

        route = Route.objects.create(name="Jan Route", date=target)
        RouteStop.objects.create(
            route=route, address="Jan Stop", lat=40.7580, lon=-73.9855, order=0
        )

        response = Client().get("/api/alerts/at-risk/?date=2026-01-15", **AUTH)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["stop"]["address"] == "Jan Stop"

    def test_invalid_date_returns_400(self) -> None:
        response = Client().get("/api/alerts/at-risk/?date=not-a-date", **AUTH)
        assert response.status_code == 400

    def test_requires_api_key(self) -> None:
        response = Client().get("/api/alerts/at-risk/")
        assert response.status_code == 403

    def test_wrong_api_key_returns_403(self) -> None:
        response = Client().get("/api/alerts/at-risk/", HTTP_AUTHORIZATION="Api-Key wrong-key")
        assert response.status_code == 403

    def test_provider_join_returns_provider_when_match_found(self) -> None:
        today = datetime.date.today()
        DFTAProvider.objects.create(
            provider_id="p1",
            name="Carver Senior Meals",
            borough="Manhattan",
            address="1595 Lexington Ave",
            lat=40.7918,
            lon=-73.9445,
        )
        complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
        _set_location(complaint.complaint_number, -73.9855, 40.7580)

        route = Route.objects.create(name="Provider Route", date=today)
        RouteStop.objects.create(
            route=route,
            address="Near Stop",
            lat=40.7580,
            lon=-73.9855,
            order=0,
            provider_id="p1",
        )

        response = Client().get("/api/alerts/at-risk/", **AUTH)
        data = response.json()
        assert data[0]["provider"]["id"] == "p1"
        assert data[0]["provider"]["name"] == "Carver Senior Meals"

    def test_provider_join_returns_null_when_no_match(self) -> None:
        # Simulates the seed-data mismatch: providerId references a demo ID ("p1")
        # with no corresponding real DFTAProvider row.
        today = datetime.date.today()
        complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
        _set_location(complaint.complaint_number, -73.9855, 40.7580)

        route = Route.objects.create(name="No Provider Route", date=today)
        RouteStop.objects.create(
            route=route,
            address="Near Stop",
            lat=40.7580,
            lon=-73.9855,
            order=0,
            provider_id="p1",
        )

        response = Client().get("/api/alerts/at-risk/", **AUTH)
        assert response.json()[0]["provider"] is None

    def test_stop_with_multiple_nearby_outages_returns_one_entry_per_alert(self) -> None:
        today = datetime.date.today()
        c1 = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
        _set_location(c1.complaint_number, -73.9855, 40.7580)
        c2 = ElevatorComplaintFactory(lat=40.7581, lon=-73.9856)
        _set_location(c2.complaint_number, -73.9856, 40.7581)

        route = Route.objects.create(name="Multi-Outage Route", date=today)
        RouteStop.objects.create(
            route=route, address="Near Stop", lat=40.7580, lon=-73.9855, order=0
        )

        response = Client().get("/api/alerts/at-risk/", **AUTH)
        data = response.json()
        assert len(data) == 2
        assert {e["outage"]["id"] for e in data} == {c1.complaint_number, c2.complaint_number}
        assert all(e["stop"]["address"] == "Near Stop" for e in data)
