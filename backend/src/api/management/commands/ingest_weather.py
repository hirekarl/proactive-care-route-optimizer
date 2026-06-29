import datetime

import httpx
from django.core.management.base import BaseCommand
from django.db import transaction

from api.models import WeatherDay

OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"
ANALYSIS_START = "2018-01-01"
# NYC centroid (used for all borough-level weather — variance within the city is negligible)
NYC_LAT = 40.7128
NYC_LON = -74.0060


class Command(BaseCommand):
    help = "Ingest daily weather from Open-Meteo archive (2018–today) into weather_days table."

    def handle(self, *args: object, **options: object) -> None:
        end_date = datetime.date.today().isoformat()
        self.stdout.write(f"Fetching Open-Meteo archive {ANALYSIS_START} → {end_date}...")

        resp = httpx.get(
            OPEN_METEO_URL,
            params={
                "latitude": NYC_LAT,
                "longitude": NYC_LON,
                "start_date": ANALYSIS_START,
                "end_date": end_date,
                "daily": "temperature_2m_max",
                # timezone is required — without it dates are UTC and misalign with complaint dates
                "timezone": "America/New_York",
                # temperature_unit is required — default is Celsius; threshold is 90 °F
                "temperature_unit": "fahrenheit",
            },
            timeout=60.0,
        )
        resp.raise_for_status()
        raw = resp.json()

        dates = raw["daily"]["time"]
        temps = raw["daily"]["temperature_2m_max"]

        rows = [
            WeatherDay(date=d, temp_max_f=t)
            for d, t in zip(dates, temps, strict=True)
            if t is not None
        ]

        with transaction.atomic():
            WeatherDay.objects.all().delete()
            WeatherDay.objects.bulk_create(rows, batch_size=500)

        self.stdout.write(self.style.SUCCESS(f"  {len(rows)} weather days stored."))
