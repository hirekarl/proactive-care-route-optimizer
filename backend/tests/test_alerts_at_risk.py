import datetime
from typing import Any

import pytest
from django.test import Client

from api.models import BuildingRiskScore, Route, RouteStop
from tests.factories import ElevatorComplaintFactory
from tests.helpers import _set_location

TEST_API_KEY = "dispatcher-test-key"
AUTH = {"HTTP_AUTHORIZATION": f"Api-Key {TEST_API_KEY}"}


def _seed_building(
    bin_id: str, *, is_chronic: bool = False, is_single_elevator: bool | None = None
) -> None:
    BuildingRiskScore.objects.update_or_create(
        bin=bin_id,
        defaults={
            "house_number": "100",
            "house_street": "Test St",
            "zip_code": "10001",
            "community_board": "101",
            "lat": 40.758,
            "lon": -73.985,
            "complaints_1yr": 1,
            "complaints_3yr": 3,
            "is_chronic": is_chronic,
            "vulnerability_score": 1,
            "score_provider": 0,
            "score_center": 0,
            "score_heat_cb": 0,
            "heat_ratio": None,
            "pearson_r": None,
            "pearson_p": None,
            "n_complaints_analyzed": 1,
            "confidence": "low",
            "is_single_elevator": is_single_elevator,
            "elevator_count_override": None,
        },
    )


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
        stop = data[0]
        assert stop["address"] == "Near Stop"
        assert len(stop["outageAlerts"]) == 1
        assert stop["outageAlerts"][0]["outageAlert"] is True
        assert stop["highestSeverity"] in ("critical", "warning", "watch")

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
        _seed_building(bin_id, is_single_elevator=True)
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
        assert data[0]["highestSeverity"] == "critical"

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
        assert data[0]["address"] == "Jan Stop"

    def test_invalid_date_returns_400(self) -> None:
        response = Client().get("/api/alerts/at-risk/?date=not-a-date", **AUTH)
        assert response.status_code == 400

    def test_requires_api_key(self) -> None:
        response = Client().get("/api/alerts/at-risk/")
        assert response.status_code == 403

    def test_wrong_api_key_returns_403(self) -> None:
        response = Client().get("/api/alerts/at-risk/", HTTP_AUTHORIZATION="Api-Key wrong-key")
        assert response.status_code == 403
