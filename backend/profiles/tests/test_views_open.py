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


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_open_task_history_preserves_plant_filter_and_rejects_arbitrary_query_text(client):
    response = client.get(reverse("open-task-history"), {"plantId": "12"})
    assert response.status_code == 200
    assert "flovers://task-history?plantId=12" in response.content.decode()
    response = client.get(reverse("open-task-history"), {"plantId": '"><script>alert(1)</script>'})
    assert "<script>alert(1)" not in response.content.decode()
