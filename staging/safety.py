"""Fail closed before settings import or Docker operations."""
import os
import re
import socket
from urllib.parse import urlsplit


def validate_environment(env):
    run = env.get("FLOVERS_STAGING_RUN", "")
    if env.get("FLOVERS_STAGING") != "1" or not re.fullmatch(r"[0-9]+-[0-9]+", run):
        raise RuntimeError("An explicit disposable GitHub staging run is required")
    expected = {
        "DATABASE_URL": "postgresql://flovers_stage:synthetic-only@postgres:5432/flovers_stage",
        "CELERY_BROKER_URL": "redis://redis:6379/0",
        "CELERY_RESULT_BACKEND": "redis://redis:6379/1",
        "THROTTLE_CACHE_URL": "redis://redis:6379/2",
        "PRIVATE_MEDIA_ROOT": "/app/private-media",
        "LOAD_DOTENV": "False",
    }
    if any(env.get(k) != v for k, v in expected.items()):
        raise RuntimeError("Only the declared disposable services and storage are permitted")
    if any(env.get(k) for k in ("FCM_SERVICE_ACCOUNT_PATH", "GOOGLE_APPLICATION_CREDENTIALS",
                                "EMAIL_HOST_PASSWORD", "CELERY_BROKER_READ_URL", "CELERY_BROKER_WRITE_URL")):
        raise RuntimeError("External provider credentials/transports are forbidden")
    return run


def install_network_guard():
    """Only Compose peers and loopback; reject external names before DNS."""
    if getattr(socket.getaddrinfo, "_flovers_staging", False) is True:
        return
    resolve = socket.getaddrinfo
    connect, connect_ex = socket.socket.connect, socket.socket.connect_ex
    peers = {"postgres", "redis", "web", "localhost", "127.0.0.1", "::1"}
    addresses = {"127.0.0.1", "::1"}
    for peer in ("postgres", "redis", "web"):
        try:
            addresses.update(row[4][0] for row in resolve(peer, None))
        except socket.gaierror:
            # web does not exist yet during migration. Resolve it lazily below.
            pass

    def guarded_resolve(host, *args, **kwargs):
        if host not in peers and host not in addresses:
            raise OSError("Staging denied a non-test hostname before DNS")
        result = resolve(host, *args, **kwargs)
        addresses.update(row[4][0] for row in result)
        return result

    def check(address):
        if isinstance(address, tuple) and address[0] not in addresses:
            raise OSError("Staging denied a non-test socket destination")

    def guarded_connect(sock, address):
        check(address)
        return connect(sock, address)

    def guarded_connect_ex(sock, address):
        check(address)
        return connect_ex(sock, address)

    guarded_resolve._flovers_staging = True
    socket.getaddrinfo = guarded_resolve
    socket.socket.connect, socket.socket.connect_ex = guarded_connect, guarded_connect_ex


def validate_container(info, *, project, role):
    labels = info.get("Config", {}).get("Labels") or {}
    if (not re.fullmatch(r"flovers-stage-[0-9]+-[0-9]+", project)
            or labels.get("com.docker.compose.project") != project
            or labels.get("flovers.staging") != "disposable"
            or labels.get("flovers.staging.role") != role
            or labels.get("flovers.staging.run") != project.removeprefix("flovers-stage-")
            or role not in {"postgres", "redis", "web", "worker", "beat", "verify", "init"}):
        raise RuntimeError("Refusing to control a container outside this staging run")


def safe_base_url(value):
    url = urlsplit(value)
    if (url.scheme not in {"http", "https"} or not url.hostname or url.username or url.password
            or url.path not in {"", "/"} or url.query or url.fragment):
        raise ValueError("Provide an explicit origin without credentials, path, query or fragment")
    return value.rstrip("/")
