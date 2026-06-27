from django.db import models


class ElevatorComplaint(models.Model):
    complaint_number = models.TextField(primary_key=True)
    bin = models.TextField(db_index=True)
    house_number = models.TextField(blank=True)
    house_street = models.TextField(blank=True)
    zip_code = models.TextField(blank=True)
    community_board = models.TextField(blank=True, db_index=True)
    date_entered = models.DateField(null=True)
    status = models.TextField(db_index=True)  # 'ACTIVE' or 'CLOSED'
    lat = models.FloatField()
    lon = models.FloatField()
    fetched_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "elevator_complaints"


class Route(models.Model):
    name = models.TextField()
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "routes"


class RouteStop(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name="stops")
    address = models.TextField()
    lat = models.FloatField(null=True)
    lon = models.FloatField(null=True)
    order = models.PositiveIntegerField()

    class Meta:
        db_table = "route_stops"
        ordering = ["order"]


class WeatherDay(models.Model):
    """One row per calendar day from Open-Meteo archive (NYC, America/New_York)."""

    date = models.DateField(primary_key=True)
    temp_max_f = models.FloatField()
    precip_mm = models.FloatField(null=True)

    class Meta:
        db_table = "weather_days"


class DFTAProvider(models.Model):
    """DFTA-contracted provider location."""

    provider_id = models.TextField(primary_key=True)
    name = models.TextField(blank=True)
    lat = models.FloatField()
    lon = models.FloatField()

    class Meta:
        db_table = "dfta_providers"


class DFTASeniorCenter(models.Model):
    """DFTA senior center location (NYC Open Data ygfr-ij6t)."""

    center_id = models.TextField(primary_key=True)
    name = models.TextField(blank=True)
    community_board = models.TextField(blank=True)
    lat = models.FloatField()
    lon = models.FloatField()

    class Meta:
        db_table = "dfta_senior_centers"


class BuildingRiskScore(models.Model):
    """Composite vulnerability score and heat correlation metrics per building (BIN)."""

    bin = models.TextField(primary_key=True)
    house_number = models.TextField(blank=True)
    house_street = models.TextField(blank=True)
    zip_code = models.TextField(blank=True)
    community_board = models.TextField(blank=True, db_index=True)
    lat = models.FloatField()
    lon = models.FloatField()

    complaints_1yr = models.IntegerField()
    complaints_3yr = models.IntegerField()
    is_chronic = models.BooleanField(db_index=True)

    # 0–3 composite vulnerability score
    vulnerability_score = models.SmallIntegerField(db_index=True)
    score_provider = models.SmallIntegerField()  # 1 if provider within 0.5 mi
    score_center = models.SmallIntegerField()  # 1 if senior center within 0.5 mi
    score_heat_cb = models.SmallIntegerField()  # 1 if CB in top heat tercile

    # Per-building heat correlation (None when insufficient data)
    heat_ratio = models.FloatField(null=True)
    pearson_r = models.FloatField(null=True)
    pearson_p = models.FloatField(null=True)
    n_complaints_analyzed = models.IntegerField()
    confidence = models.TextField()  # 'high' | 'medium' | 'low'

    scored_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "building_risk_scores"
