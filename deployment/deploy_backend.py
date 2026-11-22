"""Run on the VPS: validate the new image, migrate, then start its application services."""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from release_safety import Safety, private_json, host_lock


IMAGE_REPOSITORY = "ghcr.io/pudelosha/flovers"
PRIVATE_MEDIA_PATH = "/app/private-media"
PRIVATE_MEDIA_OVERRIDE = "docker-compose.private-media.json"
RELEASE_OVERRIDE = "docker-compose.release.json"


def private_media_configuration(configuration, apps, app_dir):
    """Persist uploads separately from images and public catalogue media."""
    existing={name:next((m for m in configuration.get("services",{}).get(name,{}).get("volumes",[])
                        if isinstance(m,dict) and m.get("target")==PRIVATE_MEDIA_PATH),None) for name in apps}
    if any(existing.values()):
        if not all(existing.values()): raise ValueError("Private media must already be mounted in every application service")
        identities={(m.get("type"),m.get("source")) for m in existing.values()}
        if len(identities)!=1: raise ValueError("Application services must share the same private-media storage")
        kind,source=next(iter(identities))
        volumes={source:configuration["volumes"][source]} if kind=="volume" else {}
        return {"services":{name:{"environment":{"PRIVATE_MEDIA_ROOT":PRIVATE_MEDIA_PATH,"PRIVATE_MEDIA_REQUIRE_MOUNT":"True"},
                                  "volumes":[mount]} for name,mount in existing.items()},"volumes":volumes}
    project = configuration.get("name") or Path(app_dir).name
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]*", project):
        raise ValueError("Cannot derive a safe private-media volume name from the Compose project.")
    return {
        "services": {
            name: {
                "environment": {"PRIVATE_MEDIA_ROOT": PRIVATE_MEDIA_PATH, "PRIVATE_MEDIA_REQUIRE_MOUNT": "True"},
                "volumes": [{"type": "volume", "source": "flovers_private_media", "target": PRIVATE_MEDIA_PATH,
                             "volume": {"nocopy": True}}],
            }
            for name in apps
        },
        "volumes": {"flovers_private_media": {"name": f"{project}_private_media"}},
    }


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


def deploy(commit_sha, app_dir=Path("/opt/app"), requested_backend=None, expected_image=None):
    if not re.fullmatch(r"[0-9a-f]{40}", commit_sha):
        raise ValueError("DEPLOY_SHA must be the full Git commit SHA.")
    app_dir = Path(app_dir).resolve()
    compose_file = app_dir / "docker-compose.prod.yml"
    if not compose_file.is_file():
        raise ValueError("The existing /opt/app/docker-compose.prod.yml is required.")
    with host_lock(app_dir):
        return deploy_locked(commit_sha,app_dir,requested_backend,expected_image)


def deploy_locked(commit_sha,app_dir,requested_backend,expected_image):
    compose_file=app_dir/"docker-compose.prod.yml"
    base = ["docker", "compose", "-f", str(compose_file)]
    for name in (PRIVATE_MEDIA_OVERRIDE, RELEASE_OVERRIDE):
        if (app_dir/name).is_symlink(): raise ValueError("Deployment overlays must not be symlinks")
        if (app_dir/name).is_file(): base.extend(["-f",str(app_dir/name)])
    if expected_image is not None and not re.fullmatch(re.escape(IMAGE_REPOSITORY)+r"@sha256:[0-9a-f]{64}",expected_image):
        raise ValueError("The approved build's immutable digest is required")

    def execute(command, capture=False):
        return subprocess.run(command, cwd=app_dir, check=True, text=True, capture_output=capture)

    # Capture configuration privately: rendered Compose includes runtime secrets.
    configuration = json.loads(execute([*base, "config", "--format", "json"], capture=True).stdout)
    running = set(execute([*base, "ps", "--status", "running", "--services"], capture=True).stdout.split())
    backend, apps = application_services(configuration["services"], running, requested_backend)
    safety = Safety(app_dir,execute,configuration,backend,apps,commit_sha)
    try:
        safety.preflight(base)
        return perform_deploy(commit_sha,app_dir,base,execute,configuration,backend,apps,safety,expected_image)
    except BaseException:
        safety.failed()
        raise


