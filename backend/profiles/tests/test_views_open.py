from django.test import override_settings
from django.urls import reverse


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="", PUBLIC_WEB_BASE="https://flovers.example")
def test_open_home_returns_deeplink_html(client):
    response = client.get(reverse("open-home"))

    content = response.content.decode()
    assert response.status_code == 200
    assert "flovers://home" in content
    assert "https://flovers.example" in content


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="app", PUBLIC_WEB_BASE="https://flovers.example")
def test_open_home_uses_configured_deeplink_host(client):
    response = client.get(reverse("open-home"))

    content = response.content.decode()
    assert response.status_code == 200
    assert "flovers://app/home" in content
