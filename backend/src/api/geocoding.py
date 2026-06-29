import httpx


def geocode_address(address: str) -> tuple[float, float] | None:
    """Return (lon, lat) via NYC Planning GeoSearch, or None on miss."""
    try:
        response = httpx.get(
            "https://geosearch.planninglabs.nyc/v2/search",
            params={"text": address, "size": 1},
            timeout=10.0,
        )
        response.raise_for_status()
        features = response.json().get("features", [])
        if not features:
            return None
        lon, lat = features[0]["geometry"]["coordinates"]
        return float(lon), float(lat)
    except Exception:
        return None
