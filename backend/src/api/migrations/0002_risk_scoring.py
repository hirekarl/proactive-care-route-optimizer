from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        # Add community_board to ElevatorComplaint (missed in 0001).
        migrations.AddField(
            model_name="elevatorComplaint",
            name="community_board",
            field=models.TextField(blank=True, db_index=True),
        ),
        migrations.CreateModel(
            name="WeatherDay",
            fields=[
                ("date", models.DateField(primary_key=True, serialize=False)),
                ("temp_max_f", models.FloatField()),
                ("precip_mm", models.FloatField(null=True)),
            ],
            options={"db_table": "weather_days"},
        ),
        migrations.CreateModel(
            name="DFTAProvider",
            fields=[
                ("provider_id", models.TextField(primary_key=True, serialize=False)),
                ("name", models.TextField(blank=True)),
                ("lat", models.FloatField()),
                ("lon", models.FloatField()),
            ],
            options={"db_table": "dfta_providers"},
        ),
        migrations.CreateModel(
            name="DFTASeniorCenter",
            fields=[
                ("center_id", models.TextField(primary_key=True, serialize=False)),
                ("name", models.TextField(blank=True)),
                ("community_board", models.TextField(blank=True)),
                ("lat", models.FloatField()),
                ("lon", models.FloatField()),
            ],
            options={"db_table": "dfta_senior_centers"},
        ),
        migrations.CreateModel(
            name="BuildingRiskScore",
            fields=[
                ("bin", models.TextField(primary_key=True, serialize=False)),
                ("house_number", models.TextField(blank=True)),
                ("house_street", models.TextField(blank=True)),
                ("zip_code", models.TextField(blank=True)),
                ("community_board", models.TextField(blank=True, db_index=True)),
                ("lat", models.FloatField()),
                ("lon", models.FloatField()),
                ("complaints_1yr", models.IntegerField()),
                ("complaints_3yr", models.IntegerField()),
                ("is_chronic", models.BooleanField(db_index=True)),
                ("vulnerability_score", models.SmallIntegerField(db_index=True)),
                ("score_provider", models.SmallIntegerField()),
                ("score_center", models.SmallIntegerField()),
                ("score_heat_cb", models.SmallIntegerField()),
                ("heat_ratio", models.FloatField(null=True)),
                ("pearson_r", models.FloatField(null=True)),
                ("pearson_p", models.FloatField(null=True)),
                ("n_complaints_analyzed", models.IntegerField()),
                ("confidence", models.TextField()),
                ("scored_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "building_risk_scores"},
        ),
        # PostGIS geometry columns + GIST indexes for DFTA proximity queries.
        migrations.RunSQL(
            sql=[
                "ALTER TABLE dfta_providers ADD COLUMN location geometry(Point, 4326);",
                "UPDATE dfta_providers SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326);",
                "CREATE INDEX dfta_providers_location_gist"
                " ON dfta_providers USING GIST (location);",
                "ALTER TABLE dfta_senior_centers ADD COLUMN location geometry(Point, 4326);",
                "UPDATE dfta_senior_centers"
                " SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326);",
                "CREATE INDEX dfta_senior_centers_location_gist"
                " ON dfta_senior_centers USING GIST (location);",
                "ALTER TABLE building_risk_scores ADD COLUMN location geometry(Point, 4326);",
                "UPDATE building_risk_scores"
                " SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326);",
                "CREATE INDEX building_risk_scores_location_gist"
                " ON building_risk_scores USING GIST (location);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS building_risk_scores_location_gist;",
                "ALTER TABLE building_risk_scores DROP COLUMN IF EXISTS location;",
                "DROP INDEX IF EXISTS dfta_senior_centers_location_gist;",
                "ALTER TABLE dfta_senior_centers DROP COLUMN IF EXISTS location;",
                "DROP INDEX IF EXISTS dfta_providers_location_gist;",
                "ALTER TABLE dfta_providers DROP COLUMN IF EXISTS location;",
            ],
        ),
    ]
