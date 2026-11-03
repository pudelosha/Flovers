"""Isolated application tests: no production dotenv, credentials, mail or broker."""
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlparse

# CI only accepts a loopback test database. Local use defaults to in-memory SQLite.
_database_url = os.environ.get("CI_DATABASE_URL", "")
if _database_url:
    _url = urlparse(_database_url)
    if (_url.scheme not in {"postgres", "postgresql"} or
            _url.hostname not in {"127.0.0.1", "localhost", "::1"} or
            _url.path != "/flovers_ci"):
        raise RuntimeError("CI_DATABASE_URL must point to the loopback flovers_ci database")
os.environ.update({
    "APP_ENV": "test", "LOAD_DOTENV": "False", "DEBUG": "False",
    "SECRET_KEY": "flovers-ci-only-secret-key-never-use-in-production",
    "JWT_SIGNING_KEY": "flovers-ci-only-jwt-key-never-use-in-production",
    "DATABASE_URL": _database_url, "USE_POSTGRES": "False",
    "THROTTLE_CACHE_URL": "", "FCM_SERVICE_ACCOUNT_PATH": "",
    "CELERY_BROKER_URL": "memory://", "CELERY_RESULT_BACKEND": "cache+memory://",
    "PLANT_MODEL": "web_scrapped_resnet18_v1",
})
from .settings import *  # noqa: E402,F403

if not _database_url:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
_test_storage = TemporaryDirectory(prefix="flovers-ci-")
MEDIA_ROOT = Path(_test_storage.name) / "media"
PRIVATE_MEDIA_ROOT = Path(_test_storage.name) / "private"
STATIC_ROOT = Path(_test_storage.name) / "static"
