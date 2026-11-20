"""Test-only transport probes; production delivery functions are not replaced."""
import os
import time
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


@shared_task(name="flovers.integration.gate", acks_late=True)
def gate(key):
    # Late acknowledgement consumes the sole prefetch credit. Merely stopping
    # an idle worker is insufficient: Redis could still fulfil its pending BRPOP.
    client = redis.Redis.from_url("redis://127.0.0.1:6379/0", socket_timeout=1, socket_connect_timeout=1)
    client.set(key + ":started", "1", ex=120)
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            if client.get(key + ":release"):
                return os.getpid()
        except (redis.ConnectionError, redis.TimeoutError):
            pass
        time.sleep(0.1)
    raise RuntimeError("Synthetic worker barrier was not released")
