import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch

User = get_user_model()


@pytest.mark.django_db
@patch("accounts.views.send_activation_email_task.delay")
def test_register_success_creates_inactive_user_and_sends_activation_email(mock_delay, client):
    response = client.post(
        reverse("register"),
        data={
            "email": "test@example.com",
            "password": "strong-password-123",
            "first_name": "John",
            "last_name": "Doe",
            "lang": "pl",
        },
        content_type="application/json",
    )

    data = response.json()
    user = User.objects.get(email="test@example.com")

    assert response.status_code == 201
    assert data["status"] == "success"
    assert user.is_active is False
    assert user.first_name == "John"
    assert user.last_name == "Doe"
    mock_delay.assert_called_once_with(user.id, lang="pl")


@pytest.mark.django_db
def test_register_rejects_invalid_email(client):
    response = client.post(
        reverse("register"),
        data={
            "email": "not-an-email",
            "password": "strong-password-123",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "email" in data["errors"]


@pytest.mark.django_db
def test_register_rejects_short_password(client):
    response = client.post(
        reverse("register"),
        data={
            "email": "test@example.com",
            "password": "short",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "password" in data["errors"]


@pytest.mark.django_db
def test_register_rejects_duplicate_email_case_insensitive(client):
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    response = client.post(
        reverse("register"),
        data={
            "email": "TEST@example.com",
            "password": "strong-password-123",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "email" in data["errors"]


@pytest.mark.django_db
@patch("accounts.views.send_activation_email_task.delay")
def test_register_returns_500_if_activation_email_task_fails(mock_delay, client):
    mock_delay.side_effect = Exception("Celery unavailable")

    response = client.post(
        reverse("register"),
        data={
            "email": "test@example.com",
            "password": "strong-password-123",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 500
    assert data["status"] == "error"
    assert data["message"] == "Could not send activation email at the moment."
    assert User.objects.filter(email="test@example.com").exists()