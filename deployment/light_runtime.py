"""Explicit migration-free process configuration; never execute a shell on startup."""
import hashlib
import json
import re
import shlex


READ_ONLY_OPTIONS = "-c default_transaction_read_only=on -c statement_timeout=30000 -c lock_timeout=3000"

# PGOPTIONS is supplied before Python/Django starts, including AppConfig.ready().
# No call to migrate, MigrationExecutor.migrate(), signals or schema_editor occurs.
MIGRATION_CHECK = '''import hashlib,json,os
os.environ.setdefault("DJANGO_SETTINGS_MODULE","app.settings")
from django.db.backends.signals import connection_created
def enforce_read_only(sender,connection,**kwargs):
    if connection.vendor != "postgresql":
        raise RuntimeError("LIGHT requires PostgreSQL")
    with connection.cursor() as cursor:
        cursor.execute("SHOW default_transaction_read_only")
        if cursor.fetchone() != ("on",):
            raise RuntimeError("Migration inspection must be read-only before application startup")
connection_created.connect(enforce_read_only,weak=False)
import django
django.setup()
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.core.checks import run_checks
if connection.vendor != "postgresql":
    raise RuntimeError("LIGHT requires PostgreSQL")
if any(e.is_serious() for e in run_checks(tags=["models"])):
    raise RuntimeError("Django model validation failed")
with connection.cursor() as cursor:
    cursor.execute("SHOW default_transaction_read_only")
    if cursor.fetchone() != ("on",):
        raise RuntimeError("Read-only inspection was not enforced")
executor=MigrationExecutor(connection)
executor.loader.check_consistent_history(connection)
if executor.loader.detect_conflicts():
    raise RuntimeError("Conflicting migration graph")
if executor.migration_plan(executor.loader.graph.leaf_nodes()):
    raise RuntimeError("LIGHT refuses pending migrations; use FULL after recovery preparation")
applied=sorted([list(key) for key in executor.loader.applied_migrations])
fingerprint=hashlib.sha256(json.dumps(applied,separators=(",",":")).encode()).hexdigest()
connection.close()
print("FLOVERS_MIGRATIONS="+json.dumps({"pending":0,"applied_sha256":fingerprint,"read_only":True}))
'''


def migration_result(output):
    lines = [line[len("FLOVERS_MIGRATIONS="):] for line in output.splitlines()
             if line.startswith("FLOVERS_MIGRATIONS=")]
    if len(lines) != 1 or len(lines[0]) > 1024:
        raise ValueError("A single bounded migration inspection result is required")
    result = json.loads(lines[0])
    if (result.get("pending") != 0 or result.get("read_only") is not True
            or not re.fullmatch(r"[0-9a-f]{64}", result.get("applied_sha256", ""))):
        raise ValueError("Migration-free read-only inspection did not pass")
    return result


def _argv(command):
    if isinstance(command, str):
        command = shlex.split(command)
    if not isinstance(command, list) or not command or not all(isinstance(v, str) for v in command):
        raise ValueError("An explicit supported application command is required")
    if command[0] in {"bash", "sh", "/bin/bash", "/bin/sh"}:
        if len(command) != 3 or command[1] not in {"-c", "-lc"}:
            raise ValueError("Unsupported startup shell")
        command = shlex.split(command[2])
    # Remove only the known legacy migration prefix; never execute even a no-op
    # migrate, which emits post_migrate and can update permissions/content types.
    if command[:3] in (["python", "manage.py", "migrate"], ["python3", "manage.py", "migrate"]):
        if "&&" not in command:
            raise ValueError("Legacy migration command has no application process")
        end = command.index("&&")
        if any(arg not in {"--noinput", "--no-input"} for arg in command[3:end]):
            raise ValueError("Unsupported legacy migration arguments")
        command = command[end + 1:]
    if command and command[0] == "exec":
        command = command[1:]
    if (not command or len(command) > 64 or sum(map(len, command)) > 4096
            or any(re.search(r"[;&|<>`$()\n\r]", arg) for arg in command)):
        raise ValueError("Shell expansion, compound commands and substitutions are refused in LIGHT")
    return command


