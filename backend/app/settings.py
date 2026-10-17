from pathlib import Path
import environ
from datetime import timedelta
from celery.schedules import crontab
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# --- .env ---
env = environ.Env()

# Load .env if present (but DO NOT use its existence to decide DB engine)
env_file = BASE_DIR / ".env"
if env.bool("LOAD_DOTENV", default=True) and env_file.exists():
    environ.Env.read_env(env_file)

# --- Core ---
APP_ENV = env("APP_ENV", default="production").strip().lower()
if APP_ENV not in {"production", "development", "test"}:
    raise ImproperlyConfigured("APP_ENV must be production, development, or test.")
_development = APP_ENV in {"development", "test"}
_dev_secret = "django-insecure-local-dev-secret-key-change-me-32-bytes-min"
_dev_jwt_key = "simplejwt-local-dev-signing-key-change-me-32-bytes-min"
SECRET_KEY = env("SECRET_KEY", default=_dev_secret if _development else "")
JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", default=_dev_jwt_key if _development else "")
if not _development:
    for _name, _value in (("SECRET_KEY", SECRET_KEY), ("JWT_SIGNING_KEY", JWT_SIGNING_KEY)):
        if len(_value.strip()) < 32 or _value in {_dev_secret, _dev_jwt_key} or _value.startswith("django-insecure-"):
            raise ImproperlyConfigured(f"{_name} must be an explicitly configured private key of at least 32 characters in production.")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["api.flovers.app"])

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
    "core.middleware.TrustedProxyHeadersMiddleware",
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
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "200/min",
        "anon": "50/min",
        "ingest_per_device": "60/hour",
        "feed_per_device": "120/hour",
        "pump_poll_per_device": "120/hour",
        "pump_complete_per_device": "120/hour",
        "public_contact": "5/hour",
    },
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    # Middleware resolves a client address only from an explicitly trusted proxy.
    "NUM_PROXIES": 0,
}

TRUSTED_PROXY_CIDRS = env.list("TRUSTED_PROXY_CIDRS", default=[])
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = False
THROTTLE_CACHE_URL = env("THROTTLE_CACHE_URL", default="").strip()
if THROTTLE_CACHE_URL:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": THROTTLE_CACHE_URL}}

# --- JWT ---
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "SIGNING_KEY": JWT_SIGNING_KEY,
    "CHECK_REVOKE_TOKEN": True,
    "TOKEN_REFRESH_SERIALIZER": "accounts.serializers.PasswordAwareTokenRefreshSerializer",
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

# --- Celery / Redis ---
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/1")

# --- Public base URL (used for email links) ---
SITE_URL = env(
    "SITE_URL",
    default="http://127.0.0.1:8000" if DEBUG else "https://api.flovers.app",
)

# --- Deep link config for mobile ---
DEEP_LINK_SCHEME = env("DEEP_LINK_SCHEME", default="flovers")
DEEP_LINK_HOST = env("DEEP_LINK_HOST", default="")  # keep empty -> flovers://path
DEEP_LINK_ENABLED = env.bool("DEEP_LINK_ENABLED", default=True)
PUBLIC_WEB_BASE = env("PUBLIC_WEB_BASE", default=SITE_URL)  # where /open/* is served

ANDROID_PACKAGE_NAME = "com.flovers.mobile"  # <-- set your actual appId
IOT_TLS_CA_CERT = env("IOT_TLS_CA_CERT", default="")

# --- Celery ---
CELERY_BEAT_SCHEDULE = {
    "check-and-send-daily-task-notifications-every-minute": {
        "task": "profiles.tasks.check_and_send_daily_task_notifications",
        "schedule": crontab(),  # every minute
    },
}

CELERY_TIMEZONE = "UTC"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    # CHANGE: add BASE_DIR/templates
    "DIRS": [BASE_DIR / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

# --- Email (MailHog in Docker by default) ---
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="postfix")
EMAIL_PORT = env.int("EMAIL_PORT", default=25)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=False)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=30)
if not 1 <= EMAIL_TIMEOUT <= 120:
    raise ImproperlyConfigured("EMAIL_TIMEOUT must be between 1 and 120 seconds.")
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="no-reply@flovers.app")
SERVER_EMAIL = env("SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)

# Email + i18n helpers
EMAIL_SUBJECT_PREFIX = ""
EMAIL_DEFAULT_LANG = env("EMAIL_DEFAULT_LANG", default="en").strip()

# Where JSON translations live (core/i18n.py reads this)
I18N_LOCALES_DIR = BASE_DIR / "i18n" / "locales"

# Optional safety: supported langs list (used by helpers)
SUPPORTED_LANGS = ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"]

# Contact (Support/Report Bug) inbox
SUPPORT_INBOX_EMAIL = env("SUPPORT_INBOX_EMAIL", default="support@flovers.app")
