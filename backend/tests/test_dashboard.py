"""Tests for GET /api/dashboard/summary/."""

import datetime

import pytest
from django.db import connection
from django.test import Client

from tests.factories import ElevatorComplaintFactory


def _seed_building(
    bin_id: str,
    *,
    is_chronic: bool = True,
    is_single_elevator: bool | None = None,
    heat_ratio: float | None = None,
    confidence: str = "low",
    community_board: str = "101",
) -> None:
    from api.models import BuildingRiskScore

    BuildingRiskScore.objects.update_or_create(
        bin=bin_id,
        defaults={
            "house_number": "100",
            "house_street": "Test St",
            "zip_code": "10001",
            "community_board": community_board,
            "lat": 40.758,
            "lon": -73.985,
            "complaints_1yr": 1,
            "complaints_3yr": 3,
            "is_chronic": is_chronic,
            "vulnerability_score": 1,
            "score_provider": 0,
            "score_center": 1,
            "score_heat_cb": 0,
            "heat_ratio": heat_ratio,
            "pearson_r": None,
            "pearson_p": None,
            "n_complaints_analyzed": 3,
            "confidence": confidence,
            "is_single_elevator": is_single_elevator,
            "elevator_count_override": None,
        },
    )


def _seed_forecast(days: list[tuple[str, float]]) -> None:
    with connection.cursor() as cursor:
        cursor.executemany(
            "INSERT INTO weather_forecasts (date, temp_max_f) VALUES (%s, %s)",
            days,
        )


