import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch

User = get_user_model()


@pytest.mark.django_db
@patch("accounts.views.send_activation_email_task.delay")
def test_resend_activation_sends_email_for_inactive_user(mock_delay, client):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=False,
    )

    response = client.post(
        reverse("resend-activation"),
        data={
            "email": "test@example.com",
            "lang": "pl",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Activation email resent."
    mock_delay.assert_called_once_with(user.id, lang="pl")


@pytest.mark.django_db
@patch("accounts.views.send_activation_email_task.delay")
def test_resend_activation_returns_success_for_unknown_email_without_sending(mock_delay, client):
    response = client.post(
        reverse("resend-activation"),
        data={
            "email": "unknown@example.com",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "If the account exists and is not activated, an email has been sent."
    mock_delay.assert_not_called()


@pytest.mark.django_db
@patch("accounts.views.send_activation_email_task.delay")
def test_resend_activation_returns_success_for_active_user_without_sending(mock_delay, client):
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=True,
    )

    response = client.post(
        reverse("resend-activation"),
        data={
            "email": "test@example.com",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Account is already activated."
    mock_delay.assert_not_called()


@pytest.mark.django_db
def test_resend_activation_rejects_invalid_email(client):
    response = client.post(
        reverse("resend-activation"),
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
@patch("accounts.views.send_activation_email_task.delay")
def test_resend_activation_returns_500_if_task_fails(mock_delay, client):
    User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=False,
    )
    mock_delay.side_effect = Exception("Celery unavailable")

    response = client.post(
        reverse("resend-activation"),
        data={
            "email": "test@example.com",
        },
        content_type="application/json",
    )

    data = response.json()

    assert response.status_code == 500
    assert data["status"] == "error"
    assert data["message"] == "Could not send activation email at the moment."