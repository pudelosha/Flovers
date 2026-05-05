import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_change_password_requires_authentication():
    client = APIClient()

    response = client.post(
        reverse("change-password"),
        data={
            "current_password": "old-password-123",
            "new_password": "new-password-123",
        },
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_change_password_success():
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("change-password"),
        data={
            "current_password": "old-password-123",
            "new_password": "new-password-123",
        },
        format="json",
    )

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Password changed successfully."
    assert user.check_password("new-password-123")


@pytest.mark.django_db
def test_change_password_fails_with_wrong_current_password():
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("change-password"),
        data={
            "current_password": "wrong-password",
            "new_password": "new-password-123",
        },
        format="json",
    )

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Current password is incorrect."
    assert user.check_password("old-password-123")


@pytest.mark.django_db
def test_change_password_rejects_short_new_password():
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("change-password"),
        data={
            "current_password": "old-password-123",
            "new_password": "short",
        },
        format="json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "new_password" in data["errors"]