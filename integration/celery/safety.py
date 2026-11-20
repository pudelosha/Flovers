"""Fail closed before importing application settings or controlling containers."""
import ipaddress
import json
import re
import socket
import subprocess
from urllib.parse import urlsplit


def validate_environment(env):
    if env.get("FLOVERS_INTEGRATION") != "1":
        raise RuntimeError("Explicit FLOVERS_INTEGRATION=1 is required")
    run = env.get("FLOVERS_INTEGRATION_RUN", "")
    if not re.fullmatch(r"[a-zA-Z0-9-]{1,60}", run):
        raise RuntimeError("A unique integration run identifier is required")
    url = urlsplit(env.get("CI_DATABASE_URL", ""))
    if (url.scheme not in {"postgres", "postgresql"} or url.hostname != "127.0.0.1"
            or url.port != 5432 or url.path != "/flovers_ci"
            or url.username != "flovers_ci" or url.password != "flovers_ci"
            or url.query or url.fragment):
        raise RuntimeError("Only the disposable loopback flovers_ci PostgreSQL is allowed")
    return run


def install_loopback_guard():
    if getattr(socket.socket.connect, "_flovers_integration", False):
        return
    connect, connect_ex = socket.socket.connect, socket.socket.connect_ex

    def check(address):
        if not isinstance(address, tuple):
            return  # local Unix-domain sockets
        try:
            if ipaddress.ip_address(address[0]).is_loopback:
                return
        except ValueError:
            pass
        raise RuntimeError("Integration subprocesses may connect only to loopback")

    def guarded(sock, address):
        check(address)
        return connect(sock, address)

    def guarded_ex(sock, address):
        check(address)
        return connect_ex(sock, address)

    guarded._flovers_integration = True
    socket.socket.connect = guarded
    socket.socket.connect_ex = guarded_ex


def validate_container(info, *, container_id, run, role):
    if not re.fullmatch(r"[0-9a-f]{64}", container_id or ""):
        raise RuntimeError("An exact disposable container ID is required")
    labels = info.get("Config", {}).get("Labels") or {}
    images = {"postgres": "postgres:16-alpine", "redis": "redis:7.4.7-alpine",
              "mailpit": "axllent/mailpit:v1.34.0"}
    if (info.get("Id") != container_id or role not in images
            or info.get("Config", {}).get("Image") != images[role]
            or labels.get("flovers.integration") != "celery"
            or labels.get("flovers.integration.run") != run
            or labels.get("flovers.integration.role") != role):
        raise RuntimeError("Refusing to control a container not owned by this integration run")


def container_action(container_id, *, run, role, action):
    if action not in {"pause", "unpause", "restart"} or role not in {"redis", "mailpit"}:
        raise RuntimeError("Unsupported integration container action")
    if not re.fullmatch(r"[0-9a-f]{64}", container_id or ""):
        raise RuntimeError("An exact disposable container ID is required")
    result = subprocess.run(["docker", "inspect", container_id], check=True,
                            capture_output=True, text=True, timeout=15)
    info = json.loads(result.stdout)[0]
    validate_container(info, container_id=container_id, run=run, role=role)
    subprocess.run(["docker", action, container_id], check=True,
                   capture_output=True, text=True, timeout=30)
