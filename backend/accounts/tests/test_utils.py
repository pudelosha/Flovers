import pytest
from django.test import override_settings
from django.contrib.auth import get_user_model

from accounts.utils import (
    build_mobile_deeplink,
    build_web_fallback,
    build_activation_link,
    build_password_reset_link,
)

User = get_user_model()


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_build_mobile_deeplink_without_host():
    result = build_mobile_deeplink("confirm-email", {
        "uid": "abc",
        "token": "xyz",
    })

    assert result == "flovers://confirm-email?uid=abc&token=xyz"


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="app")
def test_build_mobile_deeplink_with_host():
    result = build_mobile_deeplink("confirm-email", {
        "uid": "abc",
        "token": "xyz",
    })

    assert result == "flovers://app/confirm-email?uid=abc&token=xyz"


@override_settings(
    PUBLIC_WEB_BASE="https://example.com",
    SITE_URL="https://fallback.example.com",
)
def test_build_web_fallback_uses_public_web_base():
    result = build_web_fallback("activate", {
        "uid": "abc",
        "token": "xyz",
    })

    assert result == "https://example.com/api/auth/open/activate/?uid=abc&token=xyz"


@pytest.mark.django_db
@override_settings(
    DEEP_LINK_ENABLED=True,
    PUBLIC_WEB_BASE="https://example.com",
    SITE_URL="https://api.example.com",
)
def test_build_activation_link_uses_web_fallback_when_deeplink_enabled():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    result = build_activation_link(user)

    assert result.startswith("https://example.com/api/auth/open/activate/?")
    assert "uid=" in result
    assert "token=" in result


@pytest.mark.django_db
@override_settings(
    DEEP_LINK_ENABLED=False,
    SITE_URL="https://api.example.com",
)
def test_build_activation_link_uses_api_endpoint_when_deeplink_disabled():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    result = build_activation_link(user)

    assert result.startswith("https://api.example.com/api/auth/activate/?")
    assert "uid=" in result
    assert "token=" in result


@pytest.mark.django_db
@override_settings(
    DEEP_LINK_ENABLED=True,
    PUBLIC_WEB_BASE="https://example.com",
    SITE_URL="https://api.example.com",
)
def test_build_password_reset_link_uses_web_fallback_when_deeplink_enabled():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    result = build_password_reset_link(user)

    assert result.startswith("https://example.com/api/auth/open/reset-password/?")
    assert "uid=" in result
    assert "token=" in result


@pytest.mark.django_db
@override_settings(
    DEEP_LINK_ENABLED=False,
    SITE_URL="https://api.example.com",
)
def test_build_password_reset_link_uses_api_endpoint_when_deeplink_disabled():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    result = build_password_reset_link(user)

    assert result.startswith("https://api.example.com/api/auth/reset-password/?")
    assert "uid=" in result
    assert "token=" in result