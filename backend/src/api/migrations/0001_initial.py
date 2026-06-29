import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies: list[tuple[str, str]] = []  # type: ignore[misc]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS postgis;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.CreateModel(
            name="ElevatorComplaint",
            fields=[
                ("complaint_number", models.TextField(primary_key=True, serialize=False)),
                ("bin", models.TextField(db_index=True)),
                ("house_number", models.TextField(blank=True)),
                ("house_street", models.TextField(blank=True)),
                ("zip_code", models.TextField(blank=True)),
                ("date_entered", models.DateField(null=True)),
                ("status", models.TextField(db_index=True)),
                ("lat", models.FloatField()),
                ("lon", models.FloatField()),
                ("fetched_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "elevator_complaints",
            },
        ),
        # Add a PostGIS geometry column and GIST index for proximity queries.
        # The location column is kept in sync by the ingest command.
        migrations.RunSQL(
            sql=[
                "ALTER TABLE elevator_complaints ADD COLUMN location geometry(Point, 4326);",
                "CREATE INDEX elevator_complaints_location_gist "
                "ON elevator_complaints USING GIST (location);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS elevator_complaints_location_gist;",
                "ALTER TABLE elevator_complaints DROP COLUMN IF EXISTS location;",
            ],
        ),
        migrations.CreateModel(
            name="Route",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.TextField()),
                ("date", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "routes",
            },
        ),
        migrations.CreateModel(
            name="RouteStop",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "route",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stops",
                        to="api.route",
                    ),
                ),
                ("address", models.TextField()),
                ("lat", models.FloatField(null=True)),
                ("lon", models.FloatField(null=True)),
                ("order", models.PositiveIntegerField()),
            ],
            options={
                "db_table": "route_stops",
                "ordering": ["order"],
            },
        ),
    ]
