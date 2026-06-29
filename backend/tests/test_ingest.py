import datetime
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command

from api.models import ElevatorComplaint

ACTIVE_COMPLAINTS = [
    {
        "complaint_number": "9999001",
        "bin": "1085680",
        "house_number": "1595",
        "house_street": "LEXINGTON AVENUE",
        "zip_code": "10029",
        "date_entered": "06/15/2026",
        "community_board": "111",
    }
]

DEVICE_RECORDS = [
    {
        "bin": "1085680",
        "latitude": "40.7960",
        "longitude": "-73.9497",
    }
]


def _make_mock_response(data: list[dict[str, str]]) -> MagicMock:
    mock = MagicMock()
    mock.raise_for_status = MagicMock()
    mock.json = MagicMock(return_value=data)
    return mock


@pytest.mark.django_db
def test_ingest_creates_complaint(monkeypatch: pytest.MonkeyPatch) -> None:
    call_count = 0

    def mock_get(url: str, **kwargs: object) -> MagicMock:
        nonlocal call_count
        call_count += 1
        if "kqwi-7ncn" in url:
            return _make_mock_response(ACTIVE_COMPLAINTS if call_count == 1 else [])
        return _make_mock_response(DEVICE_RECORDS if call_count == 2 else [])

    with patch("api.management.commands.ingest_outages.httpx.get", side_effect=mock_get):
        with patch("api.management.commands.ingest_outages.Command._get_token", return_value=""):
            call_command("ingest_outages")

    assert ElevatorComplaint.objects.count() == 1
    complaint = ElevatorComplaint.objects.get(complaint_number="9999001")
    assert complaint.status == "ACTIVE"
    assert complaint.bin == "1085680"
    assert complaint.community_board == "111"
    assert complaint.date_entered == datetime.date(2026, 6, 15)
    assert abs(complaint.lat - 40.7960) < 0.001
    assert abs(complaint.lon - (-73.9497)) < 0.001


@pytest.mark.django_db
def test_ingest_marks_stale_complaints_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    ElevatorComplaint.objects.create(
        complaint_number="STALE001",
        bin="0000000",
        status="ACTIVE",
        lat=40.7128,
        lon=-74.006,
    )

    call_count = 0

    def mock_get(url: str, **kwargs: object) -> MagicMock:
        nonlocal call_count
        call_count += 1
        if "kqwi-7ncn" in url:
            return _make_mock_response(ACTIVE_COMPLAINTS if call_count == 1 else [])
        return _make_mock_response(DEVICE_RECORDS if call_count == 2 else [])

    with patch("api.management.commands.ingest_outages.httpx.get", side_effect=mock_get):
        with patch("api.management.commands.ingest_outages.Command._get_token", return_value=""):
            call_command("ingest_outages")

    stale = ElevatorComplaint.objects.get(complaint_number="STALE001")
    assert stale.status == "CLOSED"


@pytest.mark.django_db
def test_ingest_skips_row_missing_complaint_number(monkeypatch: pytest.MonkeyPatch) -> None:
    """Rows with no complaint_number are silently skipped."""
    bad_row = {"bin": "1085680", "house_number": "1595", "house_street": "LEXINGTON AVENUE"}

    call_count = 0

    def mock_get(url: str, **kwargs: object) -> MagicMock:
        nonlocal call_count
        call_count += 1
        if "kqwi-7ncn" in url:
            return _make_mock_response([bad_row] if call_count == 1 else [])
        return _make_mock_response(DEVICE_RECORDS if call_count == 2 else [])

    with patch("api.management.commands.ingest_outages.httpx.get", side_effect=mock_get):
        with patch("api.management.commands.ingest_outages.Command._get_token", return_value=""):
            call_command("ingest_outages")

    assert ElevatorComplaint.objects.count() == 0


@pytest.mark.django_db
def test_ingest_geocoding_fallback_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """When a BIN is absent from the device registry, geocoding provides coordinates."""
    complaint = {
        "complaint_number": "9999002",
        "bin": "UNKNOWN-BIN",
        "house_number": "1595",
        "house_street": "LEXINGTON AVENUE",
        "zip_code": "10029",
        "date_entered": "06/15/2026",
        "community_board": "111",
    }

    call_count = 0

    def mock_get(url: str, **kwargs: object) -> MagicMock:
        nonlocal call_count
        call_count += 1
        if "kqwi-7ncn" in url:
            return _make_mock_response([complaint] if call_count == 1 else [])
        return _make_mock_response([])  # device registry returns nothing for this BIN

    with patch("api.management.commands.ingest_outages.httpx.get", side_effect=mock_get):
        with patch("api.management.commands.ingest_outages.Command._get_token", return_value=""):
            with patch(
                "api.management.commands.ingest_outages.geocode_address",
                return_value=(-73.9497, 40.7960),
            ):
                call_command("ingest_outages")

    assert ElevatorComplaint.objects.filter(complaint_number="9999002").exists()
    c = ElevatorComplaint.objects.get(complaint_number="9999002")
    assert abs(c.lat - 40.7960) < 0.001
    assert abs(c.lon - (-73.9497)) < 0.001


