"""Ingest DFTA senior center and provider locations from NYC Open Data."""

import httpx
from django.core.management.base import BaseCommand, CommandParser
from django.db import connection, transaction

from api.geocoding import geocode_address
from api.models import DFTAProvider, DFTASeniorCenter

SENIOR_CENTERS_URL = "https://data.cityofnewyork.us/resource/ygfr-ij6t.json"
PAGE_SIZE = 50000


class Command(BaseCommand):
    help = "Ingest DFTA senior center and provider locations from NYC Open Data."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--provider-dataset",
            default="",
            help=(
                "Socrata resource ID for the DFTA provider directory "
                "(e.g. cwsm-2ns3). Set DFTA_PROVIDER_DATASET_ID env var "
                "or pass --provider-dataset to enable provider ingestion."
            ),
        )

    def handle(self, *args: object, **options: object) -> None:
        from decouple import config as env_config

        token = str(env_config("SOCRATA_APP_TOKEN", default=""))
        headers = {"X-App-Token": token} if token else {}

        self._ingest_senior_centers(headers)

        provider_dataset = str(options.get("provider_dataset") or "").strip()
        if not provider_dataset:
            provider_dataset = str(env_config("DFTA_PROVIDER_DATASET_ID", default="")).strip()

        if provider_dataset:
            self._ingest_providers(provider_dataset, headers)
        else:
            self.stdout.write(
                self.style.WARNING(
                    "No DFTA provider dataset ID supplied — skipping provider ingestion.\n"
                    "Set DFTA_PROVIDER_DATASET_ID in .env or pass --provider-dataset."
                )
            )

    def _ingest_senior_centers(self, headers: dict[str, str]) -> None:
        self.stdout.write("Fetching DFTA senior centers (ygfr-ij6t)...")
        rows = self._fetch_all(SENIOR_CENTERS_URL, headers)
        self.stdout.write(f"  {len(rows)} rows fetched.")

        centers: list[DFTASeniorCenter] = []
        for row in rows:
            center_id = row.get("facilityid") or row.get("bin") or row.get("objectid")
            if not center_id:
                continue
            lonlat = self._coords_from_row(row, headers)
            if lonlat is None:
                continue
            lon, lat = lonlat
            # Note: source data has typo 'comminuty_board' (missing second 'n')
            cb = row.get("comminuty_board") or row.get("community_board", "")
            centers.append(
                DFTASeniorCenter(
                    center_id=str(center_id),
                    name=row.get("name", ""),
                    community_board=str(cb),
                    lat=lat,
                    lon=lon,
                )
            )

        with transaction.atomic():
            DFTASeniorCenter.objects.all().delete()
            DFTASeniorCenter.objects.bulk_create(centers, batch_size=200)
            # Populate PostGIS geometry column after bulk insert
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE dfta_senior_centers"
                    " SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)"
                )

        self.stdout.write(self.style.SUCCESS(f"  {len(centers)} senior centers stored."))

    def _ingest_providers(self, dataset_id: str, headers: dict[str, str]) -> None:
        url = f"https://data.cityofnewyork.us/resource/{dataset_id}.json"
        self.stdout.write(f"Fetching DFTA providers ({dataset_id})...")
        rows = self._fetch_all(url, headers)
        self.stdout.write(f"  {len(rows)} rows fetched.")

        providers: list[DFTAProvider] = []
        for row in rows:
            provider_id = (
                row.get("contractid")
                or row.get("provider_id")
                or row.get("facilityid")
                or row.get("objectid")
            )
            if not provider_id:
                continue
            lonlat = self._coords_from_row(row, headers)
            if lonlat is None:
                continue
            lon, lat = lonlat
            providers.append(
                DFTAProvider(
                    provider_id=str(provider_id),
                    name=row.get("provider_name") or row.get("name", ""),
                    lat=lat,
                    lon=lon,
                )
            )

        with transaction.atomic():
            DFTAProvider.objects.all().delete()
            DFTAProvider.objects.bulk_create(providers, batch_size=200)
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE dfta_providers SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)"
                )

        self.stdout.write(self.style.SUCCESS(f"  {len(providers)} providers stored."))

    def _coords_from_row(
        self, row: dict[str, str], headers: dict[str, str]
    ) -> tuple[float, float] | None:
        lat_str = row.get("latitude") or row.get("lat")
        lon_str = row.get("longitude") or row.get("lon")
        if lat_str and lon_str:
            try:
                return float(lon_str), float(lat_str)
            except ValueError:
                pass
        # Fallback: geocode from address fields
        parts = [
            row.get("address")
            or ((row.get("house_number") or "") + " " + (row.get("street_name") or "")).strip(),
            row.get("borough", ""),
            "NY",
        ]
        address = " ".join(p for p in parts if p)
        return geocode_address(address)

    def _fetch_all(self, url: str, headers: dict[str, str]) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        offset = 0
        while True:
            resp = httpx.get(
                url,
                params={"$limit": PAGE_SIZE, "$offset": offset},
                headers=headers,
                timeout=30.0,
            )
            resp.raise_for_status()
            page: list[dict[str, str]] = resp.json()
            rows.extend(page)
            if len(page) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
        return rows
