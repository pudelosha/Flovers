from django.urls import reverse
from django.test import override_settings


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_open_activate_without_params_returns_400(client):
    response = client.get(reverse("open-activate"))

    assert response.status_code == 400
    assert "text/html" in response["Content-Type"]
    assert b"Invalid link" in response.content


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_open_activate_with_params_returns_deeplink_html(client):
    response = client.get(reverse("open-activate"), {
        "uid": "abc",
        "token": "xyz",
    })

    content = response.content.decode()

    assert response.status_code == 200
    assert "text/html" in response["Content-Type"]
    assert "Opening Flovers" in content
    assert "flovers://confirm-email?uid=abc" in content
    assert "token=xyz" in content


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_open_reset_password_without_params_returns_400(client):
    response = client.get(reverse("open-reset-password"))

    assert response.status_code == 400
    assert "text/html" in response["Content-Type"]
    assert b"Invalid link" in response.content


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_open_reset_password_with_params_returns_deeplink_html(client):
    response = client.get(reverse("open-reset-password"), {
        "uid": "abc",
        "token": "xyz",
    })

    content = response.content.decode()

    assert response.status_code == 200
    assert "text/html" in response["Content-Type"]
    assert "Opening Flovers" in content
    assert "flovers://reset-password?uid=abc" in content
    assert "token=xyz" in content


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="app")
def test_open_activate_uses_configured_deeplink_host(client):
    response = client.get(reverse("open-activate"), {
        "uid": "abc",
        "token": "xyz",
    })

    content = response.content.decode()

    assert response.status_code == 200
    assert "flovers://app/confirm-email?uid=abc" in content
    assert "token=xyz" in content