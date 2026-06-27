from django.db import models


class ElevatorComplaint(models.Model):
    complaint_number = models.TextField(primary_key=True)
    bin = models.TextField(db_index=True)
    house_number = models.TextField(blank=True)
    house_street = models.TextField(blank=True)
    zip_code = models.TextField(blank=True)
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
