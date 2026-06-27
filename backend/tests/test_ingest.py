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


def test_ingest_date_parsing() -> None:
    from api.management.commands.ingest_outages import _parse_dob_date

    assert _parse_dob_date("06/15/2026") == datetime.date(2026, 6, 15)
    assert _parse_dob_date("01/01/2023") == datetime.date(2023, 1, 1)
    assert _parse_dob_date("") is None
    assert _parse_dob_date("not-a-date") is None
