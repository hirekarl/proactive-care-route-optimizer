import datetime

import httpx
from django.core.management.base import BaseCommand
from django.db import connection, transaction

from api.geocoding import geocode_address
from api.models import ElevatorComplaint
from api.utils import _chunks

COMPLAINTS_URL = "https://data.cityofnewyork.us/resource/kqwi-7ncn.json"
DEVICES_URL = "https://data.cityofnewyork.us/resource/e5aq-a4j2.json"
PAGE_SIZE = 50000
# Socrata IN() clauses become URL query strings — keep chunks small enough to avoid 414s.
CHUNK_SIZE = 300


def _parse_dob_date(raw: str) -> datetime.date | None:
    """Parse MM/DD/YYYY text date from NYC Open Data."""
    try:
        return datetime.datetime.strptime(raw, "%m/%d/%Y").date()
    except (ValueError, TypeError):
        return None


class Command(BaseCommand):
    help = "Ingest active elevator complaints from NYC Open Data."

    def handle(self, *args: object, **options: object) -> None:
        token = self._get_token()
        headers = {"X-App-Token": token} if token else {}

        self.stdout.write("Fetching active elevator complaints...")
        rows = self._fetch_all_active(headers)
        self.stdout.write(f"  {len(rows)} active complaints fetched.")

        bins = {row["bin"] for row in rows if row.get("bin")}
        self.stdout.write(f"  {len(bins)} unique BINs to resolve.")
        coords = self._resolve_coords(bins, headers)
        self.stdout.write(f"  {len(coords)} BINs resolved via device registry.")

        all_incoming = {r.get("complaint_number") for r in rows if r.get("complaint_number")}
        existing_active = set(
            ElevatorComplaint.objects.filter(status="ACTIVE").values_list(
                "complaint_number", flat=True
            )
        )
        # Geocode outside the transaction — Nominatim calls can take seconds each, and holding
        # an open transaction for HTTP round-trips risks idle-in-transaction timeouts on Neon.
        seen_bins: set[str] = set()
        for row in rows:
            bin_val = row.get("bin", "")
            if not bin_val or bin_val in coords or bin_val in seen_bins:
                continue
            seen_bins.add(bin_val)
            address_parts = [
                row.get("house_number", ""),
                row.get("house_street", ""),
                "New York NY",
                row.get("zip_code", ""),
            ]
            address = " ".join(p for p in address_parts if p)
            lonlat = geocode_address(address)
            if lonlat is not None:
                coords[bin_val] = lonlat

        incoming_numbers = set()

        with transaction.atomic():
            for row in rows:
                complaint_number = row.get("complaint_number")
                bin_val = row.get("bin", "")
                if not complaint_number or not bin_val:
                    continue

                lonlat = coords.get(bin_val)
                if lonlat is None:
                    continue

                lon, lat = lonlat
                incoming_numbers.add(complaint_number)

                ElevatorComplaint.objects.update_or_create(
                    complaint_number=complaint_number,
                    defaults={
                        "bin": bin_val,
                        "house_number": row.get("house_number", ""),
                        "house_street": row.get("house_street", ""),
                        "zip_code": row.get("zip_code", ""),
                        "community_board": row.get("community_board", ""),
                        "date_entered": _parse_dob_date(row.get("date_entered", "")),
                        "status": "ACTIVE",
                        "lat": lat,
                        "lon": lon,
                    },
                )

            stale = existing_active - all_incoming
            if stale:
                ElevatorComplaint.objects.filter(complaint_number__in=stale).update(status="CLOSED")
                self.stdout.write(f"  {len(stale)} complaints marked CLOSED.")

            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE elevator_complaints"
                    " SET location = ST_SetSRID(ST_MakePoint(lon, lat), 4326)"
                    " WHERE location IS NULL"
                )

        self.stdout.write(f"  {len(incoming_numbers)} complaints upserted.")
        self.stdout.write(self.style.SUCCESS("Ingest complete."))

    def _get_token(self) -> str:
        from decouple import config as env_config

        return str(env_config("SOCRATA_APP_TOKEN", default=""))

    def _fetch_all_active(self, headers: dict[str, str]) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        offset = 0
        while True:
            response = httpx.get(
                COMPLAINTS_URL,
                params={
                    "$where": "status='ACTIVE' AND complaint_category='13'",
                    "$select": (
                        "complaint_number,bin,house_number,house_street,"
                        "zip_code,date_entered,community_board"
                    ),
                    "$limit": PAGE_SIZE,
                    "$offset": offset,
                },
                headers=headers,
                timeout=30.0,
            )
            response.raise_for_status()
            page: list[dict[str, str]] = response.json()
            rows.extend(page)
            if len(page) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
        return rows

    def _resolve_coords(
        self, bins: set[str], headers: dict[str, str]
    ) -> dict[str, tuple[float, float]]:
        """Return {bin: (lon, lat)} for BINs found in the device registry."""
        if not bins:
            return {}

        coords: dict[str, tuple[float, float]] = {}
        for chunk in _chunks(list(bins), CHUNK_SIZE):
            bin_csv = ",".join(f"'{b}'" for b in chunk)
            offset = 0
            while True:
                response = httpx.get(
                    DEVICES_URL,
                    params={
                        "$where": (
                            f"bin IN({bin_csv})"
                            " AND device_type='Elevator' AND device_status='Active'"
                        ),
                        "$select": "bin,latitude,longitude",
                        "$limit": PAGE_SIZE,
                        "$offset": offset,
                    },
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                page: list[dict[str, str]] = response.json()
                for row in page:
                    bin_val = row.get("bin")
                    lat_str = row.get("latitude")
                    lon_str = row.get("longitude")
                    if bin_val and lat_str and lon_str and bin_val not in coords:
                        coords[bin_val] = (float(lon_str), float(lat_str))
                if len(page) < PAGE_SIZE:
                    break
                offset += PAGE_SIZE
        return coords
