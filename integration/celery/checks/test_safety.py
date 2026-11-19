import json
import os
import subprocess
import sys
import socket
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from integration.celery.safety import (
    container_action, install_loopback_guard, validate_container, validate_environment,
)


class SafetyTests(unittest.TestCase):
    env = {"FLOVERS_INTEGRATION": "1", "FLOVERS_INTEGRATION_RUN": "123-1",
           "CI_DATABASE_URL": "postgres://flovers_ci:flovers_ci@127.0.0.1:5432/flovers_ci"}

    def test_effective_celery_settings_cannot_fall_back_to_eager_memory_transport(self):
        env = {**os.environ, **self.env, "DJANGO_SETTINGS_MODULE": "integration.celery.settings"}
        code = ("import json; from integration.celery.worker_app import app; "
                "print(json.dumps([app.conf.broker_url,app.conf.result_backend,app.conf.task_always_eager]))")
        result = subprocess.run([sys.executable, "-c", code], env=env,
                                capture_output=True, text=True, timeout=20, check=True)
        self.assertEqual(json.loads(result.stdout), ["redis://127.0.0.1:6379/0", "redis://127.0.0.1:6379/1", False])

    def test_explicit_opt_in_and_run_namespace_are_required(self):
        for key in ("FLOVERS_INTEGRATION", "FLOVERS_INTEGRATION_RUN"):
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                validate_environment({k: v for k, v in self.env.items() if k != key})
        self.assertEqual(validate_environment(self.env), "123-1")

    def test_external_or_wrong_database_is_rejected_before_django_import(self):
        for url in ["", "sqlite:///:memory:",
                    self.env["CI_DATABASE_URL"].replace("127.0.0.1", "production.invalid"),
                    self.env["CI_DATABASE_URL"].replace("/flovers_ci", "/flovers"),
                    self.env["CI_DATABASE_URL"].replace(":5432", ":5433"),
                    self.env["CI_DATABASE_URL"] + "?options=unsafe"]:
            with self.subTest(url=url), self.assertRaises(RuntimeError):
                validate_environment({**self.env, "CI_DATABASE_URL": url})

    def test_loopback_guard_blocks_hostnames_and_external_addresses(self):
        calls = []
        def connect(sock, address):
            calls.append(address)
        with patch.object(socket.socket, "connect", connect), patch.object(socket.socket, "connect_ex", connect):
            install_loopback_guard()
            with socket.socket() as sock:
                for address in [("smtp.gmail.com", 587), ("192.168.0.1", 25), ("8.8.8.8", 443)]:
                    with self.assertRaises(RuntimeError):
                        sock.connect(address)
                sock.connect(("127.0.0.1", 1025))
        self.assertEqual(calls, [("127.0.0.1", 1025)])

    def test_container_commands_require_exact_owned_service_labels(self):
        container = "a" * 64
        info = {"Id": container, "Config": {"Image": "redis:7.4.7-alpine", "Labels": {
            "flovers.integration": "celery", "flovers.integration.run": "123-1",
            "flovers.integration.role": "redis"}}}
        validate_container(info, container_id=container, run="123-1", role="redis")
        with patch("integration.celery.safety.subprocess.run", return_value=SimpleNamespace(stdout=json.dumps([info]))) as command:
            with self.assertRaises(RuntimeError):
                container_action(container, run="another-run", role="redis", action="restart")
            self.assertEqual(command.call_count, 1)  # inspect only; never restart
        for value in ["redis", "a" * 12, "--all", ""]:
            with self.subTest(container=value), patch("integration.celery.safety.subprocess.run") as command:
                with self.assertRaises(RuntimeError):
                    container_action(value, run="123-1", role="redis", action="restart")
                command.assert_not_called()

    def test_container_commands_reject_unexpected_images_and_actions(self):
        info = {"Id": "a" * 64, "Config": {"Image": "production-redis", "Labels": {}}}
        with self.assertRaises(RuntimeError):
            validate_container(info, container_id="a" * 64, run="123-1", role="redis")
        with patch("integration.celery.safety.subprocess.run") as command:
            with self.assertRaises(RuntimeError):
                container_action("a" * 64, run="123-1", role="redis", action="rm")
            command.assert_not_called()

    def test_smtp_rejects_real_recipients_before_connecting(self):
        from integration.celery.smtp import SyntheticSMTPBackend
        backend = SimpleNamespace(host="127.0.0.1", port=1025)
        for recipient in ["customer@gmail.com", "Someone <customer@real.example>", "invalid"]:
            message = SimpleNamespace(recipients=lambda: [recipient])
            with self.subTest(recipient=recipient), self.assertRaises(RuntimeError):
                SyntheticSMTPBackend.send_messages(backend, [message])

    def test_smtp_rejects_other_transport_endpoints(self):
        from integration.celery.smtp import SyntheticSMTPBackend
        for host, port in [("smtp.gmail.com", 587), ("127.0.0.1", 25)]:
            with self.subTest(host=host, port=port), self.assertRaises(RuntimeError):
                SyntheticSMTPBackend.send_messages(SimpleNamespace(host=host, port=port), [])


if __name__ == "__main__":
    unittest.main()
