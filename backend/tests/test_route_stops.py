import datetime
from typing import Any

import pytest
from django.test import Client

from api.models import Route, RouteStop

TEST_API_KEY = "dispatcher-test-key"
AUTH = {"HTTP_AUTHORIZATION": f"Api-Key {TEST_API_KEY}"}


@pytest.mark.django_db
class TestRouteStops:
    @pytest.fixture(autouse=True)
    def _set_api_key(self, settings: Any) -> None:
        settings.ROUTE_API_KEY = TEST_API_KEY

    def test_returns_stops_for_today(self) -> None:
        today = datetime.date.today()
        route = Route.objects.create(name="Today Route", date=today)
        RouteStop.objects.create(route=route, address="123 Main St", lat=40.7, lon=-74.0, order=0)

        response = Client().get("/api/routes/stops/", **AUTH)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["address"] == "123 Main St"
        assert data[0]["routeId"] == route.pk
        assert data[0]["routeName"] == "Today Route"
        assert data[0]["routeDate"] == today.isoformat()

    def test_excludes_other_dates(self) -> None:
        today = datetime.date.today()
        yesterday = today - datetime.timedelta(days=1)
        tomorrow = today + datetime.timedelta(days=1)

        route_today = Route.objects.create(name="Today", date=today)
        RouteStop.objects.create(
            route=route_today, address="Today Stop", lat=40.7, lon=-74.0, order=0
        )
        route_yesterday = Route.objects.create(name="Yesterday", date=yesterday)
        RouteStop.objects.create(
            route=route_yesterday, address="Yesterday Stop", lat=40.7, lon=-74.0, order=0
        )
        route_tomorrow = Route.objects.create(name="Tomorrow", date=tomorrow)
        RouteStop.objects.create(
            route=route_tomorrow, address="Tomorrow Stop", lat=40.7, lon=-74.0, order=0
        )

        response = Client().get("/api/routes/stops/", **AUTH)
        assert response.status_code == 200
        addresses = [s["address"] for s in response.json()]
        assert "Today Stop" in addresses
        assert "Yesterday Stop" not in addresses
        assert "Tomorrow Stop" not in addresses

    def test_date_param_overrides_today(self) -> None:
        target = datetime.date(2026, 1, 15)
        route = Route.objects.create(name="Jan Route", date=target)
        RouteStop.objects.create(route=route, address="Jan Stop", lat=40.7, lon=-74.0, order=0)

        response = Client().get("/api/routes/stops/?date=2026-01-15", **AUTH)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["address"] == "Jan Stop"

    def test_invalid_date_returns_400(self) -> None:
        response = Client().get("/api/routes/stops/?date=not-a-date", **AUTH)
        assert response.status_code == 400

    def test_empty_when_no_routes_for_date(self) -> None:
        response = Client().get("/api/routes/stops/?date=2000-01-01", **AUTH)
        assert response.status_code == 200
        assert response.json() == []

    def test_requires_api_key(self) -> None:
        response = Client().get("/api/routes/stops/")
        assert response.status_code == 403

    def test_wrong_api_key_returns_403(self) -> None:
        response = Client().get("/api/routes/stops/", HTTP_AUTHORIZATION="Api-Key wrong-key")
        assert response.status_code == 403
