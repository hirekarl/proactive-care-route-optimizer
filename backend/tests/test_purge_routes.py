"""Tests for purge_old_routes management command."""

import datetime

import pytest
from django.core.management import call_command

from api.models import Route, RouteStop


def _make_route(date: datetime.date, name: str = "R") -> Route:
    return Route.objects.create(name=name, date=date)


def _make_stop(route: Route) -> RouteStop:
    return RouteStop.objects.create(route=route, address="1 Test St", lat=40.7, lon=-74.0, order=0)


@pytest.mark.django_db
class TestPurgeOldRoutes:
    def test_deletes_routes_older_than_cutoff(self) -> None:
        today = datetime.date.today()
        old = _make_route(today - datetime.timedelta(days=91))
        _make_route(today - datetime.timedelta(days=10))
        call_command("purge_old_routes", verbosity=0)
        assert not Route.objects.filter(pk=old.pk).exists()
        assert Route.objects.count() == 1

    def test_keeps_routes_within_retention_window(self) -> None:
        today = datetime.date.today()
        recent = _make_route(today - datetime.timedelta(days=89))
        call_command("purge_old_routes", verbosity=0)
        assert Route.objects.filter(pk=recent.pk).exists()

    def test_stops_cascade_delete_with_route(self) -> None:
        today = datetime.date.today()
        old = _make_route(today - datetime.timedelta(days=91))
        stop = _make_stop(old)
        call_command("purge_old_routes", verbosity=0)
        assert not RouteStop.objects.filter(pk=stop.pk).exists()

    def test_custom_days_argument(self) -> None:
        today = datetime.date.today()
        _make_route(today - datetime.timedelta(days=31))
        recent = _make_route(today - datetime.timedelta(days=10))
        call_command("purge_old_routes", days=30, verbosity=0)
        assert not Route.objects.filter(date=today - datetime.timedelta(days=31)).exists()
        assert Route.objects.filter(pk=recent.pk).exists()

    def test_nothing_to_delete_does_not_raise(self) -> None:
        today = datetime.date.today()
        _make_route(today)
        call_command("purge_old_routes", verbosity=0)
        assert Route.objects.count() == 1

    def test_boundary_date_is_kept(self) -> None:
        # date__lt=cutoff: a route dated exactly 90 days ago is on the boundary and kept
        today = datetime.date.today()
        boundary = _make_route(today - datetime.timedelta(days=90))
        call_command("purge_old_routes", verbosity=0)
        assert Route.objects.filter(pk=boundary.pk).exists()

    def test_one_day_past_boundary_is_deleted(self) -> None:
        today = datetime.date.today()
        stale = _make_route(today - datetime.timedelta(days=91))
        call_command("purge_old_routes", verbosity=0)
        assert not Route.objects.filter(pk=stale.pk).exists()
