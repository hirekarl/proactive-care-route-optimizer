import datetime

import factory

from api.models import BuildingRiskScore, ElevatorComplaint, Route, RouteStop


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
    lat = 40.7484
    lon = -73.9857
    order = factory.Sequence(lambda n: n)


class BuildingRiskScoreFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = BuildingRiskScore

    bin = factory.Sequence(lambda n: f"BIN-{n:06d}")
    house_number = "100"
    house_street = "Test St"
    zip_code = "10001"
    community_board = "101"
    lat = 40.758
    lon = -73.985
    complaints_1yr = 1
    complaints_3yr = 3
    is_chronic = False
    vulnerability_score = 1
    score_provider = 0
    score_center = 0
    score_heat_cb = 0
    heat_ratio = None
    pearson_r = None
    pearson_p = None
    n_complaints_analyzed = 1
    confidence = "low"
    is_single_elevator = None
    elevator_count_override = None
