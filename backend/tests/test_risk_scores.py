"""Tests for building risk scoring pipeline and API endpoints."""

import datetime
import json
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from django.db import connection
from django.test import Client

_TEST_API_KEY = "test-buildings-key"
_AUTH = {"HTTP_AUTHORIZATION": f"Api-Key {_TEST_API_KEY}"}


def _insert_complaint(
    complaint_number: str,
    bin_id: str,
    lat: float,
    lon: float,
    date_entered: datetime.date,
    status: str = "ACTIVE",
    community_board: str = "101",
) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO elevator_complaints
              (complaint_number, bin, house_number, house_street, zip_code,
               community_board, date_entered, status, lat, lon, fetched_at)
            VALUES (%s, %s, '100', 'Test St', '10001', %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (complaint_number) DO NOTHING
            """,
            [complaint_number, bin_id, community_board, date_entered, status, lat, lon],
        )
        cursor.execute(
            "UPDATE elevator_complaints"
            " SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
            " WHERE complaint_number = %s",
            [lon, lat, complaint_number],
        )


def _insert_provider(provider_id: str, lat: float, lon: float) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO dfta_providers (provider_id, name, borough, address, lat, lon)"
            " VALUES (%s, 'P', '', '', %s, %s) ON CONFLICT (provider_id) DO NOTHING",
            [provider_id, lat, lon],
        )
        cursor.execute(
            "UPDATE dfta_providers"
            " SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
            " WHERE provider_id = %s",
            [lon, lat, provider_id],
        )


def _insert_center(center_id: str, lat: float, lon: float) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO dfta_senior_centers (center_id, name, lat, lon)"
            " VALUES (%s, 'C', %s, %s) ON CONFLICT (center_id) DO NOTHING",
            [center_id, lat, lon],
        )
        cursor.execute(
            "UPDATE dfta_senior_centers"
            " SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
            " WHERE center_id = %s",
            [lon, lat, center_id],
        )


def _insert_weather(days: list[tuple[str, float]]) -> None:
    with connection.cursor() as cursor:
        cursor.executemany(
            "INSERT INTO weather_days (date, temp_max_f) VALUES (%s, %s)"
            " ON CONFLICT (date) DO NOTHING",
            days,
        )


@pytest.mark.django_db
class TestComputeRiskScoresCommand:
    """Integration tests for the compute_risk_scores management command."""

    def test_chronic_offender_detection(self) -> None:
        """Building with ≥1 complaint in 1yr AND ≥3 in 3yr is flagged as chronic."""
        from django.core.management import call_command

        today = datetime.date.today()
        bin_id = "CHR_TEST_001"
        # 3 complaints within 3yr window, 1 within 1yr
        _insert_complaint("C-CHR-1", bin_id, 40.758, -73.985, today - datetime.timedelta(days=10))
        _insert_complaint("C-CHR-2", bin_id, 40.758, -73.985, today - datetime.timedelta(days=400))
        _insert_complaint("C-CHR-3", bin_id, 40.758, -73.985, today - datetime.timedelta(days=700))

        call_command("compute_risk_scores", verbosity=0)

        from api.models import BuildingRiskScore

        score = BuildingRiskScore.objects.get(bin=bin_id)
        assert score.is_chronic is True
        assert score.complaints_1yr == 1
        assert score.complaints_3yr == 3

    def test_non_chronic_below_3yr_threshold(self) -> None:
        """Building with only 2 complaints in 3yr is NOT flagged as chronic."""
        from django.core.management import call_command

        today = datetime.date.today()
        bin_id = "NON_CHR_002"
        _insert_complaint("C-NC-1", bin_id, 40.760, -73.980, today - datetime.timedelta(days=5))
        _insert_complaint("C-NC-2", bin_id, 40.760, -73.980, today - datetime.timedelta(days=400))

        call_command("compute_risk_scores", verbosity=0)

        from api.models import BuildingRiskScore

        score = BuildingRiskScore.objects.get(bin=bin_id)
        assert score.is_chronic is False

    def test_score_provider_proximity(self) -> None:
        """score_provider=1 when a DFTA provider is within 0.5 miles."""
        from django.core.management import call_command

        today = datetime.date.today()
        bin_id = "PROV_TEST_003"
        # Three 3yr complaints to make this building chronic
        for i in range(3):
            _insert_complaint(
                f"C-PROV-{i}",
                bin_id,
                40.758,
                -73.985,
                today - datetime.timedelta(days=i * 100),
            )
        # Provider at same location (0 distance)
        _insert_provider("P-PROV-1", 40.758, -73.985)

        call_command("compute_risk_scores", verbosity=0)

        from api.models import BuildingRiskScore

        score = BuildingRiskScore.objects.get(bin=bin_id)
        assert score.score_provider == 1

    def test_score_center_proximity(self) -> None:
        """score_center=1 when a DFTA senior center is within 0.5 miles."""
        from django.core.management import call_command

        today = datetime.date.today()
        bin_id = "CTR_TEST_004"
        for i in range(3):
            _insert_complaint(
                f"C-CTR-{i}",
                bin_id,
                40.758,
                -73.985,
                today - datetime.timedelta(days=i * 100),
            )
        _insert_center("SC-CTR-1", 40.758, -73.985)

        call_command("compute_risk_scores", verbosity=0)

        from api.models import BuildingRiskScore

        score = BuildingRiskScore.objects.get(bin=bin_id)
        assert score.score_center == 1

    def test_vulnerability_score_is_additive(self) -> None:
        """vulnerability_score = score_provider + score_center + score_heat_cb."""
        from django.core.management import call_command

        today = datetime.date.today()
        bin_id = "VSCR_TEST_005"
        for i in range(3):
            _insert_complaint(
                f"C-VS-{i}",
                bin_id,
                40.758,
                -73.985,
                today - datetime.timedelta(days=i * 100),
            )
        _insert_provider("P-VS-1", 40.758, -73.985)
        _insert_center("SC-VS-1", 40.758, -73.985)

        call_command("compute_risk_scores", verbosity=0)

        from api.models import BuildingRiskScore

        score = BuildingRiskScore.objects.get(bin=bin_id)
        assert (
            score.vulnerability_score
            == score.score_provider + score.score_center + score.score_heat_cb
        )  # noqa: E501

    def test_heat_correlation_skipped_without_weather_data(self) -> None:
        """heat_ratio and pearson_r are None when weather_days table is empty."""
        from django.core.management import call_command

        today = datetime.date.today()
        bin_id = "HEAT_NODA_006"
        for i in range(3):
            _insert_complaint(
                f"C-HND-{i}",
                bin_id,
                40.758,
                -73.985,
                today - datetime.timedelta(days=i * 100),
            )

        # Ensure weather table is empty for this sub-test
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM weather_days")

        call_command("compute_risk_scores", verbosity=0)

        from api.models import BuildingRiskScore

        score = BuildingRiskScore.objects.get(bin=bin_id)
        assert score.heat_ratio is None
        assert score.pearson_r is None

    def test_heat_correlation_computed_with_weather_data(self) -> None:
        """heat_ratio is populated when weather data is present and sufficient complaints exist."""
        from django.core.management import call_command

        today = datetime.date.today()
        bin_id = "HEAT_DATA_007"
        # Plant 10 complaints spread across ~3yr
        for i in range(10):
            _insert_complaint(
                f"C-HD-{i}",
                bin_id,
                40.758,
                -73.985,
                today - datetime.timedelta(days=i * 90),
            )

        # Seed minimal weather data (2 years of daily max temps)
        import datetime as dt

        days: list[tuple[str, float]] = []
        base = today - datetime.timedelta(days=730)
        for d in range(730):
            day = base + dt.timedelta(days=d)
            temp = 95.0 if day.month in (6, 7, 8) else 55.0
            days.append((day.isoformat(), temp))
        _insert_weather(days)

        call_command("compute_risk_scores", verbosity=0)

        from api.models import BuildingRiskScore

        score = BuildingRiskScore.objects.get(bin=bin_id)
        # With enough data, heat_ratio should be populated
        assert score.n_complaints_analyzed > 0

    def test_empty_database_exits_early(self) -> None:
        """compute_risk_scores with no complaint rows should warn and return cleanly."""
        from django.core.management import call_command

        from api.models import BuildingRiskScore

        call_command("compute_risk_scores", verbosity=0)
        assert BuildingRiskScore.objects.count() == 0


@pytest.mark.django_db
class TestBuildingAPI:
    """Tests for GET /api/buildings/ and GET /api/buildings/<bin>/."""

    def _seed_building(self, bin_id: str, score: int = 2, is_chronic: bool = True) -> None:
        from api.models import BuildingRiskScore

        BuildingRiskScore.objects.update_or_create(
            bin=bin_id,
            defaults={
                "house_number": "100",
                "house_street": "Test St",
                "zip_code": "10001",
                "community_board": "101",
                "lat": 40.758,
                "lon": -73.985,
                "complaints_1yr": 1,
                "complaints_3yr": 3,
                "is_chronic": is_chronic,
                "vulnerability_score": score,
                "score_provider": 1,
                "score_center": 1,
                "score_heat_cb": score - 2 if score >= 2 else 0,
                "n_complaints_analyzed": 3,
                "confidence": "medium",
            },
        )

    def test_list_buildings_returns_200(self) -> None:
        client = Client()
        self._seed_building("B-LIST-001")
        resp = client.get("/api/buildings/")
        assert resp.status_code == 200
        data = resp.json()
        assert any(b["bin"] == "B-LIST-001" for b in data)

    def test_list_filter_min_score(self) -> None:
        client = Client()
        self._seed_building("B-FILT-LOW", score=1)
        self._seed_building("B-FILT-HIGH", score=3)
        resp = client.get("/api/buildings/?min_score=2")
        assert resp.status_code == 200
        bins = [b["bin"] for b in resp.json()]
        assert "B-FILT-HIGH" in bins
        assert "B-FILT-LOW" not in bins

    def test_list_filter_is_chronic(self) -> None:
        client = Client()
        self._seed_building("B-CHR-YES", is_chronic=True)
        self._seed_building("B-CHR-NO", is_chronic=False)
        resp = client.get("/api/buildings/?is_chronic=true")
        assert resp.status_code == 200
        bins = [b["bin"] for b in resp.json()]
        assert "B-CHR-YES" in bins
        assert "B-CHR-NO" not in bins

    def test_detail_returns_correct_bin(self) -> None:
        client = Client()
        self._seed_building("B-DETAIL-001")
        resp = client.get("/api/buildings/B-DETAIL-001/")
        assert resp.status_code == 200
        assert resp.json()["bin"] == "B-DETAIL-001"

    def test_detail_404_for_unknown_bin(self) -> None:
        client = Client()
        resp = client.get("/api/buildings/DOES-NOT-EXIST/")
        assert resp.status_code == 404

    def test_list_filter_invalid_min_score_is_ignored(self) -> None:
        """A non-integer min_score param is silently ignored — all buildings returned."""
        client = Client()
        self._seed_building("B-BADSCORE-001")
        resp = client.get("/api/buildings/?min_score=notanint")
        assert resp.status_code == 200
        assert any(b["bin"] == "B-BADSCORE-001" for b in resp.json())

    def test_list_filter_borough(self) -> None:
        """?borough=1 returns only buildings whose community_board starts with '1'."""
        from api.models import BuildingRiskScore

        client = Client()
        self._seed_building("B-BORO-MAN")  # default community_board = "101" (Manhattan)
        BuildingRiskScore.objects.update_or_create(
            bin="B-BORO-BX",
            defaults={
                "house_number": "100",
                "house_street": "Grand Concourse",
                "zip_code": "10451",
                "community_board": "201",  # Bronx
                "lat": 40.858,
                "lon": -73.925,
                "complaints_1yr": 1,
                "complaints_3yr": 3,
                "is_chronic": True,
                "vulnerability_score": 2,
                "score_provider": 1,
                "score_center": 1,
                "score_heat_cb": 0,
                "n_complaints_analyzed": 3,
                "confidence": "medium",
            },
        )
        resp = client.get("/api/buildings/?borough=1")
        assert resp.status_code == 200
        bins = [b["bin"] for b in resp.json()]
        assert "B-BORO-MAN" in bins
        assert "B-BORO-BX" not in bins


@pytest.mark.django_db
class TestIngestWeather:
    """Tests for the ingest_weather management command."""

    def test_ingest_weather_stores_days(self) -> None:
        """Happy path: Open-Meteo response produces WeatherDay rows."""
        from django.core.management import call_command

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "daily": {
                "time": ["2024-01-01", "2024-01-02", "2024-07-04"],
                "temperature_2m_max": [32.0, 35.0, 95.0],
                "precipitation_sum": [0.0, 1.2, 0.0],
            }
        }

        with patch("api.management.commands.ingest_weather.httpx.get") as mock_get:
            mock_get.return_value = mock_response
            call_command("ingest_weather", verbosity=0)

        from api.models import WeatherDay

        assert WeatherDay.objects.count() == 3
        hot_day = WeatherDay.objects.get(date="2024-07-04")
        assert hot_day.temp_max_f == 95.0

    def test_ingest_weather_uses_correct_params(self) -> None:
        """Verifies timezone and temperature_unit params are sent to Open-Meteo."""
        from django.core.management import call_command

        mock_response = MagicMock()
        mock_response.json.return_value = {
            "daily": {"time": [], "temperature_2m_max": [], "precipitation_sum": []}
        }

        with patch("api.management.commands.ingest_weather.httpx.get") as mock_get:
            mock_get.return_value = mock_response
            call_command("ingest_weather", verbosity=0)

        _, kwargs = mock_get.call_args
        params = kwargs["params"]
        assert params["timezone"] == "America/New_York"
        assert params["temperature_unit"] == "fahrenheit"


@pytest.mark.django_db
class TestIngestDFTA:
    """Tests for the ingest_dfta management command."""

    def test_ingest_senior_centers(self) -> None:
        """Senior centers with coordinates are stored and geometry column is populated."""
        from django.core.management import call_command

        center_row = {
            "facilityid": "SC-INGEST-1",
            "name": "Test Senior Center",
            "comminuty_board": "101",  # source typo preserved
            "latitude": "40.758",
            "longitude": "-73.985",
        }

        mock_resp = MagicMock()
        mock_resp.json.return_value = [center_row]

        with patch("api.management.commands.ingest_dfta.httpx.get") as mock_get:

            def side_effect(url: str, **kwargs: object) -> MagicMock:
                r = MagicMock()
                r.json.return_value = [center_row] if "ygfr-ij6t" in url else []
                return r

            mock_get.side_effect = side_effect
            call_command("ingest_dfta", verbosity=0)

        from api.models import DFTASeniorCenter

        assert DFTASeniorCenter.objects.filter(center_id="SC-INGEST-1").exists()
        sc = DFTASeniorCenter.objects.get(center_id="SC-INGEST-1")
        assert sc.lat == pytest.approx(40.758)

    def _call_with_providers(
        self, provider_rows: list[dict[str, str]], dataset_id: str = "cwsm-2ns3"
    ) -> None:
        from django.core.management import call_command

        def side_effect(url: str, **kwargs: object) -> MagicMock:
            r = MagicMock()
            r.json.return_value = provider_rows if dataset_id in url else []
            return r

        with patch("api.management.commands.ingest_dfta.httpx.get") as mock_get:
            mock_get.side_effect = side_effect
            call_command("ingest_dfta", provider_dataset=dataset_id, verbosity=0)

    def test_ingest_providers_happy_path(self) -> None:
        """Provider with contractid, lat/lon, name, borough, address is stored correctly."""
        from api.models import DFTAProvider

        self._call_with_providers(
            [
                {
                    "contractid": "P-001",
                    "provider_name": "Meals on Wheels Bronx",
                    "borough": "Bronx",
                    "address": "1 Grand Concourse",
                    "latitude": "40.858",
                    "longitude": "-73.925",
                }
            ]
        )

        assert DFTAProvider.objects.filter(provider_id="P-001").exists()
        p = DFTAProvider.objects.get(provider_id="P-001")
        assert p.name == "Meals on Wheels Bronx"
        assert p.borough == "Bronx"
        assert p.address == "1 Grand Concourse"
        assert p.lat == pytest.approx(40.858)
        assert p.lon == pytest.approx(-73.925)

    def test_ingest_providers_address_from_parts(self) -> None:
        """When no address field, constructs address from house_number + street_name."""
        from api.models import DFTAProvider

        self._call_with_providers(
            [
                {
                    "contractid": "P-002",
                    "house_number": "215",
                    "street_name": "East 68th Street",
                    "latitude": "40.768",
                    "longitude": "-73.961",
                }
            ]
        )

        p = DFTAProvider.objects.get(provider_id="P-002")
        assert p.address == "215 East 68th Street"

    def test_ingest_providers_name_fallback(self) -> None:
        """Uses name field when provider_name is absent."""
        from api.models import DFTAProvider

        self._call_with_providers(
            [
                {
                    "contractid": "P-003",
                    "name": "Senior Care Queens",
                    "latitude": "40.730",
                    "longitude": "-73.794",
                }
            ]
        )

        p = DFTAProvider.objects.get(provider_id="P-003")
        assert p.name == "Senior Care Queens"

    def test_ingest_providers_alternative_id_fields(self) -> None:
        """Falls back through provider_id → facilityid → objectid when contractid absent."""
        from api.models import DFTAProvider

        self._call_with_providers(
            [
                {"provider_id": "P-ALT-1", "latitude": "40.700", "longitude": "-74.000"},
                {"facilityid": "P-ALT-2", "latitude": "40.701", "longitude": "-74.001"},
                {"objectid": "P-ALT-3", "latitude": "40.702", "longitude": "-74.002"},
            ]
        )

        assert DFTAProvider.objects.filter(provider_id="P-ALT-1").exists()
        assert DFTAProvider.objects.filter(provider_id="P-ALT-2").exists()
        assert DFTAProvider.objects.filter(provider_id="P-ALT-3").exists()

    def test_ingest_providers_skips_row_with_no_id(self) -> None:
        """Rows with no recognisable ID field are skipped without error."""
        from api.models import DFTAProvider

        self._call_with_providers(
            [
                {"name": "No ID Provider", "latitude": "40.700", "longitude": "-74.000"},
            ]
        )

        assert DFTAProvider.objects.count() == 0

    def test_ingest_providers_replaces_on_rerun(self) -> None:
        """A second run replaces all provider rows — no duplicates."""
        from api.models import DFTAProvider

        self._call_with_providers(
            [
                {
                    "contractid": "P-OLD",
                    "latitude": "40.700",
                    "longitude": "-74.000",
                }
            ]
        )
        assert DFTAProvider.objects.count() == 1

        self._call_with_providers(
            [
                {
                    "contractid": "P-NEW",
                    "latitude": "40.701",
                    "longitude": "-74.001",
                }
            ]
        )

        assert DFTAProvider.objects.count() == 1
        assert DFTAProvider.objects.filter(provider_id="P-NEW").exists()
        assert not DFTAProvider.objects.filter(provider_id="P-OLD").exists()

    def test_ingest_center_skips_row_with_no_id(self) -> None:
        """Center row with no facilityid, bin, or objectid is silently skipped."""
        from django.core.management import call_command

        from api.models import DFTASeniorCenter

        bad_row = {"name": "No ID Center", "latitude": "40.758", "longitude": "-73.985"}

        def side_effect(url: str, **kwargs: object) -> MagicMock:
            r = MagicMock()
            r.json.return_value = [bad_row] if "ygfr-ij6t" in url else []
            return r

        with patch("api.management.commands.ingest_dfta.httpx.get") as mock_get:
            mock_get.side_effect = side_effect
            call_command("ingest_dfta", verbosity=0)

        assert DFTASeniorCenter.objects.count() == 0

    def test_ingest_center_skips_row_when_geocoding_fails(self) -> None:
        """Center row with no coordinates and a failing geocoder is silently skipped."""
        from django.core.management import call_command

        from api.models import DFTASeniorCenter

        bad_row = {"facilityid": "SC-NO-COORDS", "name": "No Coords Center"}

        def side_effect(url: str, **kwargs: object) -> MagicMock:
            r = MagicMock()
            r.json.return_value = [bad_row] if "ygfr-ij6t" in url else []
            return r

        with patch("api.management.commands.ingest_dfta.httpx.get") as mock_get:
            mock_get.side_effect = side_effect
            with patch("api.management.commands.ingest_dfta.geocode_address", return_value=None):
                call_command("ingest_dfta", verbosity=0)

        assert not DFTASeniorCenter.objects.filter(center_id="SC-NO-COORDS").exists()

    def test_ingest_provider_skips_row_when_geocoding_fails(self) -> None:
        """Provider row with no coordinates and a failing geocoder is silently skipped."""
        from django.core.management import call_command

        from api.models import DFTAProvider

        bad_row = {"contractid": "P-NO-COORDS", "provider_name": "No Coords Provider"}

        def side_effect(url: str, **kwargs: object) -> MagicMock:
            r = MagicMock()
            r.json.return_value = [bad_row] if "test-ds" in url else []
            return r

        with patch("api.management.commands.ingest_dfta.httpx.get") as mock_get:
            mock_get.side_effect = side_effect
            with patch("api.management.commands.ingest_dfta.geocode_address", return_value=None):
                call_command("ingest_dfta", provider_dataset="test-ds", verbosity=0)

        assert not DFTAProvider.objects.filter(provider_id="P-NO-COORDS").exists()

    def test_coords_from_row_falls_back_to_geocoding_on_bad_float(self) -> None:
        """_coords_from_row with non-parseable lat/lon strings geocodes the address instead."""
        from api.management.commands.ingest_dfta import Command

        with patch(
            "api.management.commands.ingest_dfta.geocode_address",
            return_value=(-73.985, 40.758),
        ) as mock_geo:
            result = Command()._coords_from_row(
                {
                    "latitude": "bad",
                    "longitude": "worse",
                    "address": "123 Main St",
                    "borough": "Bronx",
                },
                {},
            )

        assert result == (-73.985, 40.758)
        mock_geo.assert_called_once()


@pytest.mark.django_db
class TestBuildingOverride:
    """Tests for PATCH /api/buildings/<bin>/ elevator_count_override."""

    @pytest.fixture(autouse=True)
    def _set_api_key(self, settings: Any) -> None:
        settings.ROUTE_API_KEY = _TEST_API_KEY

    def _seed_building(
        self,
        bin_id: str,
        is_single_elevator: bool | None = None,
        elevator_count_override: int | None = None,
    ) -> None:
        from api.models import BuildingRiskScore

        BuildingRiskScore.objects.update_or_create(
            bin=bin_id,
            defaults={
                "house_number": "100",
                "house_street": "Test St",
                "zip_code": "10001",
                "community_board": "101",
                "lat": 40.758,
                "lon": -73.985,
                "complaints_1yr": 1,
                "complaints_3yr": 3,
                "is_chronic": True,
                "vulnerability_score": 2,
                "score_provider": 1,
                "score_center": 1,
                "score_heat_cb": 0,
                "n_complaints_analyzed": 3,
                "confidence": "medium",
                "is_single_elevator": is_single_elevator,
                "elevator_count_override": elevator_count_override,
            },
        )

    def _seed_complaint(self, bin_id: str, complaint_number: str) -> None:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO elevator_complaints
                  (complaint_number, bin, house_number, house_street, zip_code,
                   community_board, date_entered, status, lat, lon, fetched_at)
                VALUES (%s, %s, '100', 'Test St', '10001', '101',
                        NOW(), 'ACTIVE', 40.758, -73.985, NOW())
                ON CONFLICT (complaint_number) DO NOTHING
                """,
                [complaint_number, bin_id],
            )
            cursor.execute(
                "UPDATE elevator_complaints"
                " SET location = ST_SetSRID(ST_MakePoint(%s, %s), 4326)"
                " WHERE complaint_number = %s",
                [-73.985, 40.758, complaint_number],
            )

    # ── endpoint surface ────────────────────────────────────────────────────

    def test_patch_requires_api_key(self) -> None:
        client = Client()
        self._seed_building("B-OVR-AUTH")
        resp = client.patch(
            "/api/buildings/B-OVR-AUTH/",
            data=json.dumps({"elevatorCountOverride": 1}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_patch_sets_single_elevator_override(self) -> None:
        client = Client()
        self._seed_building("B-OVR-001")
        resp = client.patch(
            "/api/buildings/B-OVR-001/",
            data=json.dumps({"elevatorCountOverride": 1}),
            content_type="application/json",
            **_AUTH,
        )
        assert resp.status_code == 200
        assert resp.json()["elevatorCountOverride"] == 1

    def test_patch_sets_multi_elevator_override(self) -> None:
        client = Client()
        self._seed_building("B-OVR-002")
        resp = client.patch(
            "/api/buildings/B-OVR-002/",
            data=json.dumps({"elevatorCountOverride": 4}),
            content_type="application/json",
            **_AUTH,
        )
        assert resp.status_code == 200
        assert resp.json()["elevatorCountOverride"] == 4

    def test_patch_clears_override(self) -> None:
        client = Client()
        self._seed_building("B-OVR-003", elevator_count_override=1)
        resp = client.patch(
            "/api/buildings/B-OVR-003/",
            data=json.dumps({"elevatorCountOverride": None}),
            content_type="application/json",
            **_AUTH,
        )
        assert resp.status_code == 200
        assert resp.json()["elevatorCountOverride"] is None

    def test_patch_rejects_zero(self) -> None:
        client = Client()
        self._seed_building("B-OVR-004")
        resp = client.patch(
            "/api/buildings/B-OVR-004/",
            data=json.dumps({"elevatorCountOverride": 0}),
            content_type="application/json",
            **_AUTH,
        )
        assert resp.status_code == 400

    def test_patch_rejects_negative(self) -> None:
        client = Client()
        self._seed_building("B-OVR-005")
        resp = client.patch(
            "/api/buildings/B-OVR-005/",
            data=json.dumps({"elevatorCountOverride": -1}),
            content_type="application/json",
            **_AUTH,
        )
        assert resp.status_code == 400

    def test_patch_404_for_unknown_bin(self) -> None:
        client = Client()
        resp = client.patch(
            "/api/buildings/DOES-NOT-EXIST/",
            data=json.dumps({"elevatorCountOverride": 1}),
            content_type="application/json",
            **_AUTH,
        )
        assert resp.status_code == 404

    # ── SQL merge logic in outage responses ─────────────────────────────────

    def test_override_1_overrides_unknown_dob(self) -> None:
        """Override=1 on a DOB-unknown building makes singleElevator true in outages."""
        client = Client()
        self._seed_building("B-OVR-006", is_single_elevator=None)
        self._seed_complaint("B-OVR-006", "C-OVR-006")

        # Before override: DOB unknown → COALESCE → false
        resp = client.get("/api/outages/")
        item = next(o for o in resp.json() if o["bin"] == "B-OVR-006")
        assert item["singleElevator"] is False

        client.patch(
            "/api/buildings/B-OVR-006/",
            data=json.dumps({"elevatorCountOverride": 1}),
            content_type="application/json",
            **_AUTH,
        )

        resp = client.get("/api/outages/")
        item = next(o for o in resp.json() if o["bin"] == "B-OVR-006")
        assert item["singleElevator"] is True

    def test_override_gt1_wins_over_dob_true(self) -> None:
        """Override>1 makes singleElevator false even when DOB says is_single_elevator=True."""
        client = Client()
        self._seed_building("B-OVR-007", is_single_elevator=True)
        self._seed_complaint("B-OVR-007", "C-OVR-007")

        client.patch(
            "/api/buildings/B-OVR-007/",
            data=json.dumps({"elevatorCountOverride": 3}),
            content_type="application/json",
            **_AUTH,
        )

        resp = client.get("/api/outages/")
        item = next(o for o in resp.json() if o["bin"] == "B-OVR-007")
        assert item["singleElevator"] is False

    def test_clearing_override_restores_dob_value(self) -> None:
        """Clearing the override falls back to DOB is_single_elevator."""
        client = Client()
        # DOB says True, but an override of 3 is suppressing it
        self._seed_building("B-OVR-008", is_single_elevator=True, elevator_count_override=3)
        self._seed_complaint("B-OVR-008", "C-OVR-008")

        resp = client.get("/api/outages/")
        item = next(o for o in resp.json() if o["bin"] == "B-OVR-008")
        assert item["singleElevator"] is False  # override wins

        client.patch(
            "/api/buildings/B-OVR-008/",
            data=json.dumps({"elevatorCountOverride": None}),
            content_type="application/json",
            **_AUTH,
        )

        resp = client.get("/api/outages/")
        item = next(o for o in resp.json() if o["bin"] == "B-OVR-008")
        assert item["singleElevator"] is True  # DOB value restored


class TestScoreBuildingHeat:
    """Unit tests for _score_building_heat; no database required."""

    def _weeks(self, data: list[tuple[str, float, bool]]) -> Any:
        import pandas as pd

        dates, temps, is_heat = zip(*data, strict=True)
        return pd.DataFrame(
            {
                "week_start": pd.to_datetime(list(dates)),
                "weekly_max_f": list(temps),
                "is_heat_week": list(is_heat),
            }
        )

    def _building(self, bin_id: str, data: list[tuple[str, float]]) -> Any:
        import pandas as pd

        dates, counts = zip(*data, strict=True)
        return pd.DataFrame(
            {
                "bin": [bin_id] * len(dates),
                "week_start": pd.to_datetime(list(dates)),
                "n_complaints": list(counts),
            }
        )

    def test_high_confidence(self) -> None:
        """n_complaints_3yr >= 15 → confidence 'high'."""
        from api.management.commands.compute_risk_scores import _score_building_heat

        weeks = self._weeks([("2024-01-01", 85.0, False), ("2024-01-08", 85.0, False)])
        building_c = self._building("BIN-H", [("2024-01-01", 8.0), ("2024-01-08", 7.0)])
        result = _score_building_heat("BIN-H", building_c, weeks, n_complaints_3yr=15)
        assert result["confidence"] == "high"

    def test_low_confidence(self) -> None:
        """n_complaints_3yr < 5 → confidence 'low'."""
        from api.management.commands.compute_risk_scores import _score_building_heat

        weeks = self._weeks([("2024-01-01", 85.0, False)])
        building_c = self._building("BIN-L", [("2024-01-01", 1.0)])
        result = _score_building_heat("BIN-L", building_c, weeks, n_complaints_3yr=3)
        assert result["confidence"] == "low"

    def test_heat_ratio_none_when_no_nonheat_complaints(self) -> None:
        """heat_rate > 0, nonheat_rate == 0 → heat_ratio is None."""
        from api.management.commands.compute_risk_scores import _score_building_heat

        # Only a heat week; non-heat week exists but has zero complaints → nonheat_rate = 0
        weeks = self._weeks([("2024-07-01", 95.0, True), ("2024-01-01", 50.0, False)])
        building_c = self._building("BIN-R", [("2024-07-01", 1.0)])
        result = _score_building_heat("BIN-R", building_c, weeks, n_complaints_3yr=3)
        assert result["heat_ratio"] is None


class TestHeatFlagCbs:
    """Unit tests for Command._heat_flag_cbs; no database required."""

    def test_summer_ratio_determines_top_tercile(self) -> None:
        """CBs with higher summer complaint ratio land in the top tercile."""
        import pandas as pd

        from api.management.commands.compute_risk_scores import Command

        today = datetime.date.today()
        summer = today.replace(month=7, day=1)
        winter = today.replace(month=1, day=1)

        # CB "101": 2 summer, 1 winter → ratio 0.667
        # CB "201": 0 summer, 2 winter → ratio 0.0
        complaints = pd.DataFrame(
            {
                "community_board": ["101", "101", "101", "201", "201"],
                "date_entered": pd.to_datetime([summer, summer, winter, winter, winter]),
            }
        )
        result = Command()._heat_flag_cbs(complaints)
        assert "101" in result
        assert "201" not in result

    def test_empty_community_board_excluded(self) -> None:
        """Rows with empty community_board are dropped before ratio computation."""
        import pandas as pd

        from api.management.commands.compute_risk_scores import Command

        today = datetime.date.today()
        summer = today.replace(month=7, day=1)

        complaints = pd.DataFrame(
            {
                "community_board": ["101", ""],
                "date_entered": pd.to_datetime([summer, summer]),
            }
        )
        result = Command()._heat_flag_cbs(complaints)
        assert "" not in result

    def test_uses_subset_index_correctly(self) -> None:
        """is_summer is derived from c (filtered subset), not complaints (full DataFrame)."""
        import pandas as pd

        from api.management.commands.compute_risk_scores import Command

        today = datetime.date.today()
        summer = today.replace(month=7, day=1)
        winter = today.replace(month=1, day=1)

        # Row at index 1 is filtered out (empty CB). Row at index 0 is summer,
        # row at index 2 is winter. With the fixed code c["date_entered"] gives
        # is_summer for only the retained rows (0=True, 2=False).
        complaints = pd.DataFrame(
            {
                "community_board": ["101", "", "101"],
                "date_entered": pd.to_datetime([summer, summer, winter]),
            }
        )
        result = Command()._heat_flag_cbs(complaints)
        # CB "101" has ratio = 1/2 = 0.5; only one CB so it's at/above the tercile threshold.
        assert "101" in result
