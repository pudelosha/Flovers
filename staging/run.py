"""Build once, rehearse release safety, retain evidence, destroy this run's stack."""
from contextlib import contextmanager
import json
import os
from pathlib import Path
import platform
import re
import subprocess
import sys
import time
import traceback
import xml.etree.ElementTree as ET

from staging.safety import validate_container

ROOT = Path(__file__).resolve().parent.parent
RESULTS = ROOT / "test-results/staging"
REQUIRED = ["exact_image_build", "isolated_services", "previous_schema_fixture", "backup_restore",
    "existing_media_checkpoint", "forward_migrations", "constraints_and_indexes", "idempotent_startup",
    "web_worker_beat_readiness", "api_permission_boundaries", "media_integrity", "read_only_smoke",
    "dependency_outage_recovery", "same_image_redeployment", "runtime_isolation", "cleanup",
    "light_pending_migrations_inspected_readonly", "light_current_schema_readonly"]


class Runner:
    def __init__(self):
        run = os.environ.get("FLOVERS_STAGING_RUN", "")
        if (platform.system() != "Linux" or os.environ.get("GITHUB_ACTIONS") != "true"
                or not re.fullmatch(r"[0-9]+-[0-9]+", run)
                or run != f"{os.environ.get('GITHUB_RUN_ID')}-{os.environ.get('GITHUB_RUN_ATTEMPT')}"
                or os.environ.get("DOCKER_HOST") or os.environ.get("DOCKER_CONTEXT") not in {None, "default"}):
            raise RuntimeError("This destructive rehearsal runs only on its disposable GitHub-hosted Linux runner")
        self.run = run
        self.project = "flovers-stage-" + run
        self.env = {**os.environ, "COMPOSE_PROJECT_NAME": self.project,
                    "FLOVERS_STAGE_RESULTS": str(RESULTS)}
        self.compose = ["docker", "compose", "--project-name", self.project,
                        "--file", str(ROOT / "staging/compose.yml")]
        self.cases = {}
        self.image = None
        self.logs = 0
        RESULTS.mkdir(parents=True, exist_ok=True)
        RESULTS.chmod(0o777)  # Only synthetic reports; application UID differs from the host runner.

    def execute(self, command, *, timeout=120, capture=False, input_file=None, output_file=None):
        self.logs += 1
        path = RESULTS / f"command-{self.logs:02d}.log"
        print("Running:", " ".join(command), flush=True)
        with path.open("wb") as log:
            result = subprocess.run(command, cwd=ROOT, env=self.env, timeout=timeout, check=False,
                stdin=input_file, stdout=subprocess.PIPE if capture else (output_file or log),
                stderr=log if output_file or capture else subprocess.STDOUT)
        if result.returncode:
            raise RuntimeError(f"Command failed ({result.returncode}); see {path.name}")
        return result.stdout.decode("utf8") if capture else None

    def dc(self, *args, **kwargs):
        return self.execute([*self.compose, *args], **kwargs)

    def verify(self, action, *args, timeout=120):
        self.dc("run", "--rm", "--no-deps", "--pull", "never", "-T", "verify",
                "-m", "staging.rehearsal", action, *args, timeout=timeout)

    @contextmanager
    def case(self, name):
        assert name in REQUIRED and name not in self.cases
        started = time.monotonic()
        print(f"VERIFY {name}", flush=True)
        try:
            yield
        except BaseException:
            self.cases[name] = {"seconds": time.monotonic() - started, "failure": traceback.format_exc()}
            raise
        else:
            self.cases[name] = {"seconds": time.monotonic() - started}

    def build(self):
        self.execute(["docker", "version"], capture=True)
        self.execute(["docker", "compose", "version"], capture=True)
        assert self.execute(["docker", "context", "show"], capture=True).strip() == "default"
        tag = "flovers-disposable-staging:" + self.run
        self.execute(["docker", "build", "--progress", "plain", "--tag", tag,
                      "--file", "backend/Dockerfile", "backend"], timeout=1800)
        self.image = json.loads(self.execute(["docker", "image", "inspect", tag], capture=True))[0]["Id"]
        assert re.fullmatch(r"sha256:[0-9a-f]{64}", self.image)
        self.env["FLOVERS_STAGE_IMAGE"] = self.image
        lock = {"application": {"image_id": self.image, "source_commit": os.environ["GITHUB_SHA"],
                                "builds": 1, "dockerfile": "backend/Dockerfile"}}
        pins = json.loads((ROOT / "staging/images.lock.json").read_text(encoding="utf8"))["images"]
        for role in ["postgres", "redis"]:
            reference = pins[role]["reference"]
            assert re.fullmatch(role + r"@sha256:[0-9a-f]{64}", reference)
            self.execute(["docker", "pull", reference], timeout=240)
            record = json.loads(self.execute(["docker", "image", "inspect", reference], capture=True))[0]
            assert reference in record["RepoDigests"]
            lock[role] = {"reference": reference, "image_id": record["Id"], "resolved_from": pins[role]["tag"]}
            self.env["FLOVERS_STAGE_" + role.upper()] = reference
        (RESULTS / "image-digests.json").write_text(json.dumps(lock, indent=2), encoding="utf8")

    def container(self, role):
        ids = self.dc("ps", "--all", "--quiet", role, capture=True).split()
        assert len(ids) == 1, (role, ids)
        info = json.loads(self.execute(["docker", "inspect", ids[0]], capture=True))[0]
        validate_container(info, project=self.project, role=role)
        return info

    def healthy(self):
        containers = {role: self.container(role) for role in ["postgres", "redis", "web", "worker", "beat"]}
        for role, info in containers.items():
            assert info["State"]["Status"] == "running" and info["State"]["Health"]["Status"] == "healthy", role
            if role in {"web", "worker", "beat"}:
                assert info["Image"] == self.image, "Application image changed after migration"
        return containers

    def wait_apps(self, recreate=False):
        args = ["up", "--detach", "--no-deps", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "120"]
        if recreate:
            args.append("--force-recreate")
        self.dc(*args, "web", "worker", "beat", timeout=150)
        return self.healthy()

    def backup_restore(self):
        info = self.container("postgres")
        backup = RESULTS / "synthetic-previous-schema.dump"
        with backup.open("wb") as output:
            self.execute(["docker", "exec", info["Id"], "pg_dump", "-U", "flovers_stage", "-d", "flovers_stage", "-Fc"], output_file=output)
        assert backup.stat().st_size > 100
        self.execute(["docker", "exec", info["Id"], "createdb", "-U", "flovers_stage", "flovers_restore"])
        with backup.open("rb") as input_file:
            self.execute(["docker", "exec", "-i", info["Id"], "pg_restore", "-U", "flovers_stage", "-d", "flovers_restore", "--exit-on-error"], input_file=input_file)
        sql = "SELECT (SELECT count(*) FROM accounts_user), (SELECT count(*) FROM plant_instances_plantinstance), (SELECT count(*) FROM reminders_remindertask), (SELECT note FROM reminders_remindertask WHERE id=902);"
        result = self.execute(["docker", "exec", info["Id"], "psql", "-U", "flovers_stage", "-d", "flovers_restore", "-tAc", sql], capture=True)
        assert result.strip() == "3|1|2|Completed note", result
        (RESULTS / "backup-restore.json").write_text(json.dumps({"restored_to_separate_database": True,
            "accounts": 3, "plants": 1, "tasks": 2, "completed_note_preserved": True}), encoding="utf8")

    def outages(self):
        for role in ["postgres", "redis"]:
            info = self.container(role)
            self.execute(["docker", "stop", "--time", "10", info["Id"]], timeout=25)
            self.verify("failure", role)
            self.dc("up", "--detach", "--no-deps", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "90", role)
            self.wait_apps()
            self.verify("api")

    def isolation(self):
        infos = self.healthy()
        network = json.loads(self.execute(["docker", "network", "inspect", self.project + "_isolated"], capture=True))[0]
        assert network["Internal"] and network["Labels"]["flovers.staging.run"] == self.run
        for role, info in infos.items():
            assert set(info["NetworkSettings"]["Networks"]) == {self.project + "_isolated"}
            assert not info["HostConfig"]["PortBindings"], "Staging service exposed a host port"
            if role in {"web", "worker", "beat"}:
                assert info["Config"]["User"] == "10001:10001" and info["HostConfig"]["ReadonlyRootfs"]
        self.verify("isolation")
        (RESULTS / "runtime-containers.json").write_text(json.dumps({role: {
            "image_id": info["Image"], "health": info["State"]["Health"]["Status"],
            "private_volume": next((m["Name"] for m in info["Mounts"] if m["Destination"] == "/app/private-media"), None),
        } for role, info in infos.items()}, indent=2), encoding="utf8")

    def collect(self):
        # Diagnostics are best effort; collection failure is itself recorded, never a false test pass.
        try:
            for role in ["postgres", "redis", "web", "worker", "beat"]:
                ids = self.dc("ps", "--all", "--quiet", role, capture=True).split()
                if ids:
                    info = self.container(role)
                    (RESULTS / f"health-{role}.json").write_text(json.dumps({
                        "image_id": info["Image"], "state": info["State"],
                    }, indent=2), encoding="utf8")
            self.dc("logs", "--no-color", "--timestamps", timeout=30)
            self.dc("ps", "--all", "--format", "json", timeout=30)
        except Exception:
            (RESULTS / "diagnostic-failure.txt").write_text(traceback.format_exc(), encoding="utf8")

    def cleanup(self):
        if not self.image or not all(k in self.env for k in ["FLOVERS_STAGE_POSTGRES", "FLOVERS_STAGE_REDIS"]):
            # Build failed before services could be created. Verify that no run-owned containers exist.
            ids = self.execute(["docker", "ps", "--all", "--quiet", "--filter", "label=com.docker.compose.project=" + self.project], capture=True)
            assert not ids.strip()
            return
        self.collect()
        ids = self.execute(["docker", "ps", "--all", "--quiet", "--filter",
                            "label=com.docker.compose.project=" + self.project], capture=True).split()
        for container_id in ids:
            info = json.loads(self.execute(["docker", "inspect", container_id], capture=True))[0]
            role = (info["Config"].get("Labels") or {}).get("flovers.staging.role")
            validate_container(info, project=self.project, role=role)
        self.dc("down", "--volumes", "--remove-orphans", "--timeout", "10", timeout=90)
        remaining = {}
        for kind in ["container", "volume", "network"]:
            args = ["docker", kind, "ls", "--quiet"] + (["--all"] if kind == "container" else [])
            ids = self.execute([*args, "--filter", "label=com.docker.compose.project=" + self.project], capture=True)
            assert not ids.strip(), f"Staging {kind} cleanup incomplete"
            remaining[kind] = 0
        (RESULTS / "cleanup.json").write_text(json.dumps(remaining), encoding="utf8")

    def report(self):
        suite = ET.Element("testsuite", name="Disposable staging verification", tests=str(len(REQUIRED)),
                           failures=str(sum("failure" in v for v in self.cases.values()) + len(set(REQUIRED) - self.cases.keys())))
        for name in REQUIRED:
            result = self.cases.get(name, {"seconds": 0, "failure": "Not executed because an earlier required staging phase failed"})
            case = ET.SubElement(suite, "testcase", classname="staging.rehearsal", name=name,
                                 time=f"{result['seconds']:.3f}")
            if "failure" in result:
                ET.SubElement(case, "failure", message="Required staging verification failed").text = result["failure"]
        ET.ElementTree(suite).write(RESULTS / "results.xml", encoding="utf-8", xml_declaration=True)
        return len(self.cases) == len(REQUIRED) and all("failure" not in c for c in self.cases.values())

    def run_all(self):
        try:
            with self.case("exact_image_build"):
                self.build()
            with self.case("isolated_services"):
                self.dc("up", "--detach", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "90", "postgres", "redis")
                self.dc("run", "--rm", "--no-deps", "-T", "init")
            with self.case("previous_schema_fixture"):
                self.verify("legacy")
            with self.case("light_pending_migrations_inspected_readonly"):
                self.verify("light_pending")
            with self.case("backup_restore"):
                self.backup_restore()
            with self.case("existing_media_checkpoint"):
                self.verify("media_checkpoint")
            with self.case("forward_migrations"):
                self.verify("forward")
            with self.case("light_current_schema_readonly"):
                self.verify("light_current")
            with self.case("constraints_and_indexes"):
                self.verify("constraints")
            with self.case("idempotent_startup"):
                self.verify("idempotent")
            with self.case("web_worker_beat_readiness"):
                self.wait_apps()
                self.verify("celery")
            with self.case("api_permission_boundaries"):
                self.verify("api")
            with self.case("media_integrity"):
                self.verify("media")
            with self.case("read_only_smoke"):
                self.verify("readonly")
            with self.case("dependency_outage_recovery"):
                self.outages()
            with self.case("same_image_redeployment"):
                before = self.container("web")
                private = next(m["Name"] for m in before["Mounts"] if m["Destination"] == "/app/private-media")
                after = self.wait_apps(recreate=True)["web"]
                assert before["Id"] != after["Id"] and after["Image"] == before["Image"] == self.image
                assert private == next(m["Name"] for m in after["Mounts"] if m["Destination"] == "/app/private-media")
                self.verify("media")
                self.verify("readonly")
            with self.case("runtime_isolation"):
                self.isolation()
        except Exception:
            traceback.print_exc()
        finally:
            try:
                with self.case("cleanup"):
                    self.cleanup()
            except Exception:
                traceback.print_exc()
        return 0 if self.report() else 1


if __name__ == "__main__":
    raise SystemExit(Runner().run_all())
