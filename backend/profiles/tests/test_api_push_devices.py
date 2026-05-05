import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from profiles.models import PushDevice

User = get_user_model()


def test_push_device_register_requires_authentication():
    response = APIClient().post(
        reverse("push-device-register"),
        data={"token": "token-123", "platform": "android"},
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_push_device_register_creates_device():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("push-device-register"),
        data={"token": "token-123", "platform": "android"},
        format="json",
    )

    data = response.json()
    device = PushDevice.objects.get(token="token-123")

    assert response.status_code == 201
    assert data["status"] == "success"
    assert data["message"] == "Push device registered."
    assert data["data"]["token"] == "token-123"
    assert data["data"]["platform"] == "android"
    assert device.user == user
    assert device.is_active is True


@pytest.mark.django_db
def test_push_device_register_updates_existing_device_for_same_token():
    old_user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
    )
    new_user = User.objects.create_user(
        email="new@example.com",
        password="strong-password-123",
    )
    PushDevice.objects.create(
        user=old_user,
        token="token-123",
        platform="android",
        is_active=False,
    )
    client = APIClient()
    client.force_authenticate(user=new_user)

    response = client.post(
        reverse("push-device-register"),
        data={"token": "token-123", "platform": "ios"},
        format="json",
    )

    data = response.json()
    device = PushDevice.objects.get(token="token-123")

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Push device updated."
    assert device.user == new_user
    assert device.platform == "ios"
    assert device.is_active is True


@pytest.mark.django_db
def test_push_device_register_rejects_invalid_platform():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("push-device-register"),
        data={"token": "token-123", "platform": "web"},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Validation failed."
    assert "platform" in data["errors"]
