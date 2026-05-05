import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
def test_change_email_requires_authentication():
    client = APIClient()

    response = client.post(
        reverse("change-email"),
        data={
            "new_email": "new@example.com",
            "password": "strong-password-123",
        },
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_change_email_success():
    user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("change-email"),
        data={
            "new_email": "NEW@example.com",
            "password": "strong-password-123",
        },
        format="json",
    )

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Email updated successfully."
    assert data["data"]["email"] == "new@example.com"
    assert user.email == "new@example.com"


@pytest.mark.django_db
def test_change_email_fails_with_wrong_password():
    user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("change-email"),
        data={
            "new_email": "new@example.com",
            "password": "wrong-password",
        },
        format="json",
    )

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Password is incorrect."
    assert user.email == "old@example.com"


@pytest.mark.django_db
def test_change_email_fails_if_email_already_exists_case_insensitive():
    user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
        is_active=True,
    )
    User.objects.create_user(
        email="taken@example.com",
        password="strong-password-123",
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("change-email"),
        data={
            "new_email": "TAKEN@example.com",
            "password": "strong-password-123",
        },
        format="json",
    )

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "This email is already in use."
    assert user.email == "old@example.com"


@pytest.mark.django_db
def test_change_email_rejects_invalid_email():
    user = User.objects.create_user(
        email="old@example.com",
        password="strong-password-123",
        is_active=True,
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("change-email"),
        data={
            "new_email": "not-an-email",
            "password": "strong-password-123",
        },
        format="json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "new_email" in data["errors"]