def perform_deploy(commit_sha,app_dir,base,execute,configuration,backend,apps,safety,expected_image):
    private_media = private_media_configuration(configuration, apps, app_dir)
    help_text = execute(["docker", "compose", "up", "--help"], capture=True).stdout
    if "--wait-timeout" not in help_text:
        raise ValueError("Docker Compose must support up --wait and --wait-timeout; update Compose before deploying.")
    previous = previous_backend_images(base, backend, execute)
    previous |= {r["image_id"] for r in safety.metadata.get("previous",[])}
    image = f"{IMAGE_REPOSITORY}:{commit_sha}"
    print(f"Deploying {commit_sha}; Django service: {backend}; application services: {', '.join(apps)}", flush=True)
    execute(["docker", "pull", image])
    # Resolve the pulled tag to its immutable digest for migration/start parity.
    digests = json.loads(execute(["docker", "image", "inspect", "--format", "{{json .RepoDigests}}", image], capture=True).stdout)
    pinned_image = next((digest for digest in (digests or []) if re.fullmatch(re.escape(IMAGE_REPOSITORY)+r"@sha256:[0-9a-f]{64}",digest)), None)
    if pinned_image is None:
        raise ValueError("The pulled backend image has no registry digest; refusing an unpinned deployment.")
    if expected_image is not None and pinned_image != expected_image:
        raise ValueError("Pulled tag does not match the digest of the approved build")
    safety.capacity()
    safety.record("validated-image",image=pinned_image)
    # Keep this non-secret overlay for manual restarts/recovery as well as future
    # deployments. Never copy resolved Compose configuration or secrets into it.
    private_path = app_dir / PRIVATE_MEDIA_OVERRIDE
    private_json(private_path,private_media)
    descriptor, override_name = tempfile.mkstemp(prefix=".flovers-deploy-", suffix=".json", dir=app_dir)
    override_path = Path(override_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump({"services": {name: {"image": pinned_image} for name in apps}}, output)
        compose = [*base, "-f", str(private_path), "-f", str(override_path)]
        one_off = [
            *compose, "run", "--rm", "--no-deps", "--pull", "never", "-T",
            "--label", "traefik.enable=false", "--entrypoint", "python", backend, "manage.py",
        ]
        # Validate settings/models without importing URLs and loading a second
        # recognition model beside the live app on a small VPS. Migrate runs
        # full Django checks after the application writers have been stopped.
        execute([*one_off, "check", "--tag", "models"])
        safety.record("pausing-writers")
        print("Pausing application writers for database migrations.", flush=True)
        execute([*compose, "stop", *apps])
        safety.record("migrating")
        # Any failure here aborts before startup. Never auto-restart old writers
        # against a potentially partially upgraded schema.
        execute([*one_off, "migrate", "--noinput"])
        roles={backend:"web"}
        for name in apps:
            if name==backend: continue
            command=str(configuration["services"][name].get("command","")).lower()
            roles[name]="beat" if "celery" in command and "beat" in command else "worker" if "celery" in command and "worker" in command else "other"
        # Preserve exact image parity for migrations and all subsequent restarts.
        private_json(app_dir/RELEASE_OVERRIDE,{"services":{name:{"image":pinned_image} for name in apps}})
        safety.record("starting-web")
        try:
            for role in ("web","worker","other","beat"):
                for name in apps:
                    if roles[name]!=role: continue
                    safety.record("starting-"+role)
                    execute([*compose,"up","-d","--no-deps","--no-build","--pull","never","--wait","--wait-timeout","120",name])
                    safety.ready(compose,name,role)
            # A worker can fail while Beat starts; require a final complete pass.
            for name in apps: safety.ready(compose,name,roles[name])
        except BaseException:
            # Leave infrastructure/data untouched; stop partially started writers.
            try: execute([*compose,"stop",*apps])
            except (OSError,subprocess.CalledProcessError): pass
            raise
        safety.record("healthy")
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
        sha=os.environ.get("DEPLOY_SHA", "")
        if not sha or os.environ.get("DEPLOY_APPROVED_SHA")!=sha or not os.environ.get("DEPLOY_IMAGE"):
            raise ValueError("Explicit approved revision and build digest are required")
        deploy(sha, requested_backend=os.environ.get("BACKEND_SERVICE") or None,expected_image=os.environ["DEPLOY_IMAGE"])
    except Exception as exc:
        # Rendered configuration and service errors may contain runtime secrets.
        print(f"Backend deployment failed ({type(exc).__name__}); inspect private host-side release metadata.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
