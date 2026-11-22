"""Staging-only probes; never installed in the production URL configuration."""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "staging.settings")
import django  # noqa: E402
django.setup()
from django.conf import settings  # noqa: E402
from django.db import connection  # noqa: E402
from django.http import JsonResponse  # noqa: E402
from redis import Redis  # noqa: E402


def dependencies():
    checks = {"database": False, "redis": False}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            checks["database"] = cursor.fetchone() == (1,)
    except Exception:
        pass  # Sanitized 503 below, not a successful health result.
    finally:
        connection.close()
    try:
        checks["redis"] = Redis.from_url(settings.CELERY_BROKER_URL,
            socket_connect_timeout=2, socket_timeout=2).ping()
    except Exception:
        pass
    return checks


def live(request):
    return JsonResponse({"status": "alive"})


def ready(request):
    checks = dependencies()
    return JsonResponse({"status": "ready" if all(checks.values()) else "unavailable",
                         "checks": checks}, status=200 if all(checks.values()) else 503)


def probe(role):
    if role == "web":
        from urllib.request import urlopen
        with urlopen("http://127.0.0.1:8000/__staging__/ready/", timeout=6) as response:
            assert response.status == 200
    elif role == "worker":
        from app.celery import celery_app
        result = celery_app.control.inspect(destination=["staging@worker"], timeout=3).ping()
        assert result and result.get("staging@worker") == {"ok": "pong"}, result
    elif role == "beat":
        import time
        value = Redis.from_url(settings.CELERY_RESULT_BACKEND,
            socket_connect_timeout=2, socket_timeout=2).get(f"staging:{settings.RUN}:heartbeat")
        assert value and time.time() - float(value) < 15, "Beat has not dispatched a worker heartbeat"
    else:
        raise ValueError("Unknown health role")


if __name__ == "__main__":
    import sys
    probe(sys.argv[1])
