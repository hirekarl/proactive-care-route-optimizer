import datetime

import factory

from api.models import DFTAProvider, ElevatorComplaint, Route, RouteStop


class ElevatorComplaintFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ElevatorComplaint

    complaint_number = factory.Sequence(lambda n: str(1000000 + n))
    bin = factory.Sequence(lambda n: str(2000000 + n))
    house_number = "100"
    house_street = "MAIN STREET"
    zip_code = "10001"
    community_board = "105"  # Manhattan CB 5
    date_entered = datetime.date(2026, 1, 15)
    status = "ACTIVE"
    # Default: Times Square area
    lat = 40.7580
    lon = -73.9855


class RouteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Route

    name = factory.Sequence(lambda n: f"Route {n}")
    date = datetime.date(2026, 6, 27)


class RouteStopFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RouteStop

    route = factory.SubFactory(RouteFactory)
    address = "350 Fifth Avenue New York NY 10118"
    borough = "Manhattan"
    lat = 40.7484
    lon = -73.9857
    order = factory.Sequence(lambda n: n)
    recipient_name = factory.Sequence(lambda n: f"Recipient {n}")
    floor = 6
    scheduled_time = "09:20"
    provider_id = "p1"


class DFTAProviderFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DFTAProvider

    provider_id = factory.Sequence(lambda n: f"p{n + 1}")
    name = factory.Sequence(lambda n: f"Provider {n + 1}")
    borough = "Manhattan"
    address = "1595 Lexington Ave, New York, NY 10029"
    lat = 40.7918
    lon = -73.9445
