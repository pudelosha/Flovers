"""Boot the real application Celery instance under isolated test settings."""
import os

if os.environ.get("DJANGO_SETTINGS_MODULE") != "integration.celery.settings":
    raise RuntimeError("Refusing to start an integration worker with other settings")

from .safety import validate_environment
validate_environment(os.environ)

from app.celery import celery_app as app  # noqa: E402,F401
