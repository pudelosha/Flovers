"""Exercise deployment ordering/failures without Docker, SSH, or a database."""
import copy
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch

import deploy_backend


SHA = "a" * 40
REPOSITORY = deploy_backend.IMAGE_REPOSITORY
DIGEST = f"{REPOSITORY}@sha256:{'b' * 64}"
SERVICES = {
    "web": {"image": f"{REPOSITORY}:latest", "environment": {"SECRET_KEY": "private-test-marker"}},
    "worker": {"image": f"{REPOSITORY}:latest", "command": ["celery", "-A", "app", "worker"]},
    "beat": {"image": f"{REPOSITORY}:latest", "command": "celery -A app beat"},
    "db": {"image": "postgres:16"},
    "redis": {"image": "redis:7"},
    "proxy": {"image": "traefik:3"},
}


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.app_dir = Path(self.temporary.name)
        (self.app_dir / "docker-compose.prod.yml").write_text("services: {}", encoding="utf-8")
        self.services = copy.deepcopy(SERVICES)
        self.running = "web\nworker\nbeat\ndb\nredis\nproxy\n"
        self.digests = [DIGEST]
        self.help_text = "--wait --wait-timeout"
        self.calls = []
        self.overrides = []
        self.fail_at = None
        self.stdout = io.StringIO()
        self.addCleanup(patch.stopall)
        patch("deploy_backend.subprocess.run", side_effect=self.docker).start()

    def docker(self, command, **kwargs):
        if command[:2] == ["docker", "pull"]:
            action, stdout = "pull", ""
        elif command[:3] == ["docker", "image", "inspect"]:
            action, stdout = "inspect", json.dumps(self.digests)
        elif command[:3] == ["docker", "image", "prune"]:
            action, stdout = "prune", ""
        elif command == ["docker", "compose", "up", "--help"]:
            action, stdout = "help", self.help_text
        elif "config" in command:
            action, stdout = "config", json.dumps({"services": self.services})
        elif "ps" in command:
            action, stdout = "ps", self.running
        elif "run" in command:
            action, stdout = ("migrate" if "migrate" in command else "check"), ""
        elif "stop" in command:
            action, stdout = "stop", ""
        elif "up" in command:
            action, stdout = "up", ""
        else:
            self.fail(f"Unexpected Docker command: {command}")
        self.calls.append((action, command, kwargs))
        if command.count("-f") == 2:
            last_file_flag = len(command) - 1 - command[::-1].index("-f")
            override = Path(command[last_file_flag + 1])
            self.overrides.append(json.loads(override.read_text(encoding="utf-8")))
        if self.fail_at == action:
            raise subprocess.CalledProcessError(1, command)
        return subprocess.CompletedProcess(command, 0, stdout=stdout)

    def deploy(self, **kwargs):
        with redirect_stdout(self.stdout):
            return deploy_backend.deploy(SHA, self.app_dir, **kwargs)

    def actions(self):
        return [action for action, _, _ in self.calls]

    def command(self, action):
        return next(command for name, command, _ in self.calls if name == action)

    def assert_override_removed(self):
        self.assertEqual(list(self.app_dir.glob(".flovers-deploy-*")), [])

    def test_success_pins_migration_and_startup_and_preserves_infrastructure(self):
        self.deploy()
        self.assertEqual(self.actions(), ["config", "ps", "help", "pull", "inspect", "check", "stop", "migrate", "up", "prune"])
        self.assertEqual(self.command("pull"), ["docker", "pull", f"{REPOSITORY}:{SHA}"])
        expected = {"services": {name: {"image": DIGEST} for name in ("beat", "web", "worker")}}
        self.assertTrue(self.overrides)
        self.assertTrue(all(override == expected for override in self.overrides))
        for action in ("stop", "up"):
            command = self.command(action)
            self.assertEqual(command[-3:], ["beat", "web", "worker"])
            self.assertTrue({"db", "redis", "proxy"}.isdisjoint(command))
        self.assertEqual(self.command("migrate")[-4:], ["web", "manage.py", "migrate", "--noinput"])
        self.assertEqual(self.command("check")[-4:], ["manage.py", "check", "--tag", "models"])
        for action in ("check", "migrate"):
            command = self.command(action)
            self.assertIn("--no-deps", command)
            self.assertEqual(command[command.index("--pull") + 1], "never")
            self.assertEqual(command[command.index("--label") + 1], "traefik.enable=false")
            self.assertEqual(command[command.index("--entrypoint") + 1], "python")
        startup = self.command("up")
        for flag in ("--no-deps", "--no-build", "--wait"):
            self.assertIn(flag, startup)
        self.assertEqual(startup[startup.index("--pull") + 1], "never")
        self.assertNotIn("--entrypoint", startup)
        self.assert_override_removed()

    def test_runtime_configuration_is_captured_and_never_printed(self):
        self.deploy()
        config_call = next(call for call in self.calls if call[0] == "config")
        self.assertTrue(config_call[2]["capture_output"])
        self.assertNotIn("private-test-marker", self.stdout.getvalue())
        self.assertTrue(all(call[2]["check"] and call[2]["cwd"] == self.app_dir for call in self.calls))

    def test_single_application_service_does_not_require_workers(self):
        self.services = {"web": SERVICES["web"], "db": SERVICES["db"]}
        self.deploy()
        self.assertEqual(self.command("stop")[-2:], ["stop", "web"])
        self.assertEqual(self.command("up")[-1], "web")

    def test_custom_backend_name_is_inferred_from_commands(self):
        self.services["flowers-server"] = self.services.pop("web")
        self.deploy()
        self.assertEqual(self.command("migrate")[-4], "flowers-server")

    def test_explicit_backend_name_resolves_ambiguous_configuration(self):
        self.services["management"] = {"image": f"{REPOSITORY}:latest", "command": "python admin_jobs.py"}
        self.services["flowers-server"] = self.services.pop("web")
        self.deploy(requested_backend="flowers-server")
        self.assertEqual(self.command("migrate")[-4], "flowers-server")
        self.assertIn("management", self.command("stop"))

    def test_ambiguous_backend_fails_before_pull_or_downtime(self):
        self.services = {name: {"image": f"{REPOSITORY}:latest"} for name in ("first", "second")}
        with self.assertRaisesRegex(ValueError, "BACKEND_SERVICE"):
            self.deploy()
        self.assertEqual(self.actions(), ["config", "ps"])

    def test_explicit_backend_must_use_application_image(self):
        with self.assertRaisesRegex(ValueError, "backend image"):
            self.deploy(requested_backend="db")
        self.assertNotIn("stop", self.actions())

    def test_profiles_only_include_running_or_explicitly_selected_services(self):
        self.services["optional"] = {"image": f"{REPOSITORY}:latest", "profiles": ["tools"]}
        self.services["active"] = {"image": f"{REPOSITORY}:latest", "profiles": ["extra"]}
        self.running += "active\n"
        self.deploy()
        self.assertIn("active", self.command("stop"))
        self.assertNotIn("optional", self.command("up"))

    def test_invalid_sha_is_rejected_without_running_commands(self):
        for sha in ("", "latest", "a" * 39, "a" * 40 + "; command"):
            with self.subTest(sha=sha), self.assertRaises(ValueError):
                deploy_backend.deploy(sha, self.app_dir)
        self.assertEqual(self.calls, [])

    def test_missing_compose_file_is_rejected_without_running_commands(self):
        (self.app_dir / "docker-compose.prod.yml").unlink()
        with self.assertRaisesRegex(ValueError, "docker-compose.prod.yml"):
            self.deploy()
        self.assertEqual(self.calls, [])

    def test_old_compose_is_rejected_before_pull_or_downtime(self):
        self.help_text = "old Compose help"
        with self.assertRaisesRegex(ValueError, "update Compose"):
            self.deploy()
        self.assertNotIn("pull", self.actions())
        self.assertNotIn("stop", self.actions())

    def test_failed_pull_or_preflight_keeps_existing_application_running(self):
        for failure in ("pull", "check"):
            with self.subTest(failure=failure):
                self.calls.clear()
                self.fail_at = failure
                with self.assertRaises(subprocess.CalledProcessError):
                    self.deploy()
                self.assertNotIn("stop", self.actions())
                self.assertNotIn("migrate", self.actions())
                self.assertNotIn("up", self.actions())
                self.assert_override_removed()

    def test_missing_registry_digest_is_rejected_before_downtime(self):
        for digests in ([], None, ["another/repository@sha256:123"]):
            with self.subTest(digests=digests):
                self.calls.clear()
                self.digests = digests
                with self.assertRaisesRegex(ValueError, "registry digest"):
                    self.deploy()
                self.assertNotIn("stop", self.actions())
                self.assert_override_removed()

    def test_stop_or_migration_failure_never_starts_application(self):
        for failure in ("stop", "migrate"):
            with self.subTest(failure=failure):
                self.calls.clear()
                self.fail_at = failure
                with self.assertRaises(subprocess.CalledProcessError):
                    self.deploy()
                self.assertNotIn("up", self.actions())
                self.assertNotIn("prune", self.actions())
                self.assert_override_removed()

    def test_startup_failure_is_propagated_and_skips_pruning(self):
        self.fail_at = "up"
        with self.assertRaises(subprocess.CalledProcessError):
            self.deploy()
        self.assertEqual(self.actions()[-2:], ["migrate", "up"])
        self.assert_override_removed()

    def test_main_returns_failure_exit_code(self):
        stderr = io.StringIO()
        with patch("deploy_backend.deploy", side_effect=ValueError("Invalid configuration")), redirect_stderr(stderr):
            self.assertEqual(deploy_backend.main(), 1)
        self.assertIn("Backend deployment failed: Invalid configuration", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
