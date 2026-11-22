import os
import time
from celery import shared_task
from django.conf import settings
from django.db import connection
from redis import Redis


@shared_task
def heartbeat():
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        assert cursor.fetchone() == (1,)
    result = {"run": settings.RUN, "worker_pid": os.getpid(), "db": 1, "time": time.time()}
    Redis.from_url(settings.CELERY_RESULT_BACKEND).setex(
        f"staging:{settings.RUN}:heartbeat", 15, str(result["time"]),
    )
    return result
