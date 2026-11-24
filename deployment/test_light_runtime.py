"""Migration-free release behavior, using synthetic processes and private files."""
import copy
import io
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from types import SimpleNamespace
from unittest.mock import Mock, patch

import deploy_backend as deploy
import light_runtime as runtime
import release_safety

SHA = "a" * 40
IMAGE = deploy.IMAGE_REPOSITORY + "@sha256:" + "b" * 64
APPS = ["web", "worker", "beat"]
CONFIG = {"name": "synthetic", "services": {
    "web": {"command": "sh -c 'python manage.py migrate --noinput && gunicorn app.wsgi:application --workers 3'"},
    "worker": {"command": ["celery", "-A", "app", "worker"]},
    "beat": {"command": ["celery", "-A", "app", "beat"]},
}}
RECEIPT = {"pending": 0, "read_only": True, "applied_sha256": "c" * 64}
START = deploy.light_start


class RuntimeTests(unittest.TestCase):
    def test_light_uses_no_full_policy_or_backup_but_full_still_requires_them(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = copy.deepcopy(CONFIG)
            for service in config["services"].values():
                service["volumes"] = [{"type": "volume", "source": "private", "target": "/app/private-media"}]
            records = [{"Id": name, "Name": name, "Image": "old", "RestartCount": 0,
                "State": {"Status": "running", "StartedAt": "fixed"},
                "Config": {"Image": "old", "Labels": {"com.docker.compose.service": name}}} for name in APPS]
            def execute(command, **kwargs):
                value = records if command[:2] == ["docker", "inspect"] else []
                return SimpleNamespace(stdout="web worker beat" if "ps" in command else json.dumps(value))
            light = release_safety.Safety(root, execute, config, "web", APPS, SHA, mode="LIGHT")
            with patch.object(light, "capacity"), patch("release_safety.http_ready"), \
                 patch("release_safety.verify_backups") as backups, \
                 patch.dict("os.environ", {"DEPLOY_RUN_ID": "456-1"}):
                light.preflight(["docker", "compose"])
                backups.assert_not_called()
            self.assertFalse(light.metadata["backup"]["verified"])
            self.assertEqual(light.metadata["mode"], "LIGHT")
            full = release_safety.Safety(root, execute, config, "web", APPS, SHA, mode="FULL")
            with self.assertRaisesRegex(ValueError, "deployment-policy"):
                full.preflight(["docker", "compose"])
            with self.assertRaises(ValueError):
                release_safety.Safety(root, execute, config, "web", APPS, SHA, mode="light")

    def test_light_low_memory_is_blocked_before_any_docker_mutation(self):
        guard = release_safety.Safety(Path("."), Mock(), CONFIG, "web", APPS, SHA, mode="LIGHT")
        guard.policy = {}
        with patch("release_safety.memory_available", return_value=511 * 1024**2), self.assertRaisesRegex(ValueError, "memory"):
            guard.capacity()
        guard.execute.assert_not_called()

    def test_supported_legacy_prefix_becomes_direct_process_without_migration(self):
        services, roles = runtime.runtime_services(CONFIG, "web", APPS)
        self.assertEqual(roles, dict(zip(APPS, ["web", "worker", "beat"])))
        self.assertEqual(services["web"]["command"], ["gunicorn", "app.wsgi:application", "--workers", "3"])
        self.assertTrue(all(value["entrypoint"] == [] for value in services.values()))

    def test_unknown_startup_commands_and_shell_hooks_fail_closed(self):
        for command in ["python manage.py migrate", "gunicorn app.wsgi:application && touch marker",
                        "gunicorn --config hooks.py app.wsgi:application", "./entrypoint.sh",
                        "gunicorn $(unsafe) app.wsgi:application", "python manage.py migrate --fake && gunicorn app.wsgi:application"]:
            config = copy.deepcopy(CONFIG)
            config["services"]["web"]["command"] = command
            with self.subTest(command=command), self.assertRaises(ValueError):
                runtime.runtime_services(config, "web", APPS)

    def test_migration_receipt_rejects_missing_duplicate_invalid_count_or_writable(self):
        marker = "FLOVERS_MIGRATIONS=" + json.dumps(RECEIPT)
        self.assertEqual(runtime.migration_result(marker), RECEIPT)
        self.assertEqual(runtime.migration_result("FLOVERS_MIGRATIONS=" + json.dumps({**RECEIPT,"pending":1}))["pending"],1)
        for output in ["", marker + "\n" + marker,
                       "FLOVERS_MIGRATIONS=" + json.dumps({**RECEIPT, "pending": -1}),
                       "FLOVERS_MIGRATIONS=" + json.dumps({**RECEIPT, "pending": True}),
                       "FLOVERS_MIGRATIONS=" + json.dumps({**RECEIPT, "read_only": False})]:
            with self.subTest(output=output), self.assertRaises(ValueError):
                runtime.migration_result(output)

    def test_configuration_identity_and_environment_drift_are_rejected(self):
        config = copy.deepcopy(CONFIG)
        config["services"]["web"]["environment"] = {"SECRET_KEY": "synthetic-only"}
        services, _ = runtime.runtime_services(config, "web", APPS)
        records = [{"Config": {"Labels": {"com.docker.compose.project": "synthetic", "com.docker.compose.service": "web"},
                    "Cmd": config["services"]["web"]["command"], "Env": ["SECRET_KEY=synthetic-only"]}, "Mounts": []}]
        runtime.validate_running_configuration(config, records, services)
        for key, value in [("Env", ["SECRET_KEY=drift"]), ("Entrypoint", ["/unsafe-hook"])]:
            altered = copy.deepcopy(records)
            altered[0]["Config"][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                runtime.validate_running_configuration(config, altered, services)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.guard = Mock()
        self.guard.directory = self.root / "history"
        self.guard.directory.mkdir()
        self.guard.metadata = {"previous": [{"service": name, "image_id": "sha256:old-" + name} for name in APPS]}
        self.execute = Mock(side_effect=self.docker)
        self.addCleanup(patch.stopall)
        patch("deploy_backend.private_media_configuration").start()
        self.unchanged = patch("deploy_backend.light_unchanged", return_value=[]).start()
        patch("light_runtime.validate_running_configuration").start()
        self.plan = patch("deploy_backend.inspect_light_migrations", return_value=RECEIPT).start()
        self.stop = patch("deploy_backend.light_stop").start()
        self.start = patch("deploy_backend.light_start").start()
        self.cleanup = patch("deploy_backend.cleanup_backend_images").start()

    def docker(self, command, **kwargs):
        if command == ["docker", "compose", "up", "--help"]:
            return SimpleNamespace(stdout="--wait-timeout")
        if command[:3] == ["docker", "image", "inspect"]:
            return SimpleNamespace(stdout=json.dumps([{"RepoDigests": [IMAGE], "Os": "linux", "Architecture": "amd64",
                "Config": {"Labels": {"org.opencontainers.image.revision": SHA}, "Entrypoint": []}}]))
        if command[:2] == ["docker", "pull"]:
            return SimpleNamespace(stdout="")
        if command[-3:] == ["manage.py","migrate","--noinput"]:
            self.assertTrue(self.stop.called)
            self.assertFalse(self.start.called)
            self.assertIn("--entrypoint",command)
            return SimpleNamespace(stdout="Synthetic forward migration applied")
        self.fail("Unexpected command: " + str(command))

    def run_release(self):
        with redirect_stdout(io.StringIO()):
            return deploy.perform_light_deploy(SHA, self.root, ["docker", "compose"], self.execute,
                                               CONFIG, "web", APPS, self.guard, IMAGE)

    def test_healthy_release_never_invokes_migrate_and_preserves_old_runtime(self):
        self.run_release()
        self.assertEqual(self.plan.call_count, 3)
        self.stop.assert_called_once()
        self.start.assert_called_once()
        self.assertTrue((self.guard.directory / "previous-runtime.json").is_file())
        saved = json.loads((self.root / deploy.RELEASE_OVERRIDE).read_text(encoding="utf8"))
        self.assertEqual(saved["services"]["web"]["image"], IMAGE)
        self.assertNotIn("migrate", saved["services"]["web"]["command"])
        self.guard.record.assert_any_call("healthy", migration_execution=False)

    def test_conflicting_candidate_history_aborts_before_stopping_old_services(self):
        self.plan.side_effect = [RECEIPT, ValueError("conflicting migrations")]
        with self.assertRaisesRegex(ValueError, "conflicting"):
            self.run_release()
        self.stop.assert_not_called()
        self.start.assert_not_called()

    def test_pending_migrations_run_once_after_writers_stop_before_startup(self):
        pending={**RECEIPT,"pending":1}
        migrated={**RECEIPT,"applied_sha256":"d"*64}
        self.plan.side_effect=[RECEIPT,pending,pending,migrated]
        self.run_release()
        commands=[c.args[0] for c in self.execute.call_args_list]
        self.assertEqual(sum(c[-3:]==["manage.py","migrate","--noinput"] for c in commands),1)
        self.start.assert_called_once()
        self.guard.record.assert_any_call("healthy",migration_execution=True)

    def test_migration_failure_does_not_restart_old_code_or_reverse_schema(self):
        pending={**RECEIPT,"pending":1}
        self.plan.side_effect=[RECEIPT,pending,pending]
        original=self.execute.side_effect
        def fail(command,**kwargs):
            if command[-3:]==["manage.py","migrate","--noinput"]:
                raise RuntimeError("synthetic migration failure")
            return original(command,**kwargs)
        self.execute.side_effect=fail
        with self.assertRaisesRegex(RuntimeError,"migration failure"):
            self.run_release()
        self.start.assert_not_called()
        self.assertEqual(self.guard.record.call_args.args[0],"recovery-required")
        self.assertEqual(self.plan.call_count,3)

    def test_successful_migration_then_unhealthy_start_refuses_old_schema_recovery(self):
        pending={**RECEIPT,"pending":1}
        migrated={**RECEIPT,"applied_sha256":"d"*64}
        self.plan.side_effect=[RECEIPT,pending,pending,migrated,migrated]
        self.start.side_effect=RuntimeError("candidate unhealthy")
        with self.assertRaisesRegex(RuntimeError,"candidate"):
            self.run_release()
        self.assertEqual(self.start.call_count,1)
        self.assertEqual(self.guard.record.call_args.args[0],"recovery-required")

    def test_configuration_drift_before_stopping_aborts_without_restart(self):
        self.unchanged.side_effect = [[], ValueError("configuration drift")]
        with self.assertRaisesRegex(ValueError, "drift"):
            self.run_release()
        self.stop.assert_not_called()

    def test_worker_or_beat_failure_recovers_previous_code_but_release_still_fails(self):
        for failure in ["web", "worker", "beat"]:
            with self.subTest(role=failure):
                self.start.reset_mock()
                self.start.side_effect = [RuntimeError(failure + " unhealthy"), None]
                with self.assertRaisesRegex(RuntimeError, "unhealthy"):
                    self.run_release()
                self.assertEqual(self.start.call_count, 2)
                restored = json.loads((self.root / deploy.RELEASE_OVERRIDE).read_text(encoding="utf8"))
                self.assertEqual(restored["services"]["web"]["image"], "sha256:old-web")
                self.assertNotIn("migrate", restored["services"]["web"]["command"])
                self.cleanup.assert_not_called()

    def test_changed_schema_during_failure_blocks_unsafe_automatic_recovery(self):
        self.start.side_effect = RuntimeError("candidate unhealthy")
        self.plan.side_effect = [RECEIPT, RECEIPT, RECEIPT, {**RECEIPT, "applied_sha256": "d" * 64}]
        with self.assertRaisesRegex(RuntimeError, "candidate"):
            self.run_release()
        self.assertEqual(self.start.call_count, 1)
        self.assertEqual(self.guard.record.call_args.args[0], "recovery-required")

    def test_post_stop_pending_migration_failure_attempts_safe_recovery(self):
        self.plan.side_effect = [RECEIPT, RECEIPT, ValueError("pending after stop"), RECEIPT]
        with self.assertRaisesRegex(ValueError, "pending"):
            self.run_release()
        self.start.assert_called_once()
        self.assertIn("previous-compose.json", str(self.start.call_args.args[0]))

    def test_startup_order_and_final_readiness_are_required(self):
        # Exercise the real helper independently of the orchestration mock.
        calls = Mock()
        START(["docker", "compose"], calls, APPS, dict(zip(APPS, ["web", "worker", "beat"])), self.guard)
        self.assertEqual([call.args[0][-1] for call in calls.call_args_list], APPS)
        self.assertEqual(self.guard.ready.call_count, 6)

