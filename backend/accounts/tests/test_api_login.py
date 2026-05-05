import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()


@pytest.mark.django_db
def test_login_success_returns_tokens_and_user_data(client):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        first_name="John",
        last_name="Doe",
        is_active=True,
    )

    response = client.post(
        reverse("login"),
        data={
            "email": "test@example.com",
            "password": "strong-password-123",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Login successful."
    assert "access" in data["data"]
    assert "refresh" in data["data"]
    assert data["data"]["user"]["id"] == user.id
    assert data["data"]["user"]["email"] == "test@example.com"
    assert data["data"]["user"]["first_name"] == "John"
    assert data["data"]["user"]["last_name"] == "Doe"


@pytest.mark.django_db
def test_login_fails_with_wrong_password(client):
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=True,
    )

    response = client.post(
        reverse("login"),
        data={
            "email": "test@example.com",
            "password": "wrong-password",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Invalid credentials."


@pytest.mark.django_db
def test_login_fails_for_inactive_user(client):
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=False,
    )

    response = client.post(
        reverse("login"),
        data={
            "email": "test@example.com",
            "password": "strong-password-123",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Account is not activated."


@pytest.mark.django_db
def test_login_fails_for_missing_password(client):
    response = client.post(
        reverse("login"),
        data={
            "email": "test@example.com",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "password" in data["errors"]