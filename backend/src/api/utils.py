OUTAGE_RADIUS_M = 804.67  # 0.5 miles
METERS_PER_MILE = 1609.34


def _chunks(items: list[str], size: int) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]
