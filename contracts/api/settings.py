"""Contract lane: isolated CI database, temporary images and no delivery providers."""
from app.ci_settings import *  # noqa: F403

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
SITE_URL = "http://testserver"
PRIVATE_MEDIA_REQUIRE_MOUNT = False
PLANT_PHOTO_MIN_FREE_BYTES = 0
CELERY_TASK_ALWAYS_EAGER = False
