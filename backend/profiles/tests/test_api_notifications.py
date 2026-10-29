import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


def test_profile_notifications_requires_authentication():
    response = APIClient().get(reverse("profile-notifications"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_profile_notifications_get_returns_defaults():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("profile-notifications"))

    data = response.json()
    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Profile notifications fetched."
    assert data["data"]["timezone"] == "Europe/Warsaw"
    assert data["data"]["email_daily"] is True
    assert data["data"]["email_hour"] == 12
    assert data["data"]["email_minute"] == 0
    assert data["data"]["push_daily"] is True
    assert data["data"]["push_hour"] == 12
    assert data["data"]["push_minute"] == 0
    assert data["data"]["shared_task_email"] is False
    assert data["data"]["shared_task_push"] is False


@pytest.mark.django_db
def test_profile_notifications_patch_updates_values():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("profile-notifications"),
        data={
            "timezone": "Europe/London",
            "email_daily": False,
            "email_hour": 7,
            "email_minute": 15,
            "email_24h": True,
            "push_daily": False,
            "push_hour": 20,
            "push_minute": 45,
            "push_24h": True,
            "shared_task_email": True,
            "shared_task_push": False,
        },
        format="json",
    )

    data = response.json()
    user.profile_notifications.refresh_from_db()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Profile notifications updated."
    assert data["data"]["timezone"] == "Europe/London"
    assert user.profile_notifications.email_daily is False
    assert user.profile_notifications.email_hour == 7
    assert user.profile_notifications.email_minute == 15
    assert user.profile_notifications.email_24h is True
    assert user.profile_notifications.push_daily is False
    assert user.profile_notifications.push_hour == 20
    assert user.profile_notifications.push_minute == 45
    assert user.profile_notifications.push_24h is True
    assert user.profile_notifications.shared_task_email is True
    assert user.profile_notifications.shared_task_push is False


@pytest.mark.django_db
def test_shared_notifications_are_independent_and_preserved_when_updating_schedule():
    user = User.objects.create_user(email="shared-preferences@example.test", is_active=True)
    client = APIClient()
    client.force_authenticate(user)
    response = client.patch(reverse("profile-notifications"), {"shared_task_email": True, "shared_task_push": True}, format="json")
    assert response.status_code == 200
    response = client.patch(reverse("profile-notifications"), {"push_daily": False, "push_hour": 8}, format="json")
    assert response.data["data"]["shared_task_email"] is True
    assert response.data["data"]["shared_task_push"] is True
    response = client.patch(reverse("profile-notifications"), {"shared_task_email": False}, format="json")
    assert response.data["data"]["shared_task_email"] is False
    assert response.data["data"]["shared_task_push"] is True
    assert response.data["data"]["push_hour"] == 8


@pytest.mark.django_db
def test_profile_notifications_patch_rejects_invalid_hour():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("profile-notifications"),
        data={"email_hour": 24},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Validation failed."
    assert "email_hour" in data["errors"]
