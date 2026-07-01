from typing import Any

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from api.models import BuildingRiskScore, DFTAProvider, Route, RouteStop


class OutageAlertSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Compact outage shape embedded inside route-stop alert lists."""

    complaint_number = serializers.CharField()
    bin = serializers.CharField()
    house_number = serializers.CharField(allow_blank=True, required=False, default="")
    house_street = serializers.CharField(allow_blank=True, required=False, default="")
    zip_code = serializers.CharField(allow_blank=True, required=False, default="")
    date_entered = serializers.DateField(allow_null=True, required=False)
    distance_m = serializers.FloatField()
    outage_alert = serializers.SerializerMethodField()
    severity = serializers.CharField()
    suggested_action = serializers.CharField()

    def get_outage_alert(self, obj: dict[str, Any]) -> bool:
        return True


class EnrichedOutageSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Full outage shape for GET /api/outages/ — matches Mitra's Outage type."""

    id = serializers.CharField()
    complaint_number = serializers.CharField()
    status = serializers.CharField()
    bin = serializers.CharField()
    address = serializers.CharField()
    borough = serializers.CharField()
    zip_code = serializers.CharField(allow_blank=True)
    lat = serializers.FloatField(allow_null=True)
    lng = serializers.FloatField(allow_null=True)
    date_entered = serializers.DateField(allow_null=True)
    chronic_offender = serializers.BooleanField()
    single_elevator = serializers.BooleanField()
    distance_m = serializers.FloatField(allow_null=True, required=False)


class RouteStopSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    outage_alerts = serializers.SerializerMethodField()

    class Meta:
        model = RouteStop
        fields = ["id", "address", "lat", "lon", "order", "outage_alerts"]

    def get_outage_alerts(self, obj: RouteStop) -> list[dict[str, Any]]:
        alerts_by_id: dict[int, list[dict[str, Any]]] = self.context.get("alerts_by_stop_id", {})
        alerts = alerts_by_id.get(obj.pk, [])
        return OutageAlertSerializer(alerts, many=True).data  # type: ignore[return-value]


class RouteSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    stops = RouteStopSerializer(many=True, read_only=True)

    class Meta:
        model = Route
        fields = ["id", "name", "date", "stops"]


class RouteStopInputSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """One stop in POST /api/routes/ — matches seedRoutes.ts's RoutePostBody.stops[]."""

    address = serializers.CharField()
    lat = serializers.FloatField(required=False, allow_null=True, default=None)
    lng = serializers.FloatField(source="lon", required=False, allow_null=True, default=None)
    order = serializers.IntegerField(required=False)  # accepted, ignored — server derives order
    recipient_name = serializers.CharField(required=False, allow_blank=True, default="")
    floor = serializers.IntegerField(required=False, allow_null=True, default=None)
    scheduled_time = serializers.CharField(required=False, allow_blank=True, default="")
    provider_id = serializers.CharField(required=False, allow_blank=True, default="")
    borough = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if (attrs.get("lat") is None) != (attrs.get("lon") is None):
            raise ValidationError("lat and lng must both be present or both be omitted.")
        return attrs


class RouteCreateSerializer(serializers.Serializer):  # type: ignore[type-arg]
    name = serializers.CharField()
    date = serializers.DateField()
    stops = RouteStopInputSerializer(many=True, allow_empty=False)


class RouteStopFlatSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Flat stop shape matching the frontend's RouteStop type, field for field."""

    route_id = serializers.IntegerField(source="route.id")
    route_name = serializers.CharField(source="route.name")
    route_date = serializers.DateField(source="route.date")
    sequence = serializers.IntegerField(source="order")
    lng = serializers.FloatField(source="lon")

    class Meta:
        model = RouteStop
        fields = [
            "id",
            "route_id",
            "route_name",
            "route_date",
            "recipient_name",
            "address",
            "borough",
            "lat",
            "lng",
            "floor",
            "scheduled_time",
            "provider_id",
            "sequence",
        ]


class ProximityAlertSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """Matches the frontend's ProximityAlert type."""

    id = serializers.CharField()
    stop_id = serializers.IntegerField()
    outage_id = serializers.CharField()
    distance_miles = serializers.FloatField()
    severity = serializers.CharField()
    suggested_action = serializers.CharField()


class ProviderSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """DFTA provider shape for GET /api/providers/ — matches Mitra's Provider type."""

    id = serializers.CharField(source="provider_id")
    lng = serializers.FloatField(source="lon")

    class Meta:
        model = DFTAProvider
        fields = ["id", "name", "borough", "address", "lat", "lng"]


class AtRiskStopSerializer(serializers.Serializer):  # type: ignore[type-arg]
    """One (stop, nearby active outage) match for GET /api/alerts/at-risk/."""

    stop = RouteStopFlatSerializer()
    alert = ProximityAlertSerializer()
    outage = EnrichedOutageSerializer()
    provider = ProviderSerializer(allow_null=True)


class BuildingRiskScoreSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    class Meta:
        model = BuildingRiskScore
        fields = [
            "bin",
            "house_number",
            "house_street",
            "zip_code",
            "community_board",
            "lat",
            "lon",
            "complaints_1yr",
            "complaints_3yr",
            "is_chronic",
            "vulnerability_score",
            "score_provider",
            "score_center",
            "score_heat_cb",
            "heat_ratio",
            "pearson_r",
            "pearson_p",
            "n_complaints_analyzed",
            "confidence",
            "is_single_elevator",
            "elevator_count_override",
        ]


class BuildingUpdateSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """Write serializer for PATCH /api/buildings/<bin>/."""

    class Meta:
        model = BuildingRiskScore
        fields = ["elevator_count_override"]

    def validate_elevator_count_override(self, value: int | None) -> int | None:
        if value is not None and value < 1:
            raise ValidationError("Must be a positive integer (1 = single elevator).")
        return value
