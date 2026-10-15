import os
from pathlib import Path
import runpy
from unittest.mock import patch

import pytest
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.test import RequestFactory, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from core.middleware import TrustedProxyHeadersMiddleware


def load_settings(**environment):
    values = {"LOAD_DOTENV": "False", "DATABASE_URL": "", "USE_POSTGRES": "False", **environment}
    with patch.dict(os.environ, values, clear=True), patch("environ.Env.read_env", side_effect=AssertionError("Must not read project environment")):
        return runpy.run_path(str(Path(__file__).resolve().parents[2] / "app/settings.py"))


def test_production_startup_requires_both_private_keys_and_explicit_dev_mode_is_available():
    with pytest.raises(ImproperlyConfigured, match="SECRET_KEY"):
        load_settings()
    with pytest.raises(ImproperlyConfigured, match="JWT_SIGNING_KEY"):
        load_settings(SECRET_KEY="fixture-private-secret-key-123456789")
    with pytest.raises(ImproperlyConfigured, match="SECRET_KEY"):
        load_settings(SECRET_KEY="django-insecure-local-dev-secret-key-change-me-32-bytes-min", JWT_SIGNING_KEY="fixture-private-jwt-signing-key-123456789")
    configured = load_settings(SECRET_KEY="fixture-private-secret-key-123456789", JWT_SIGNING_KEY="fixture-private-jwt-signing-key-123456789")
    assert configured["APP_ENV"] == "production"
    assert configured["REST_FRAMEWORK"]["NUM_PROXIES"] == 0
    assert configured["EMAIL_TIMEOUT"] == 30
    assert load_settings(APP_ENV="development")["SECRET_KEY"]


@pytest.mark.parametrize("timeout", ["0", "121"])
def test_smtp_timeout_is_bounded(timeout):
    with pytest.raises(ImproperlyConfigured, match="EMAIL_TIMEOUT"):
        load_settings(APP_ENV="test", EMAIL_TIMEOUT=timeout)


@override_settings(TRUSTED_PROXY_CIDRS=["10.0.0.0/24"])
def test_proxy_identity_stops_at_first_untrusted_hop_and_strips_spoofable_headers():
    request = RequestFactory().get("/", REMOTE_ADDR="10.0.0.2", HTTP_X_FORWARDED_FOR="203.0.113.99, 198.51.100.7, 10.0.0.3", HTTP_X_FORWARDED_PROTO="https", HTTP_X_REAL_IP="203.0.113.99")
    result = TrustedProxyHeadersMiddleware(lambda value: value)(request)
    assert result.META["REMOTE_ADDR"] == "198.51.100.7"
    assert "HTTP_X_FORWARDED_FOR" not in result.META
    assert "HTTP_X_REAL_IP" not in result.META
    assert result.is_secure()


@override_settings(TRUSTED_PROXY_CIDRS=["10.0.0.2/32"])
def test_untrusted_peer_cannot_spoof_identity_or_tls():
    request = RequestFactory().get("/", REMOTE_ADDR="198.51.100.8", HTTP_X_FORWARDED_FOR="203.0.113.99", HTTP_X_FORWARDED_PROTO="https")
    result = TrustedProxyHeadersMiddleware(lambda value: value)(request)
    assert result.META["REMOTE_ADDR"] == "198.51.100.8"
    assert not result.is_secure()


@pytest.mark.django_db
@pytest.mark.parametrize("trusted_peer", [False, True])
@override_settings(TRUSTED_PROXY_CIDRS=["10.0.0.2/32"])
def test_rotating_forwarded_prefix_does_not_bypass_public_contact_quota(trusted_peer):
    cache.clear()
    client = APIClient()
    responses = []
    with patch("profiles.views_support.send_templated_email", return_value=True):
        for index in range(6):
            remote = "10.0.0.2" if trusted_peer else "198.51.100.8"
            forwarded = f"203.0.113.{index}, 198.51.100.8" if trusted_peer else f"203.0.113.{index}"
            response = client.post(reverse("profile-support-public-contact"), {"email": "sender@example.com", "subject": "Help", "message": "Fixture", "copy_to_user": False}, format="json", REMOTE_ADDR=remote, HTTP_X_FORWARDED_FOR=forwarded)
            responses.append(response.status_code)
    assert responses == [200, 200, 200, 200, 200, 429]