def runtime_services(configuration, backend, apps, images=None):
    """Keep process arguments/mounts, but explicitly clear image entrypoints."""
    result = {}
    roles = {}
    for name in apps:
        spec = configuration["services"][name]
        command = _argv(spec.get("command"))
        if name == backend:
            if (command[0] != "gunicorn" or command.count("app.wsgi:application") != 1
                    or any(arg.split("=", 1)[0] in {"-c", "--config", "--paste", "--pythonpath", "--chdir", "--env", "-e", "--raw-env"} for arg in command)):
                raise ValueError("LIGHT requires the reviewed direct Gunicorn app.wsgi:application command")
            role = "web"
        else:
            if (command[:3] != ["celery", "-A", "app"] or len(command) < 4
                    or command[3] not in {"worker", "beat"}
                    or any(arg.split("=", 1)[0] in {"--broker", "-b", "--config", "--loader", "--include", "-I"} for arg in command[4:])):
                raise ValueError("LIGHT supports only the reviewed app Celery worker and Beat commands")
            role = command[3]
        roles[name] = role
        result[name] = {"entrypoint": [], "command": command}
        if images is not None:
            result[name]["image"] = images[name]
    if sorted(roles.values()) != ["beat", "web", "worker"]:
        raise ValueError("LIGHT requires exactly one web, worker and Beat")
    return result, roles


def identity(records):
    """A restart, replacement, pause, OOM or stopped writer invalidates preflight."""
    result = []
    for record in records:
        state = record.get("State", {})
        if (state.get("Status") != "running" or state.get("Paused") or state.get("Restarting")
                or state.get("OOMKilled") or state.get("Health", {}).get("Status", "healthy") != "healthy"):
            raise ValueError("Current application containers must be running, unpaused and healthy")
        result.append({"id": record["Id"], "image": record["Image"],
                       "started": state["StartedAt"], "restarts": record.get("RestartCount", 0),
                       "service": record["Config"].get("Labels", {}).get("com.docker.compose.service")})
    return sorted(result, key=lambda row: row["service"] or "")


def validate_running_configuration(configuration, records, runtime):
    project=configuration.get("name", "")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*",project):
        raise ValueError("Explicit Compose project identity required")
    for record in records:
        config=record["Config"]
        labels=config.get("Labels", {})
        name=labels.get("com.docker.compose.service")
        if (name not in runtime or labels.get("com.docker.compose.project") != project
                or config.get("Entrypoint") not in (None, [])
                or _argv(config.get("Cmd")) != runtime[name]["command"]):
            raise ValueError("Running process configuration differs from Compose")
        spec=configuration["services"][name]
        actual_env=dict(value.split("=",1) for value in config.get("Env",[]) if "=" in value)
        for key,value in spec.get("environment",{}).items():
            if (value is None and key in actual_env) or (value is not None and actual_env.get(key) != str(value)):
                raise ValueError("Running environment differs from Compose")
        actual_mounts={m["Destination"]:m for m in record.get("Mounts",[])}
        mounts=spec.get("volumes",[])
        if set(actual_mounts) != {m.get("target") for m in mounts if isinstance(m,dict)}:
            raise ValueError("Running persistent mounts differ from Compose")
        for mount in mounts:
            if not isinstance(mount,dict) or mount.get("type") not in {"volume","bind"}:
                raise ValueError("LIGHT requires explicit bind/volume mount definitions")
            actual=actual_mounts[mount["target"]]
            source=mount["source"]
            if mount["type"] == "volume":
                source=configuration.get("volumes",{}).get(source,{}).get("name")
            if (not source or actual.get("Type") != mount["type"]
                    or actual.get("Name" if mount["type"] == "volume" else "Source") != source
                    or actual.get("RW") != (not mount.get("read_only",False))):
                raise ValueError("Persistent mount identity or permissions differ from Compose")