@pytest.mark.django_db
class TestDashboardSummaryView:
    """Tests for GET /api/dashboard/summary/."""

    def test_returns_200_on_empty_db(self) -> None:
        resp = Client().get("/api/dashboard/summary/")
        assert resp.status_code == 200

    def test_active_outages_count(self) -> None:
        ElevatorComplaintFactory(status="ACTIVE")
        ElevatorComplaintFactory(status="ACTIVE")
        ElevatorComplaintFactory(status="CLOSED")
        resp = Client().get("/api/dashboard/summary/")
        assert resp.json()["activeOutages"] == 2

    def test_chronic_offenders_count(self) -> None:
        _seed_building("D-CHR-1", is_chronic=True)
        _seed_building("D-CHR-2", is_chronic=False)
        resp = Client().get("/api/dashboard/summary/")
        assert resp.json()["chronicOffenders"] == 1

    def test_single_elevator_buildings_count(self) -> None:
        _seed_building("D-SE-1", is_single_elevator=True)
        _seed_building("D-SE-2", is_single_elevator=False)
        _seed_building("D-SE-3", is_single_elevator=None)
        resp = Client().get("/api/dashboard/summary/")
        assert resp.json()["singleElevatorBuildings"] == 1

    def test_single_elevator_count_respects_elevator_count_override(self) -> None:
        # override=1, is_single_elevator=None → should count as single elevator
        from api.models import BuildingRiskScore

        BuildingRiskScore.objects.update_or_create(
            bin="D-SE-OVR",
            defaults={
                "house_number": "1",
                "house_street": "Override St",
                "zip_code": "10001",
                "community_board": "101",
                "lat": 40.758,
                "lon": -73.985,
                "complaints_1yr": 1,
                "complaints_3yr": 3,
                "is_chronic": True,
                "vulnerability_score": 0,
                "score_provider": 0,
                "score_center": 0,
                "score_heat_cb": 0,
                "n_complaints_analyzed": 0,
                "confidence": "low",
                "is_single_elevator": None,
                "elevator_count_override": 1,
            },
        )
        resp = Client().get("/api/dashboard/summary/")
        assert resp.json()["singleElevatorBuildings"] == 1

    def test_heat_risk_multiplier_falls_back_when_no_data(self) -> None:
        resp = Client().get("/api/dashboard/summary/")
        assert resp.json()["heatRiskMultiplier"] == 1.20

    def test_heat_risk_multiplier_uses_live_avg_of_high_medium_confidence(self) -> None:
        _seed_building("D-HR-1", is_chronic=True, heat_ratio=1.50, confidence="high")
        _seed_building("D-HR-2", is_chronic=True, heat_ratio=1.30, confidence="medium")
        # low confidence is excluded from the AVG
        _seed_building("D-HR-3", is_chronic=True, heat_ratio=2.00, confidence="low")
        resp = Client().get("/api/dashboard/summary/")
        assert abs(resp.json()["heatRiskMultiplier"] - 1.40) < 0.001

    def test_borough_breakdown_shape(self) -> None:
        # community_board "201" → first digit "2" → Bronx
        ElevatorComplaintFactory(status="ACTIVE", community_board="201")
        resp = Client().get("/api/dashboard/summary/")
        bronx = next((b for b in resp.json()["boroughBreakdown"] if b["borough"] == "Bronx"), None)
        assert bronx is not None
        assert bronx["activeOutages"] >= 1
        assert "chronicOffenders" in bronx
        assert "atRiskStops" in bronx

    def test_borough_breakdown_chronic_count(self) -> None:
        ElevatorComplaintFactory(status="ACTIVE", bin="BBOROUGH-1", community_board="301")
        _seed_building("BBOROUGH-1", is_chronic=True, community_board="301")
        resp = Client().get("/api/dashboard/summary/")
        brooklyn = next(
            (b for b in resp.json()["boroughBreakdown"] if b["borough"] == "Brooklyn"), None
        )
        assert brooklyn is not None
        assert brooklyn["chronicOffenders"] >= 1

    def test_outages_trend_contains_today(self) -> None:
        today = datetime.date.today()
        ElevatorComplaintFactory(status="ACTIVE", date_entered=today)
        resp = Client().get("/api/dashboard/summary/")
        trend = resp.json()["outagesTrend"]
        assert isinstance(trend, list)
        today_label = f"{today.day} {today.strftime('%b')}"
        assert any(entry["date"] == today_label for entry in trend)

    def test_heat_forecast_empty_when_table_unpopulated(self) -> None:
        resp = Client().get("/api/dashboard/summary/")
        hf = resp.json()["heatForecast"]
        assert hf["forecast"] == []
        assert hf["daysAbove90"] == 0
        assert hf["peakTempF"] is None
        assert hf["isHeatWeek"] is False

    def test_heat_forecast_populated_correctly(self) -> None:
        _seed_forecast(
            [
                ("2026-06-27", 94.0),
                ("2026-06-28", 91.0),
                ("2026-06-29", 88.0),
                ("2026-06-30", 85.0),
                ("2026-07-01", 92.0),
                ("2026-07-02", 80.0),
                ("2026-07-03", 78.0),
            ]
        )
        resp = Client().get("/api/dashboard/summary/")
        hf = resp.json()["heatForecast"]
        assert len(hf["forecast"]) == 7
        assert hf["daysAbove90"] == 3
        assert hf["peakTempF"] == 94.0
        assert hf["isHeatWeek"] is True

    def test_heat_forecast_is_heat_week_requires_three_days(self) -> None:
        # Exactly 2 days ≥90°F — not a heat week
        _seed_forecast(
            [
                ("2026-06-27", 92.0),
                ("2026-06-28", 91.0),
                ("2026-06-29", 85.0),
                ("2026-06-30", 80.0),
                ("2026-07-01", 78.0),
                ("2026-07-02", 75.0),
                ("2026-07-03", 72.0),
            ]
        )
        resp = Client().get("/api/dashboard/summary/")
        hf = resp.json()["heatForecast"]
        assert hf["daysAbove90"] == 2
        assert hf["isHeatWeek"] is False

    def test_heat_forecast_each_day_has_is_heat_day_flag(self) -> None:
        _seed_forecast([("2026-06-27", 94.0), ("2026-06-28", 80.0)])
        resp = Client().get("/api/dashboard/summary/")
        days = resp.json()["heatForecast"]["forecast"]
        assert days[0]["isHeatDay"] is True
        assert days[1]["isHeatDay"] is False
