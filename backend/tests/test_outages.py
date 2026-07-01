import pytest
from django.test import Client

from tests.factories import ElevatorComplaintFactory
from tests.helpers import _set_location


@pytest.mark.django_db
def test_outages_no_params_returns_all_active(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    response = client.get("/api/outages/")
    assert response.status_code == 200
    data = response.json()
    assert any(o["complaintNumber"] == complaint.complaint_number for o in data)


@pytest.mark.django_db
def test_outages_no_params_excludes_closed(client: Client) -> None:
    ElevatorComplaintFactory(lat=40.7580, lon=-73.9855, status="CLOSED")

    response = client.get("/api/outages/")
    assert response.status_code == 200
    # Closed complaints must not appear
    assert all(o["status"] == "ACTIVE" for o in response.json())


@pytest.mark.django_db
def test_outages_returns_enriched_shape(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855, community_board="101")
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    response = client.get("/api/outages/")
    assert response.status_code == 200
    item = next(o for o in response.json() if o["complaintNumber"] == complaint.complaint_number)
    assert item["borough"] == "Manhattan"
    assert "address" in item
    assert "chronicOffender" in item
    assert item["singleElevator"] is False  # stub


@pytest.mark.django_db
def test_outages_proximity_returns_nearby(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    response = client.get("/api/outages/?lat=40.7580&lon=-73.9855")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["distanceM"] < 804.67


@pytest.mark.django_db
def test_outages_proximity_excludes_distant(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855)
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    # Query from Central Park — ~2.5 km away, outside the 0.5-mile radius
    response = client.get("/api/outages/?lat=40.7812&lon=-73.9665")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_outages_proximity_excludes_closed(client: Client) -> None:
    complaint = ElevatorComplaintFactory(lat=40.7580, lon=-73.9855, status="CLOSED")
    _set_location(complaint.complaint_number, -73.9855, 40.7580)

    response = client.get("/api/outages/?lat=40.7580&lon=-73.9855")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.django_db
def test_outages_only_one_param_returns_400(client: Client) -> None:
    response = client.get("/api/outages/?lat=40.7580")
    assert response.status_code == 400


@pytest.mark.django_db
def test_outages_invalid_lat_lon_returns_400(client: Client) -> None:
    response = client.get("/api/outages/?lat=notanumber&lon=0")
    assert response.status_code == 400
    assert "must be valid floats" in response.json()["detail"]
