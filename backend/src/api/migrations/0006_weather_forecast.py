from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0005_provider_borough_address"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeatherForecast",
            fields=[
                ("date", models.DateField(primary_key=True, serialize=False)),
                ("temp_max_f", models.FloatField()),
                ("fetched_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "weather_forecasts",
            },
        ),
    ]
