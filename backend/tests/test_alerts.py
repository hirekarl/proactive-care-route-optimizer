"""Tests for proximity alert severity classification and suggested action generation."""

import pytest
from django.db import connection

from api.alerts import (
    HEAT_RATIO_THRESHOLD,
    classify_severity,
    get_is_heat_week,
    suggest_action,
)


class TestClassifySeverity:
    def test_single_elevator_always_critical(self) -> None:
        assert classify_severity(800.0, False, True, False, None, "low") == "critical"

    def test_single_elevator_critical_overrides_heat_bump(self) -> None:
        # Already critical via single_elevator — heat bump is irrelevant
        assert classify_severity(800.0, False, True, True, 0.5, "high") == "critical"

    def test_single_elevator_none_not_critical(self) -> None:
        # Unknown treated as False — no false positives
        assert classify_severity(800.0, False, None, False, None, "low") == "watch"

    def test_chronic_close_is_critical(self) -> None:
        assert classify_severity(100.0, True, None, False, None, "low") == "critical"

    def test_chronic_mid_range_is_warning(self) -> None:
        assert classify_severity(300.0, True, None, False, None, "low") == "warning"

    def test_chronic_far_is_watch(self) -> None:
        assert classify_severity(600.0, True, None, False, None, "low") == "watch"

    def test_non_chronic_close_is_warning(self) -> None:
        assert classify_severity(100.0, False, None, False, None, "low") == "warning"

    def test_non_chronic_mid_range_is_watch(self) -> None:
        assert classify_severity(300.0, False, None, False, None, "low") == "watch"

    def test_heat_week_bumps_warning_to_critical(self) -> None:
        result = classify_severity(300.0, True, None, True, HEAT_RATIO_THRESHOLD, "high")
        assert result == "critical"

    def test_heat_week_bumps_watch_to_warning(self) -> None:
        result = classify_severity(600.0, True, None, True, HEAT_RATIO_THRESHOLD, "medium")
        assert result == "warning"

    def test_heat_week_no_bump_when_low_confidence(self) -> None:
        result = classify_severity(300.0, True, None, True, HEAT_RATIO_THRESHOLD, "low")
        assert result == "warning"

    def test_heat_week_no_bump_when_low_heat_ratio(self) -> None:
        result = classify_severity(300.0, True, None, True, 1.0, "high")
        assert result == "warning"

    def test_heat_week_no_bump_when_heat_ratio_none(self) -> None:
        result = classify_severity(300.0, True, None, True, None, "high")
        assert result == "warning"

    def test_heat_week_no_double_bump_from_critical(self) -> None:
        # Already critical via distance — heat bump cannot push further
        result = classify_severity(100.0, True, None, True, HEAT_RATIO_THRESHOLD, "high")
        assert result == "critical"

    def test_distance_boundary_critical(self) -> None:
        assert classify_severity(200.0, True, None, False, None, "low") == "critical"

    def test_distance_boundary_warning(self) -> None:
        assert classify_severity(500.0, True, None, False, None, "low") == "warning"

    def test_distance_just_over_critical_boundary(self) -> None:
        assert classify_severity(201.0, True, None, False, None, "low") == "warning"


class TestSuggestAction:
    def test_critical_single_elevator_no_heat(self) -> None:
        action = suggest_action("critical", True, False)
        assert "inaccessible" in action
        assert "single elevator" in action
        assert "heat" not in action.lower()

    def test_critical_single_elevator_heat_week(self) -> None:
        action = suggest_action("critical", True, True)
        assert "inaccessible" in action
        assert "Heat advisory" in action

    def test_critical_not_single_elevator_heat_week(self) -> None:
        action = suggest_action("critical", False, True)
        assert "heat advisory" in action.lower()
        assert "inaccessible" not in action

    def test_critical_not_single_elevator_no_heat(self) -> None:
        action = suggest_action("critical", False, False)
        assert "heat" not in action.lower()
        assert "inaccessible" not in action

    def test_critical_none_elevator_no_heat(self) -> None:
        action = suggest_action("critical", None, False)
        assert "heat" not in action.lower()

    def test_warning_heat_week(self) -> None:
        action = suggest_action("warning", None, True)
        assert "heat advisory" in action.lower()

    def test_warning_no_heat(self) -> None:
        action = suggest_action("warning", None, False)
        assert "heat" not in action.lower()

    def test_watch_heat_week(self) -> None:
        action = suggest_action("watch", None, True)
        assert "heat advisory" in action.lower()

    def test_watch_no_heat(self) -> None:
        action = suggest_action("watch", None, False)
        assert "heat" not in action.lower()


@pytest.mark.django_db
class TestGetIsHeatWeek:
    def test_empty_table_returns_false(self) -> None:
        assert get_is_heat_week() is False

    def test_two_hot_days_returns_false(self) -> None:
        with connection.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO weather_forecasts (date, temp_max_f) VALUES (%s, %s)"
                " ON CONFLICT (date) DO NOTHING",
                [("2026-07-01", 95.0), ("2026-07-02", 92.0)],
            )
        assert get_is_heat_week() is False

    def test_three_hot_days_returns_true(self) -> None:
        with connection.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO weather_forecasts (date, temp_max_f) VALUES (%s, %s)"
                " ON CONFLICT (date) DO NOTHING",
                [("2026-07-01", 95.0), ("2026-07-02", 92.0), ("2026-07-03", 91.0)],
            )
        assert get_is_heat_week() is True

    def test_exactly_90_counts_as_hot(self) -> None:
        with connection.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO weather_forecasts (date, temp_max_f) VALUES (%s, %s)"
                " ON CONFLICT (date) DO NOTHING",
                [("2026-07-01", 90.0), ("2026-07-02", 90.0), ("2026-07-03", 90.0)],
            )
        assert get_is_heat_week() is True

    def test_below_90_does_not_count(self) -> None:
        with connection.cursor() as cursor:
            cursor.executemany(
                "INSERT INTO weather_forecasts (date, temp_max_f) VALUES (%s, %s)"
                " ON CONFLICT (date) DO NOTHING",
                [("2026-07-01", 89.9), ("2026-07-02", 89.9), ("2026-07-03", 89.9)],
            )
        assert get_is_heat_week() is False
