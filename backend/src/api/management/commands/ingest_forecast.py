"""Fetch 7-day temperature forecast from Open-Meteo into weather_forecasts table."""

import httpx
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import WeatherForecast

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
# NYC centroid — same coordinates used by ingest_weather
NYC_LAT = 40.7128
NYC_LON = -74.0060


class Command(BaseCommand):
    help = "Fetch 7-day temperature forecast from Open-Meteo into weather_forecasts table."

    def handle(self, *args: object, **options: object) -> None:
        self.stdout.write("Fetching Open-Meteo 7-day forecast...")

        resp = httpx.get(
            OPEN_METEO_FORECAST_URL,
            params={
                "latitude": NYC_LAT,
                "longitude": NYC_LON,
                "daily": "temperature_2m_max",
                # timezone and temperature_unit are required — not defaults
                "timezone": "America/New_York",
                "temperature_unit": "fahrenheit",
                "forecast_days": 7,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        raw = resp.json()

        dates = raw["daily"]["time"]
        temps = raw["daily"]["temperature_2m_max"]

        rows = [
            WeatherForecast(date=d, temp_max_f=t if t is not None else 0.0)
            for d, t in zip(dates, temps, strict=True)
        ]

        with transaction.atomic():
            WeatherForecast.objects.all().delete()
            WeatherForecast.objects.bulk_create(rows)

        self.stdout.write(self.style.SUCCESS(f"  {len(rows)} forecast days stored."))
