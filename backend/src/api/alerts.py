"""Proximity alert severity classification and suggested action generation."""

from typing import Literal

from django.db import connection

CRITICAL_DISTANCE_M = 200.0
WARNING_DISTANCE_M = 500.0
HEAT_THRESHOLD_F = 90.0
HEAT_WEEK_MIN_DAYS = 3
HEAT_RATIO_THRESHOLD = 1.2

Severity = Literal["critical", "warning", "watch"]


def classify_severity(
    distance_m: float,
    is_chronic: bool,
    is_single_elevator: bool | None,
    is_heat_week: bool,
    heat_ratio: float | None,
    confidence: str,
) -> Severity:
    """Return alert severity for a route stop near an active outage.

    is_single_elevator=None (unknown) is treated as False — no false positives.
    Heat week bumps severity one tier for buildings with meaningful heat correlation
    (heat_ratio >= HEAT_RATIO_THRESHOLD and confidence 'high' or 'medium').
    """
    if is_single_elevator:
        return "critical"

    if is_chronic and distance_m <= CRITICAL_DISTANCE_M:
        base: Severity = "critical"
    elif is_chronic and distance_m <= WARNING_DISTANCE_M:
        base = "warning"
    elif distance_m <= CRITICAL_DISTANCE_M:
        base = "warning"
    else:
        base = "watch"

    if (
        is_heat_week
        and heat_ratio is not None
        and heat_ratio >= HEAT_RATIO_THRESHOLD
        and confidence in ("high", "medium")
    ):
        if base == "watch":
            base = "warning"
        elif base == "warning":
            base = "critical"

    return base


def suggest_action(
    severity: Severity,
    is_single_elevator: bool | None,
    is_heat_week: bool,
) -> str:
    """Return a human-readable suggested action for a dispatcher."""
    heat_suffix = " Heat advisory in effect — prioritize welfare check." if is_heat_week else ""

    if severity == "critical":
        if is_single_elevator:
            return (
                "Building inaccessible — single elevator out. "
                "Reroute stop or coordinate lobby handoff with building staff." + heat_suffix
            )
        if is_heat_week:
            return (
                "Active outage at high-risk building during heat advisory. "
                "Prioritize welfare check and confirm alternate access."
            )
        return (
            "Active outage at chronic offender building. "
            "Confirm elevator availability before dispatch."
        )

    if severity == "warning":
        if is_heat_week:
            return (
                "Nearby outage at elevated-risk building during heat advisory. "
                "Monitor and have backup plan ready."
            )
        return "Nearby outage at high-risk building. Monitor and have backup plan ready."

    if is_heat_week:
        return "Outage within range during heat advisory. Check building status before departure."
    return "Outage within range. Low immediate risk — check building status before departure."


def get_is_heat_week() -> bool:
    """Return True if 3 or more forecast days are >= 90°F."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) FROM weather_forecasts WHERE temp_max_f >= %s",
            [HEAT_THRESHOLD_F],
        )
        result = cursor.fetchone()
        return bool(result and result[0] >= HEAT_WEEK_MIN_DAYS)
