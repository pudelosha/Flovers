import copy
import os
import socket
import unittest
from unittest.mock import patch
from staging.safety import install_network_guard, validate_container, validate_environment


def environment():
    return {"FLOVERS_STAGING": "1", "FLOVERS_STAGING_RUN": "123-1", "LOAD_DOTENV": "False",
        "DATABASE_URL": "postgresql://flovers_stage:synthetic-only@postgres:5432/flovers_stage",
        "CELERY_BROKER_URL": "redis://redis:6379/0", "CELERY_RESULT_BACKEND": "redis://redis:6379/1",
        "THROTTLE_CACHE_URL": "redis://redis:6379/2", "PRIVATE_MEDIA_ROOT": "/app/private-media"}


class IsolationGuards(unittest.TestCase):
    def test_only_explicit_disposable_transports_are_accepted(self):
        self.assertEqual(validate_environment(environment()), "123-1")
        for key in ["DATABASE_URL", "CELERY_BROKER_URL", "CELERY_RESULT_BACKEND", "THROTTLE_CACHE_URL",
                    "PRIVATE_MEDIA_ROOT", "LOAD_DOTENV", "FLOVERS_STAGING", "FLOVERS_STAGING_RUN"]:
            env = environment()
            env[key] = "unapproved"
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                validate_environment(env)

    def test_external_credentials_and_override_transports_are_refused(self):
        for key in ["FCM_SERVICE_ACCOUNT_PATH", "GOOGLE_APPLICATION_CREDENTIALS", "EMAIL_HOST_PASSWORD",
                    "CELERY_BROKER_READ_URL", "CELERY_BROKER_WRITE_URL"]:
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                validate_environment({**environment(), key: "unapproved"})

    def test_foreign_container_control_is_refused(self):
        good = {"Config": {"Labels": {"com.docker.compose.project": "flovers-stage-123-1",
            "flovers.staging": "disposable", "flovers.staging.run": "123-1", "flovers.staging.role": "redis"}}}
        validate_container(good, project="flovers-stage-123-1", role="redis")
        for key in good["Config"]["Labels"]:
            bad = copy.deepcopy(good)
            bad["Config"]["Labels"][key] = "different"
            with self.subTest(key=key), self.assertRaises(RuntimeError):
                validate_container(bad, project="flovers-stage-123-1", role="redis")

    def test_non_test_name_is_rejected_before_real_dns(self):
        answer = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))]
        with patch("socket.getaddrinfo", return_value=answer) as resolve, \
                patch.object(socket.socket, "connect"), patch.object(socket.socket, "connect_ex"):
            install_network_guard()
            count = resolve.call_count
            with self.assertRaisesRegex(OSError, "before DNS"):
                socket.getaddrinfo("unapproved.example.invalid", 443)
            self.assertEqual(resolve.call_count, count)

    def test_runner_refuses_non_github_and_remote_docker(self):
        from staging.run import Runner
        for variables in [{}, {"GITHUB_ACTIONS": "true", "FLOVERS_STAGING_RUN": "123-1",
            "GITHUB_RUN_ID": "123", "GITHUB_RUN_ATTEMPT": "1", "DOCKER_HOST": "tcp://unapproved:2375"}]:
            with patch.dict(os.environ, variables, clear=True), self.assertRaises(RuntimeError):
                Runner()

    def test_missing_required_phase_is_a_failure_not_a_skip(self):
        import tempfile
        import xml.etree.ElementTree as ET
        from pathlib import Path
        from staging.run import Runner, REQUIRED
        runner = object.__new__(Runner)
        runner.cases = {REQUIRED[0]: {"seconds": 1}}
        with tempfile.TemporaryDirectory() as directory, patch("staging.run.RESULTS", Path(directory)):
            self.assertFalse(runner.report())
            report = ET.parse(Path(directory) / "results.xml")
            self.assertEqual(len(list(report.iter("testcase"))), len(REQUIRED))
            self.assertEqual(len(list(report.iter("failure"))), len(REQUIRED) - 1)
            self.assertEqual(len(list(report.iter("skipped"))), 0)
