import datetime
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
        fields = ["id", "name", "date", "created_at", "stops"]


class RouteCreateSerializer(serializers.Serializer):  # type: ignore[type-arg]
    name = serializers.CharField()
    date = serializers.DateField()
    stops = serializers.ListField(child=serializers.CharField(), min_length=1)

    def validate_date(self, value: datetime.date) -> datetime.date:
        return value


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
            "scored_at",
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


class ProviderSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    """DFTA provider shape for GET /api/providers/ — matches Mitra's Provider type."""

    id = serializers.CharField(source="provider_id")
    lng = serializers.FloatField(source="lon")
    # Fields not yet in our data model — stubbed; see docs/deferred-frontend-api-gaps.md
    borough = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    seniors_served = serializers.SerializerMethodField()

    class Meta:
        model = DFTAProvider
        fields = ["id", "name", "borough", "address", "lat", "lng", "seniors_served"]

    def get_borough(self, obj: DFTAProvider) -> str:
        return ""

    def get_address(self, obj: DFTAProvider) -> str:
        return ""

    def get_seniors_served(self, obj: DFTAProvider) -> int:
        return 0
