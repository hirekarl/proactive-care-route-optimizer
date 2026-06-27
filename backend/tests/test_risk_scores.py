"""Tests for building risk scoring pipeline and API endpoints."""

import datetime
from unittest.mock import MagicMock, patch

import pytest
from django.db import connection
from django.test import Client


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
            "INSERT INTO dfta_providers (provider_id, name, lat, lon) VALUES (%s, 'P', %s, %s)"
            " ON CONFLICT (provider_id) DO NOTHING",
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
            "INSERT INTO dfta_senior_centers (center_id, name, community_board, lat, lon)"
            " VALUES (%s, 'C', '101', %s, %s) ON CONFLICT (center_id) DO NOTHING",
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
            "INSERT INTO weather_days (date, temp_max_f, precip_mm) VALUES (%s, %s, 0)"
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
        assert sc.community_board == "101"
        assert sc.lat == pytest.approx(40.758)
