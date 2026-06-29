from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [("api", "0006_weather_forecast")]

    operations = [
        migrations.RemoveField(model_name="weatherday", name="precip_mm"),
        migrations.RemoveField(model_name="route", name="created_at"),
        migrations.RemoveField(model_name="weatherforecast", name="fetched_at"),
        migrations.RemoveField(model_name="dftaseniorcenter", name="community_board"),
        migrations.RemoveField(model_name="buildingriskscore", name="scored_at"),
    ]
