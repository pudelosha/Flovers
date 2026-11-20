import os
from pathlib import Path
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import check_ci_postgres


class PostgresPreflightTests(unittest.TestCase):
    def test_sqlite_is_rejected_before_any_connection(self):
        connection = MagicMock(vendor="sqlite")
        with self.assertRaisesRegex(RuntimeError, "real PostgreSQL"):
            check_ci_postgres.check_connection(connection)
        connection.cursor.assert_not_called()

    def test_the_actual_database_name_is_verified(self):
        connection = MagicMock(vendor="postgresql")
        connection.cursor.return_value.__enter__.return_value.fetchone.return_value = ("other_database", "160011")
        with self.assertRaisesRegex(RuntimeError, "dedicated flovers_ci"):
            check_ci_postgres.check_connection(connection)

    def test_verified_test_database_returns_the_actual_server_version(self):
        connection = MagicMock(vendor="postgresql")
        connection.cursor.return_value.__enter__.return_value.fetchone.return_value = ("flovers_ci", "160011")
        self.assertEqual(check_ci_postgres.check_connection(connection), "160011")

    def test_wrong_settings_or_missing_test_url_fail_before_loading_django(self):
        for settings, url in [("app.settings", "postgres://localhost/flovers_ci"), ("app.ci_settings", "")]:
            with self.subTest(settings=settings, url=url), patch.dict(os.environ, {
                "DJANGO_SETTINGS_MODULE": settings, "CI_DATABASE_URL": url,
            }):
                with self.assertRaisesRegex(RuntimeError, "isolated CI_DATABASE_URL"):
                    check_ci_postgres.main()
