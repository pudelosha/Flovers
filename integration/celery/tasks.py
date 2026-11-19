"""Test-only transport probes; production delivery functions are not replaced."""
import os
from celery import shared_task, current_app
from django.db import connection
import redis


@shared_task(name="flovers.integration.probe")
def probe(payload):
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), current_setting('server_version_num')")
        database, version = cursor.fetchone()
    return {"payload": payload, "pid": os.getpid(), "eager": current_app.conf.task_always_eager,
            "database": database, "postgres_version": int(version),
            "registered": sorted(name for name in current_app.tasks if name.startswith(("contacts.", "profiles.")))}


@shared_task(bind=True, name="flovers.integration.retry")
def retry_probe(self, key):
    attempts = redis.Redis.from_url("redis://127.0.0.1:6379/0").incr(key)
    if self.request.retries == 0:
        raise self.retry(exc=RuntimeError("Synthetic retry"), countdown=0.25, max_retries=1)
    return {"attempts": attempts, "retries": self.request.retries, "pid": os.getpid()}
