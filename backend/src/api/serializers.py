import datetime
from typing import Any

from rest_framework import serializers

from api.models import BuildingRiskScore, Route, RouteStop


class OutageSerializer(serializers.Serializer):  # type: ignore[type-arg]
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


class RouteStopSerializer(serializers.ModelSerializer):  # type: ignore[type-arg]
    outage_alerts = serializers.SerializerMethodField()

    class Meta:
        model = RouteStop
        fields = ["id", "address", "lat", "lon", "order", "outage_alerts"]

    def get_outage_alerts(self, obj: RouteStop) -> list[dict[str, Any]]:
        alerts_by_id: dict[int, list[dict[str, Any]]] = self.context.get("alerts_by_stop_id", {})
        alerts = alerts_by_id.get(obj.pk, [])
        return OutageSerializer(alerts, many=True).data  # type: ignore[return-value]


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
            "scored_at",
        ]
