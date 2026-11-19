"""Non-eager test settings. No dotenv or inherited production endpoints."""
import os
from .safety import install_loopback_guard, validate_environment

RUN = validate_environment(os.environ)
install_loopback_guard()
os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)

from app.ci_settings import *  # noqa: E402,F403

# ci_settings fixes the database identity and removes dotenv/FCM/production mail.
# Only the transports explicitly declared here become real, loopback services.
CELERY_TASK_ALWAYS_EAGER = False
CELERY_TASK_EAGER_PROPAGATES = False
CELERY_BROKER_URL = "redis://127.0.0.1:6379/0"
CELERY_RESULT_BACKEND = "redis://127.0.0.1:6379/1"
# Celery reads these environment overrides before Django's configured values.
# ci_settings deliberately sets memory://, so replace both after importing it.
os.environ.update(CELERY_BROKER_URL=CELERY_BROKER_URL, CELERY_RESULT_BACKEND=CELERY_RESULT_BACKEND)
for _name in ("CELERY_BROKER_READ_URL", "CELERY_BROKER_WRITE_URL"):
    os.environ.pop(_name, None)
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 10
CELERY_BROKER_TRANSPORT_OPTIONS = {
    "global_keyprefix": f"flovers-it-{RUN}:",
    "visibility_timeout": 10,
    "socket_connect_timeout": 2,
    "socket_timeout": 2,
}
CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS = {"global_keyprefix": f"flovers-it-{RUN}:"}
CELERY_BROKER_HEARTBEAT = 2
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_CANCEL_LONG_RUNNING_TASKS_ON_CONNECTION_LOSS = False
CELERY_TASK_SERIALIZER = CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = CELERY_RESULT_ACCEPT_CONTENT = ["json"]
CELERY_RESULT_EXPIRES = 300
CELERY_IMPORTS = ("integration.celery.tasks",)
CELERY_TASK_DEFAULT_QUEUE = os.environ.get("FLOVERS_INTEGRATION_QUEUE", f"flovers-it-{RUN}")
if not CELERY_TASK_DEFAULT_QUEUE.startswith(f"flovers-it-{RUN}"):
    raise RuntimeError("Integration queue is outside this run's namespace")
CELERY_BEAT_SCHEDULE = {
    "integration-invitation-outbox": {
        "task": "contacts.tasks.deliver_invitation_emails",
        "schedule": 1.0,
    },
}
EMAIL_BACKEND = "integration.celery.smtp.SyntheticSMTPBackend"
EMAIL_HOST = "127.0.0.1"
EMAIL_PORT = 1025
EMAIL_HOST_USER = EMAIL_HOST_PASSWORD = ""
EMAIL_USE_SSL = EMAIL_USE_TLS = False
EMAIL_TIMEOUT = 3
DEFAULT_FROM_EMAIL = SERVER_EMAIL = "Flovers <no-reply@flovers.invalid>"
SITE_URL = PUBLIC_WEB_BASE = "http://127.0.0.1:8000"
INVITATION_GOOGLE_PLAY_URL = INVITATION_APP_STORE_URL = ""
