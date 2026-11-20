"""Production application with disposable transports and persistent test volumes."""
import os
from .safety import install_network_guard, validate_environment

RUN = validate_environment(os.environ)
install_network_guard()
os.environ.update({
    "APP_ENV": "test", "DEBUG": "False", "USE_POSTGRES": "True",
    "SECRET_KEY": "staging-only-django-key-not-valid-outside-disposable-ci",
    "JWT_SIGNING_KEY": "staging-only-jwt-key-not-valid-outside-disposable-ci",
    "ALLOWED_HOSTS": "web,localhost,127.0.0.1,testserver",
    "SITE_URL": "http://web:8000", "PUBLIC_WEB_BASE": "http://web:8000",
    "EMAIL_HOST": "", "EMAIL_HOST_USER": "", "EMAIL_HOST_PASSWORD": "",
    "FCM_SERVICE_ACCOUNT_PATH": "", "GOOGLE_APPLICATION_CREDENTIALS": "",
})
from app.settings import *  # noqa: E402,F403

ROOT_URLCONF = "staging.urls"
DATABASES["default"].update(CONN_MAX_AGE=0, OPTIONS={"connect_timeout": 2})  # noqa: F405
CACHES["default"]["OPTIONS"] = {"socket_connect_timeout": 2, "socket_timeout": 2}  # noqa: F405
EMAIL_BACKEND = "staging.delivery.DisabledDeliveryBackend"
DEFAULT_FROM_EMAIL = SERVER_EMAIL = "no-reply@example.test"
SUPPORT_INBOX_EMAIL = "support@example.test"
INVITATION_GOOGLE_PLAY_URL = INVITATION_APP_STORE_URL = ""
PRIVATE_MEDIA_REQUIRE_MOUNT = True
CELERY_TASK_ALWAYS_EAGER = False
CELERY_IMPORTS = ("staging.tasks",)
CELERY_TASK_DEFAULT_QUEUE = f"flovers-staging-{RUN}"
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_TRANSPORT_OPTIONS = {"socket_connect_timeout": 2, "socket_timeout": 2}
CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS = {"socket_connect_timeout": 2, "socket_timeout": 2}
CELERY_TASK_SERIALIZER = CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_RESULT_EXPIRES = 120
CELERY_BEAT_SCHEDULE = {**CELERY_BEAT_SCHEDULE, "staging-readiness-heartbeat": {  # noqa: F405
    "task": "staging.tasks.heartbeat", "schedule": 2.0,
}}
