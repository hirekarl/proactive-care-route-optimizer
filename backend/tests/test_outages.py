import pytest
from django.db import connection
from django.test import Client

from tests.factories import ElevatorComplaintFactory


def _set_location(complaint_number: str, lon: float, lat: float) -> None:
    """Populate the PostGIS location column (not managed by the ORM)."""
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE elevator_complaints SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
            " WHERE complaint_number = %s",
            [lon, lat, complaint_number],
        )


@pytest.mark.django_db
def test_outages_returns_nearby_complaint(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    response = client.get("/api/outages/?lat=40.7580&lon=-73.9855")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["outage_alert"] is True
    assert data[0]["distance_m"] < 804.67


@pytest.mark.django_db
def test_outages_excludes_distant_complaint(client: Client) -> None:
    # Times Square
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    # Query from Central Park (~2.5 km away — outside the 0.5-mile radius)
    response = client.get("/api/outages/?lat=40.7812&lon=-73.9665")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_outages_excludes_closed_complaints(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855, status="CLOSED")
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    response = client.get("/api/outages/?lat=40.7580&lon=-73.9855")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_outages_missing_params_returns_400(client: Client) -> None:
    response = client.get("/api/outages/")
    assert response.status_code == 400

    response = client.get("/api/outages/?lat=40.7580")
    assert response.status_code == 400
