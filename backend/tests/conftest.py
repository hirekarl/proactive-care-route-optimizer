import pytest


@pytest.fixture(autouse=True)
def use_sqlite_db(settings) -> None:  # type: ignore[no-untyped-def]
    """Use an in-memory SQLite DB for all tests (no Postgres required locally)."""
    settings.DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }
