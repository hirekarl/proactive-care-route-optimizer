import httpx
from django.core.management.base import BaseCommand
from django.db import connection

COMPLIANCE_URL = "https://data.cityofnewyork.us/resource/e5aq-a4j2.json"
DEVICE_DETAILS_URL = "https://data.cityofnewyork.us/resource/juyv-2jek.json"
# Socrata IN() clauses become URL query strings — keep chunks small enough to avoid 414s.
CHUNK_SIZE = 300


class Command(BaseCommand):
    help = "Populate building_risk_scores.is_single_elevator from DOB elevator device data."

    def handle(self, *args: object, **options: object) -> None:
        token = self._get_token()
        headers = {"X-App-Token": token} if token else {}

        with connection.cursor() as cursor:
            cursor.execute("SELECT bin FROM building_risk_scores")
            bins: list[str] = [row[0] for row in cursor.fetchall()]

        self.stdout.write(f"Looking up elevator devices for {len(bins)} buildings...")

        # Phase 1: e5aq-a4j2 — bin → list of device_numbers for active elevators
        bin_to_devices: dict[str, list[str]] = {}
        for chunk in _chunks(bins, CHUNK_SIZE):
            bin_csv = ", ".join(f"'{b}'" for b in chunk)
            rows = _fetch(
                COMPLIANCE_URL,
                {
                    "$where": (
                        f"bin IN ({bin_csv}) AND device_type='Elevator' AND device_status='Active'"
                    ),
                    "$select": "bin,device_number",
                    "$limit": str(CHUNK_SIZE * 20),
                },
                headers,
            )
            for row in rows:
                b = row.get("bin")
                d = row.get("device_number")
                if b and d:
                    bin_to_devices.setdefault(b, []).append(d)

        all_device_numbers = list({d for devs in bin_to_devices.values() for d in devs})
        self.stdout.write(
            f"  {len(all_device_numbers)} elevator device numbers found across"
            f" {len(bin_to_devices)} buildings."
        )

        # Phase 2: juyv-2jek — device_number → only_elevator_in_building ('Yes'/'No'/absent)
        # Socrata omits null fields entirely — a missing key means unknown, not 'No'.
        device_flag: dict[str, str] = {}
        for chunk in _chunks(all_device_numbers, CHUNK_SIZE):
            id_csv = ", ".join(f"'{d}'" for d in chunk)
            rows = _fetch(
                DEVICE_DETAILS_URL,
                {
                    "$where": (f"bis_nyc_device_id IN ({id_csv}) AND device_status='Active'"),
                    "$select": "bis_nyc_device_id,only_elevator_in_building",
                    "$limit": str(CHUNK_SIZE * 10),
                },
                headers,
            )
            for row in rows:
                did = row.get("bis_nyc_device_id")
                flag = row.get("only_elevator_in_building")
                # only_elevator_in_building is consistent per building; first seen wins.
                if did and did not in device_flag and flag is not None:
                    device_flag[did] = flag

        # Phase 3: derive is_single_elevator per BIN
        # 'Yes' for any known device → True; 'No' → False; all unknown → None.
        updates: list[tuple[bool | None, str]] = []
        for bin_id in bins:
            devices = bin_to_devices.get(bin_id, [])
            if not devices:
                updates.append((None, bin_id))
                continue
            flags = [device_flag.get(d) for d in devices]
            known = [f for f in flags if f is not None]
            if "Yes" in known:
                updates.append((True, bin_id))
            elif "No" in known:
                updates.append((False, bin_id))
            else:
                updates.append((None, bin_id))

        with connection.cursor() as cursor:
            cursor.executemany(
                "UPDATE building_risk_scores SET is_single_elevator = %s WHERE bin = %s",
                updates,
            )

        known_count = sum(1 for v, _ in updates if v is not None)
        single_count = sum(1 for v, _ in updates if v is True)
        self.stdout.write(
            f"  Updated {len(updates)} buildings:"
            f" {single_count} single-elevator, {known_count - single_count} multi-elevator,"
            f" {len(updates) - known_count} unknown."
        )
        self.stdout.write(self.style.SUCCESS("Elevator device ingest complete."))

    def _get_token(self) -> str:
        from decouple import config as env_config

        return str(env_config("SOCRATA_APP_TOKEN", default=""))


def _chunks(items: list[str], size: int) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _fetch(url: str, params: dict[str, str], headers: dict[str, str]) -> list[dict[str, str]]:
    response = httpx.get(url, params=params, headers=headers, timeout=30.0)
    response.raise_for_status()
    return response.json()  # type: ignore[no-any-return]