@pytest.mark.django_db
def test_ingest_geocoding_fallback_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """When neither the device registry nor geocoding provides coords, the row is skipped."""
    complaint = {
        "complaint_number": "9999003",
        "bin": "UNKNOWN-BIN-2",
        "house_number": "",
        "house_street": "",
        "zip_code": "",
        "date_entered": "06/15/2026",
        "community_board": "111",
    }

    call_count = 0

    def mock_get(url: str, **kwargs: object) -> MagicMock:
        nonlocal call_count
        call_count += 1
        if "kqwi-7ncn" in url:
            return _make_mock_response([complaint] if call_count == 1 else [])
        return _make_mock_response([])

    with patch("api.management.commands.ingest_outages.httpx.get", side_effect=mock_get):
        with patch("api.management.commands.ingest_outages.Command._get_token", return_value=""):
            with patch(
                "api.management.commands.ingest_outages.geocode_address",
                return_value=None,
            ):
                call_command("ingest_outages")

    assert not ElevatorComplaint.objects.filter(complaint_number="9999003").exists()


def test_resolve_coords_returns_empty_for_no_bins() -> None:
    """_resolve_coords short-circuits and returns {} when given an empty set."""
    from api.management.commands.ingest_outages import Command

    result = Command()._resolve_coords(set(), {})
    assert result == {}


def test_ingest_date_parsing() -> None:
    from api.management.commands.ingest_outages import _parse_dob_date

    assert _parse_dob_date("06/15/2026") == datetime.date(2026, 6, 15)
    assert _parse_dob_date("01/01/2023") == datetime.date(2023, 1, 1)
    assert _parse_dob_date("") is None
    assert _parse_dob_date("not-a-date") is None


@pytest.mark.django_db
class TestIngestForecast:
    """Tests for the ingest_forecast management command."""

    def _mock_response(self, dates: list[str], temps: list[float | None]) -> MagicMock:
        m = MagicMock()
        m.raise_for_status = MagicMock()
        m.json.return_value = {"daily": {"time": dates, "temperature_2m_max": temps}}
        return m

    def test_stores_forecast_rows(self) -> None:
        """Happy path: Open-Meteo response creates WeatherForecast rows."""
        from django.core.management import call_command

        dates = ["2026-06-27", "2026-06-28", "2026-06-29"]
        temps = [94.0, 88.5, 75.2]
        with patch(
            "api.management.commands.ingest_forecast.httpx.get",
            return_value=self._mock_response(dates, temps),
        ):
            call_command("ingest_forecast", verbosity=0)

        from api.models import WeatherForecast

        assert WeatherForecast.objects.count() == 3
        assert WeatherForecast.objects.get(date="2026-06-27").temp_max_f == 94.0

    def test_replaces_existing_rows(self) -> None:
        """A second run replaces all previous forecast rows."""
        from django.core.management import call_command

        from api.models import WeatherForecast

        with patch(
            "api.management.commands.ingest_forecast.httpx.get",
            return_value=self._mock_response(["2026-06-01"], [80.0]),
        ):
            call_command("ingest_forecast", verbosity=0)
        assert WeatherForecast.objects.count() == 1

        with patch(
            "api.management.commands.ingest_forecast.httpx.get",
            return_value=self._mock_response(["2026-06-27", "2026-06-28"], [91.0, 89.0]),
        ):
            call_command("ingest_forecast", verbosity=0)

        assert WeatherForecast.objects.count() == 2
        assert not WeatherForecast.objects.filter(date="2026-06-01").exists()

    def test_null_temp_stored_as_zero(self) -> None:
        """A null temperature in the API response is stored as 0.0."""
        from django.core.management import call_command

        with patch(
            "api.management.commands.ingest_forecast.httpx.get",
            return_value=self._mock_response(["2026-06-27"], [None]),
        ):
            call_command("ingest_forecast", verbosity=0)

        from api.models import WeatherForecast

        assert WeatherForecast.objects.get(date="2026-06-27").temp_max_f == 0.0

    def test_uses_correct_open_meteo_params(self) -> None:
        """timezone and temperature_unit are sent as required params."""
        from django.core.management import call_command

        with patch("api.management.commands.ingest_forecast.httpx.get") as mock_get:
            mock_get.return_value = self._mock_response([], [])
            call_command("ingest_forecast", verbosity=0)

        _, kwargs = mock_get.call_args
        params = kwargs["params"]
        assert params["timezone"] == "America/New_York"
        assert params["temperature_unit"] == "fahrenheit"
        assert params["forecast_days"] == 7


class TestGeocode:
    """Unit tests for geocode_address utility."""

    def test_returns_none_on_empty_features(self) -> None:
        """Empty features list → None, no exception."""
        m = MagicMock()
        m.raise_for_status = MagicMock()
        m.json.return_value = {"features": []}
        with patch("api.geocoding.httpx.get", return_value=m):
            from api.geocoding import geocode_address

            assert geocode_address("123 Nowhere St") is None

    def test_returns_none_on_http_error(self) -> None:
        """Any exception from httpx → None."""
        import httpx

        with patch("api.geocoding.httpx.get", side_effect=httpx.HTTPError("timeout")):
            from api.geocoding import geocode_address

            assert geocode_address("123 Nowhere St") is None
