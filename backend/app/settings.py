from pathlib import Path
import environ
from datetime import timedelta
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent

# --- .env ---
env = environ.Env()

# Load .env if present (but DO NOT use its existence to decide DB engine)
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

# --- Core ---
SECRET_KEY = env("SECRET_KEY", default="dev-secret")
DEBUG = env.bool("DEBUG", default=True)
ALLOWED_HOSTS = ["*"]  # ok for dev

# --- Apps ---
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # 3rd party
    "rest_framework",
    "corsheaders",
    # local
    "accounts",
    "profiles",
    "plant_definitions",
    "plant_instances",
    "locations",
    "reminders",
    "readings",
    "plant_recognition",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "app.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

WSGI_APPLICATION = "app.wsgi.application"

# --- Database ---
# Prefer DATABASE_URL if you have it (common in Docker/prod)
DATABASE_URL = env("DATABASE_URL", default="").strip()
USE_POSTGRES = env.bool("USE_POSTGRES", default=False)

if DATABASE_URL:
    # Example: postgres://appuser:apppass@db:5432/appdb
    DATABASES = {"default": env.db("DATABASE_URL")}
elif USE_POSTGRES:
    # Classic discrete env vars
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", default="appdb"),
            "USER": env("POSTGRES_USER", default="appuser"),
            "PASSWORD": env("POSTGRES_PASSWORD", default="apppass"),
            "HOST": env("POSTGRES_HOST", default="db"),
            "PORT": env("POSTGRES_PORT", default="5432"),
        }
    }
else:
    # Default local dev (no psycopg needed)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_USER_MODEL = "accounts.User"

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
        "readings.throttles.IngestPerDeviceThrottle",
        "readings.throttles.FeedPerDeviceThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "200/min",
        "anon": "50/min",
        "ingest_per_device": "60/hour",
        "feed_per_device": "120/hour",
    },
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}

# --- JWT ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# --- I18N / TZ ---
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Europe/Warsaw"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("en", "English"),
    ("pl", "Polski"),
    ("de", "Deutsch"),
]

LOCALE_PATHS = [BASE_DIR / "locale"]

# --- Static / Media ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS (dev: open) ---
CORS_ALLOW_ALL_ORIGINS = True

# --- Email (MailHog in Docker by default) ---
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="mailhog")
EMAIL_PORT = env.int("EMAIL_PORT", default=1025)
EMAIL_USE_TLS = False
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@flovers.local")

# --- Celery / Redis ---
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/1")

# --- Public base URL (used for email links) ---
SITE_URL = env("SITE_URL", default="http://127.0.0.1:8000")

# --- Deep link config for mobile ---
DEEP_LINK_SCHEME = env("DEEP_LINK_SCHEME", default="flovers")
DEEP_LINK_HOST = env("DEEP_LINK_HOST", default="")  # keep empty -> flovers://path
DEEP_LINK_ENABLED = env.bool("DEEP_LINK_ENABLED", default=True)
PUBLIC_WEB_BASE = env("PUBLIC_WEB_BASE", default=SITE_URL)  # where /open/* is served

ANDROID_PACKAGE_NAME = "com.flovers"  # <-- set your actual appId

# --- Celery ---
CELERY_BEAT_SCHEDULE = {
    "check-and-send-daily-task-notifications-every-minute": {
        "task": "profiles.tasks.check_and_send_daily_task_notifications",
        "schedule": crontab(),  # every minute
    },
}

CELERY_TIMEZONE = "UTC"