"""Keep request throttles independent and isolate external I/O in CI."""
import ipaddress
import socket

import pytest
from django.conf import settings
from django.core.cache import cache


@pytest.fixture(autouse=True)
def independent_request_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def ci_loopback_network_only(monkeypatch):
    if settings.SETTINGS_MODULE != "app.ci_settings":
        return
    connect, connect_ex = socket.socket.connect, socket.socket.connect_ex

    def allowed(address):
        if not isinstance(address, tuple):  # local Unix-domain sockets
            return
        host = address[0]
        if host == "localhost":
            return
        try:
            if ipaddress.ip_address(host).is_loopback:
                return
        except ValueError:
            pass
        raise RuntimeError("External network access is disabled in CI tests")

    def local_connect(sock, address):
        allowed(address)
        return connect(sock, address)

    def local_connect_ex(sock, address):
        allowed(address)
        return connect_ex(sock, address)

    monkeypatch.setattr(socket.socket, "connect", local_connect)
    monkeypatch.setattr(socket.socket, "connect_ex", local_connect_ex)
