"""Disposable smoke server: production dotenv and external delivery are forbidden."""
import ipaddress
import socket
import os
import tempfile
from pathlib import Path
from app.ci_settings import *  # noqa: F403

DEBUG = False
SITE_URL = PUBLIC_WEB_BASE = PUBLIC_BASE_URL = "http://127.0.0.1:8000"
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
ALLOWED_HOSTS = ["127.0.0.1", "localhost", "testserver"]
_storage = Path(os.environ.get("E2E_STORAGE_ROOT", str(Path(tempfile.gettempdir()) / "flovers-e2e-local"))).resolve()
_temp_root = Path(os.environ.get("RUNNER_TEMP", tempfile.gettempdir())).resolve()
if not _storage.is_relative_to(_temp_root) or _storage == _temp_root:
    raise RuntimeError("E2E storage must be a child of disposable temporary storage")
MEDIA_ROOT = _storage / "media"
PRIVATE_MEDIA_ROOT = _storage / "private"
STATIC_ROOT = _storage / "static"

_connect = socket.socket.connect


def _local_connect(sock, address):
    if sock.family in (socket.AF_INET, socket.AF_INET6):
        host = address[0]
        if host != "localhost":
            try:
                allowed = ipaddress.ip_address(host).is_loopback
            except ValueError:
                allowed = False
            if not allowed:
                raise RuntimeError(f"E2E server denied external connection: {host}")
    return _connect(sock, address)


socket.socket.connect = _local_connect
