"""Django settings for the Proactive Care-Route Optimizer API."""

import re
from pathlib import Path

from decouple import Csv, config

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _parse_db_url(url: str) -> dict[str, object]:
    """Minimal DATABASE_URL parser for postgres:// and sqlite:/// schemes."""
    if url.startswith("sqlite"):
        db_path = url.split("///", 1)[-1]
        return {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / db_path}
    m = re.match(
        r"postgres(?:ql)?://(?P<user>[^:]+):(?P<password>[^@]+)@"
        r"(?P<host>[^:/]+)(?::(?P<port>\d+))?/(?P<name>.+)",
        url,
    )
    if not m:
        raise ValueError(f"Cannot parse DATABASE_URL: {url!r}")
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": m.group("name"),
        "USER": m.group("user"),
        "PASSWORD": m.group("password"),
        "HOST": m.group("host"),
        "PORT": m.group("port") or "5432",
    }


SECRET_KEY: str = config("DJANGO_SECRET_KEY")
DEBUG: bool = config("DJANGO_DEBUG", default=False, cast=bool)
ALLOWED_HOSTS: list[str] = config("ALLOWED_HOSTS", default="localhost", cast=Csv())

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "corsheaders",
    "rest_framework",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

DATABASES = {
    "default": config(
        "DATABASE_URL",
        default="sqlite:///db.sqlite3",
        cast=_parse_db_url,
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
}

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\d+$",
    r"^https://.*\.onrender\.com$",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/New_York"
USE_I18N = False
USE_TZ = True
