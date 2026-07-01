"""Tests for the ingest_elevator_devices management command."""

from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.db import connection


def _seed_building(bin_id: str) -> None:
    from api.models import BuildingRiskScore

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
            "is_chronic": True,
            "vulnerability_score": 1,
            "score_provider": 0,
            "score_center": 1,
            "score_heat_cb": 0,
            "heat_ratio": None,
            "pearson_r": None,
            "pearson_p": None,
            "n_complaints_analyzed": 3,
            "confidence": "low",
            "is_single_elevator": None,
            "elevator_count_override": None,
        },
    )


def _get_is_single_elevator(bin_id: str) -> bool | None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT is_single_elevator FROM building_risk_scores WHERE bin = %s", [bin_id]
        )
        row = cursor.fetchone()
    return bool(row[0]) if row and row[0] is not None else None


def _mock_http(
    compliance_rows: list[dict[str, str]], device_rows: list[dict[str, str]]
) -> MagicMock:
    """Mock httpx.get to serve e5aq-a4j2 and juyv-2jek responses."""

    def side_effect(url: str, **kwargs: object) -> MagicMock:
        m = MagicMock()
        m.raise_for_status = MagicMock()
        m.json.return_value = compliance_rows if "e5aq-a4j2" in url else device_rows
        return m

    return MagicMock(side_effect=side_effect)


def test_fetch_paginates_until_short_page() -> None:
    """_fetch issues successive requests until a page shorter than PAGE_SIZE is returned."""
    from api.management.commands.ingest_elevator_devices import PAGE_SIZE, _fetch

    page1 = [{"bin": "X", "device_number": f"D{i}"} for i in range(PAGE_SIZE)]
    page2 = [{"bin": "X", "device_number": "D_LAST"}]
    call_count = 0

    def mock_get(url: str, **kwargs: object) -> MagicMock:
        nonlocal call_count
        call_count += 1
        m = MagicMock()
        m.raise_for_status = MagicMock()
        m.json.return_value = page1 if call_count == 1 else page2
        return m

    with patch("api.management.commands.ingest_elevator_devices.httpx.get", side_effect=mock_get):
        results = _fetch("https://example.com", {"$where": "test"}, {})

    assert len(results) == PAGE_SIZE + 1
    assert call_count == 2


@pytest.mark.django_db
class TestIngestElevatorDevices:
    """Tests for ingest_elevator_devices — two-step BIN → device → flag join."""

    def test_yes_flag_sets_true(self) -> None:
        """only_elevator_in_building='Yes' → is_single_elevator=True."""
        _seed_building("EV-YES-001")
        with patch(
            "api.management.commands.ingest_elevator_devices.httpx.get",
            _mock_http(
                [{"bin": "EV-YES-001", "device_number": "D001"}],
                [{"bis_nyc_device_id": "D001", "only_elevator_in_building": "Yes"}],
            ),
        ):
            call_command("ingest_elevator_devices", verbosity=0)
        assert _get_is_single_elevator("EV-YES-001") is True

    def test_no_flag_sets_false(self) -> None:
        """only_elevator_in_building='No' → is_single_elevator=False."""
        _seed_building("EV-NO-002")
        with patch(
            "api.management.commands.ingest_elevator_devices.httpx.get",
            _mock_http(
                [{"bin": "EV-NO-002", "device_number": "D002"}],
                [{"bis_nyc_device_id": "D002", "only_elevator_in_building": "No"}],
            ),
        ):
            call_command("ingest_elevator_devices", verbosity=0)
        assert _get_is_single_elevator("EV-NO-002") is False

    def test_absent_field_leaves_null(self) -> None:
        """Socrata omits null fields — key absent from response → is_single_elevator=None."""
        _seed_building("EV-NULL-003")
        with patch(
            "api.management.commands.ingest_elevator_devices.httpx.get",
            _mock_http(
                [{"bin": "EV-NULL-003", "device_number": "D003"}],
                [{"bis_nyc_device_id": "D003"}],  # only_elevator_in_building absent
            ),
        ):
            call_command("ingest_elevator_devices", verbosity=0)
        assert _get_is_single_elevator("EV-NULL-003") is None

    def test_no_device_record_leaves_null(self) -> None:
        """BIN absent from e5aq-a4j2 → no devices found → is_single_elevator=None."""
        _seed_building("EV-NODEV-004")
        with patch(
            "api.management.commands.ingest_elevator_devices.httpx.get",
            _mock_http([], []),
        ):
            call_command("ingest_elevator_devices", verbosity=0)
        assert _get_is_single_elevator("EV-NODEV-004") is None

    def test_yes_wins_over_no_for_same_building(self) -> None:
        """Multiple devices — 'Yes' takes precedence over 'No'."""
        _seed_building("EV-MULTI-005")
        with patch(
            "api.management.commands.ingest_elevator_devices.httpx.get",
            _mock_http(
                [
                    {"bin": "EV-MULTI-005", "device_number": "D005A"},
                    {"bin": "EV-MULTI-005", "device_number": "D005B"},
                ],
                [
                    {"bis_nyc_device_id": "D005A", "only_elevator_in_building": "Yes"},
                    {"bis_nyc_device_id": "D005B", "only_elevator_in_building": "No"},
                ],
            ),
        ):
            call_command("ingest_elevator_devices", verbosity=0)
        assert _get_is_single_elevator("EV-MULTI-005") is True

    def test_all_unknown_devices_leaves_null(self) -> None:
        """All devices have absent flag → is_single_elevator=None."""
        _seed_building("EV-ALLUNK-006")
        with patch(
            "api.management.commands.ingest_elevator_devices.httpx.get",
            _mock_http(
                [
                    {"bin": "EV-ALLUNK-006", "device_number": "D006A"},
                    {"bin": "EV-ALLUNK-006", "device_number": "D006B"},
                ],
                [
                    {"bis_nyc_device_id": "D006A"},
                    {"bis_nyc_device_id": "D006B"},
                ],
            ),
        ):
            call_command("ingest_elevator_devices", verbosity=0)
        assert _get_is_single_elevator("EV-ALLUNK-006") is None
