import os
import platform
import subprocess
import json

import pytest
import redis
from django.core.management import call_command
from django.db import connection

from .harness import Runtime, mailpit, wait_redis
from .safety import validate_container, validate_environment


@pytest.fixture(scope="session")
def django_db_setup(django_db_blocker):
    """Use only the disposable service DB shared by pytest and worker processes.

    No pytest test_ alias: a worker must observe exactly the same committed data.
    Transactional test cleanup flushes it only after each worker/Beat stops.
    The database/server checks run before any migrations or writes.
    """
    run = validate_environment(os.environ)
    if platform.system() != "Linux":
        pytest.fail("This real prefork/service lane requires Linux; it must not silently skip")
    for role in ("postgres", "redis", "mailpit"):
        container = os.environ[f"FLOVERS_{role.upper()}_CONTAINER"]
        info = json.loads(subprocess.run(["docker", "inspect", container], check=True,
                                        capture_output=True, text=True, timeout=15).stdout)[0]
        validate_container(info, container_id=container, run=run, role=role)
    wait_redis(redis.Redis.from_url("redis://127.0.0.1:6379/0", socket_timeout=2, socket_connect_timeout=2))
    mailpit("messages?limit=1")
    with django_db_blocker.unblock():
        assert connection.vendor == "postgresql"
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_database(), current_setting('server_version_num')")
            database, version = cursor.fetchone()
        assert database == "flovers_ci" and 160000 <= int(version) < 170000
        call_command("migrate", interactive=False, verbosity=0)


@pytest.fixture
def runtime(transactional_db, request):
    instance = Runtime(request.node.name)
    try:
        instance.start_worker()
        yield instance
    finally:
        instance.close()
