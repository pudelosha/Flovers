"""Fail the CI preflight if PostgreSQL tests would fall back to SQLite."""

import os
from pathlib import Path
import sys


def check_connection(connection):
    if connection.vendor != "postgresql":
        raise RuntimeError("Backend CI requires real PostgreSQL, not SQLite")
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), current_setting('server_version_num')")
        database, version = cursor.fetchone()
    if database != "flovers_ci":
        raise RuntimeError("Backend CI may connect only to its dedicated flovers_ci database")
    return version


def main():
    if os.environ.get("DJANGO_SETTINGS_MODULE") != "app.ci_settings" or not os.environ.get("CI_DATABASE_URL"):
        raise RuntimeError("Set app.ci_settings and the isolated CI_DATABASE_URL before this preflight")
    sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
    import django
    django.setup()
    from django.db import connection
    version = check_connection(connection)
    print(f"Verified real PostgreSQL {version} on the dedicated flovers_ci database")


if __name__ == "__main__":
    main()
