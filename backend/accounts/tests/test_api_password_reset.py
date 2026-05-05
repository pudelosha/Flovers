import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from unittest.mock import patch

from accounts.tokens import reset_password_token

User = get_user_model()


@pytest.mark.django_db
@patch("accounts.views.send_password_reset_email_task.delay")
def test_forgot_password_sends_email_for_active_user(mock_delay, client):
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )

    response = client.post(
        reverse("forgot-password"),
        data={
            "email": "test@example.com",
            "lang": "pl",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "If an account exists for this email, a reset link has been sent."
    mock_delay.assert_called_once_with(user.id, lang="pl")


@pytest.mark.django_db
@patch("accounts.views.send_password_reset_email_task.delay")
def test_forgot_password_returns_success_for_unknown_email_without_sending(mock_delay, client):
    response = client.post(
        reverse("forgot-password"),
        data={
            "email": "unknown@example.com",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "If an account exists for this email, a reset link has been sent."
    mock_delay.assert_not_called()


@pytest.mark.django_db
@patch("accounts.views.send_password_reset_email_task.delay")
def test_forgot_password_returns_success_for_inactive_user_without_sending(mock_delay, client):
    User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=False,
    )

    response = client.post(
        reverse("forgot-password"),
        data={
            "email": "test@example.com",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "If an account exists for this email, a reset link has been sent."
    mock_delay.assert_not_called()


@pytest.mark.django_db
def test_forgot_password_rejects_invalid_email(client):
    response = client.post(
        reverse("forgot-password"),
        data={
            "email": "not-an-email",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "email" in data["errors"]


@pytest.mark.django_db
@patch("accounts.views.send_password_reset_email_task.delay")
def test_forgot_password_returns_500_if_task_fails(mock_delay, client):
    User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )
    mock_delay.side_effect = Exception("Celery unavailable")

    response = client.post(
        reverse("forgot-password"),
        data={
            "email": "test@example.com",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 500
    assert data["status"] == "error"
    assert data["message"] == "Could not send reset email at the moment."


@pytest.mark.django_db
def test_reset_password_success(client):
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = reset_password_token.make_token(user)

    response = client.post(
        reverse("reset-password"),
        data={
            "uid": uid,
            "token": token,
            "new_password": "new-password-123",
        },
        content_type="application/json",
    )

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Password has been reset successfully."
    assert user.check_password("new-password-123")


@pytest.mark.django_db
def test_reset_password_fails_with_invalid_uid(client):
    response = client.post(
        reverse("reset-password"),
        data={
            "uid": "invalid-uid",
            "token": "invalid-token",
            "new_password": "new-password-123",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Reset link is invalid."


@pytest.mark.django_db
def test_reset_password_fails_with_invalid_token(client):
    user = User.objects.create_user(
        email="test@example.com",
        password="old-password-123",
        is_active=True,
    )
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    response = client.post(
        reverse("reset-password"),
        data={
            "uid": uid,
            "token": "invalid-token",
            "new_password": "new-password-123",
        },
        content_type="application/json",
    )

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Reset token is invalid or expired."
    assert user.check_password("old-password-123")


@pytest.mark.django_db
def test_reset_password_rejects_short_new_password(client):
    response = client.post(
        reverse("reset-password"),
        data={
            "uid": "abc",
            "token": "token",
            "new_password": "short",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert "new_password" in data["errors"]