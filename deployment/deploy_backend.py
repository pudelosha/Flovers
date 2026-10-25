"""Run on the VPS: validate the new image, migrate, then start its application services."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


IMAGE_REPOSITORY = "ghcr.io/pudelosha/flovers"


def image_repository(image):
    name = (image or "").split("@", 1)[0]
    return name.rsplit(":", 1)[0] if ":" in name.rsplit("/", 1)[-1] else name


def application_services(services, running, requested_backend=None):
    matching = {
        name: spec for name, spec in services.items()
        if image_repository(spec.get("image", "")) == IMAGE_REPOSITORY
    }
    if requested_backend:
        if requested_backend not in matching:
            raise ValueError("BACKEND_SERVICE must name a Compose service using the Flovers backend image.")
        backend = requested_backend
    else:
        named = [name for name in ("web", "backend", "api", "django") if name in matching and not matching[name].get("profiles")]
        if len(named) == 1:
            backend = named[0]
        else:
            candidates = []
            for name, spec in matching.items():
                command = spec.get("command") or []
                command = command if isinstance(command, str) else " ".join(command)
                if not spec.get("profiles") and "celery" not in command.lower():
                    candidates.append(name)
            if len(candidates) != 1:
                raise ValueError("Cannot identify the Django service; set the GitHub BACKEND_SERVICE variable.")
            backend = candidates[0]
    # Do not enable optional profiles simply because they use the same image.
    apps = sorted(name for name, spec in matching.items() if not spec.get("profiles") or name in running or name == backend)
    return backend, apps


def previous_backend_images(base, backend, execute):
    """Remember the actual previous deployment, rather than image creation order."""
    containers = execute([*base, "ps", "--all", "--quiet", backend], capture=True).stdout.split()
    if not containers:
        return set()
    records = json.loads(execute(["docker", "inspect", *containers], capture=True).stdout)
    return {record["Image"] for record in records}


def cleanup_backend_images(previous, execute):
    """Remove only obsolete Flovers tags; preserve every container's image."""
    containers = execute(["docker", "ps", "--all", "--quiet"], capture=True).stdout.split()
    if not containers:
        raise ValueError("No application containers found; skipping image cleanup.")
    records = json.loads(execute(["docker", "inspect", *containers], capture=True).stdout)
    used = {record["Image"] for record in records}
    if previous and set(previous).issubset(used):
        # Re-running the same release must not discard its existing rollback.
        print("Backend image unchanged; retaining existing rollback images.", flush=True)
        return
    keep = set(previous) | used
    ids = sorted(set(execute([
        "docker", "image", "ls", "--quiet", "--no-trunc", IMAGE_REPOSITORY,
    ], capture=True).stdout.split()))
    if not ids:
        return
    images = json.loads(execute(["docker", "image", "inspect", *ids], capture=True).stdout)
    for image in images:
        if image["Id"] in keep:
            continue
        tags = image.get("RepoTags") or []
        # Do not delete shared images, dangling images, or user-created tags.
        if not tags or not all(
            re.fullmatch(re.escape(IMAGE_REPOSITORY) + r":(?:[0-9a-f]{40}|latest)", tag)
            for tag in tags
        ):
            continue
        print(f"Removing obsolete backend image {image['Id']}", flush=True)
        # No --force: Docker also guards against containers created concurrently.
        execute(["docker", "image", "rm", *tags])


def deploy(commit_sha, app_dir=Path("/opt/app"), requested_backend=None):
    if not re.fullmatch(r"[0-9a-f]{40}", commit_sha):
        raise ValueError("DEPLOY_SHA must be the full Git commit SHA.")
    app_dir = Path(app_dir).resolve()
    compose_file = app_dir / "docker-compose.prod.yml"
    if not compose_file.is_file():
        raise ValueError("The existing /opt/app/docker-compose.prod.yml is required.")
    base = ["docker", "compose", "-f", str(compose_file)]

    def execute(command, capture=False):
        return subprocess.run(command, cwd=app_dir, check=True, text=True, capture_output=capture)

    # Capture configuration privately: rendered Compose includes runtime secrets.
    configuration = json.loads(execute([*base, "config", "--format", "json"], capture=True).stdout)
    running = set(execute([*base, "ps", "--status", "running", "--services"], capture=True).stdout.split())
    backend, apps = application_services(configuration["services"], running, requested_backend)
    help_text = execute(["docker", "compose", "up", "--help"], capture=True).stdout
    if "--wait-timeout" not in help_text:
        raise ValueError("Docker Compose must support up --wait and --wait-timeout; update Compose before deploying.")
    previous = previous_backend_images(base, backend, execute)
    image = f"{IMAGE_REPOSITORY}:{commit_sha}"
    print(f"Deploying {commit_sha}; Django service: {backend}; application services: {', '.join(apps)}", flush=True)
    execute(["docker", "pull", image])
    # Resolve the pulled tag to its immutable digest for migration/start parity.
    digests = json.loads(execute(["docker", "image", "inspect", "--format", "{{json .RepoDigests}}", image], capture=True).stdout)
    pinned_image = next((digest for digest in (digests or []) if digest.startswith(f"{IMAGE_REPOSITORY}@sha256:")), None)
    if pinned_image is None:
        raise ValueError("The pulled backend image has no registry digest; refusing an unpinned deployment.")
    descriptor, override_name = tempfile.mkstemp(prefix=".flovers-deploy-", suffix=".json", dir=app_dir)
    override_path = Path(override_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump({"services": {name: {"image": pinned_image} for name in apps}}, output)
        compose = [*base, "-f", str(override_path)]
        one_off = [
            *compose, "run", "--rm", "--no-deps", "--pull", "never", "-T",
            "--label", "traefik.enable=false", "--entrypoint", "python", backend, "manage.py",
        ]
        # Validate settings/models without importing URLs and loading a second
        # recognition model beside the live app on a small VPS. Migrate runs
        # full Django checks after the application writers have been stopped.
        execute([*one_off, "check", "--tag", "models"])
        print("Pausing application writers for database migrations.", flush=True)
        execute([*compose, "stop", *apps])
        # Any failure here aborts before startup. Never auto-restart old writers
        # against a potentially partially upgraded schema.
        execute([*one_off, "migrate", "--noinput"])
        execute([*compose, "up", "-d", "--no-deps", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "120", *apps])
        print("Migrations completed and application containers are running/healthy.", flush=True)
        try:
            cleanup_backend_images(previous, execute)
        except (ValueError, OSError, subprocess.CalledProcessError) as exc:
            # The application is already healthy. Report maintenance failures
            # without incorrectly marking a successful release as failed.
            print(f"WARNING: Backend image cleanup failed: {exc}", file=sys.stderr)
    finally:
        override_path.unlink(missing_ok=True)


def main():
    try:
        deploy(os.environ.get("DEPLOY_SHA", ""), requested_backend=os.environ.get("BACKEND_SERVICE") or None)
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        print(f"Backend deployment failed: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
