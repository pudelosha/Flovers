import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.tokens import activation_token

User = get_user_model()


@pytest.mark.django_db
def test_activate_account_success(client):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=False,
    )
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = activation_token.make_token(user)

    response = client.get(reverse("activate"), {
        "uid": uid,
        "token": token,
    })

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Account activated successfully."
    assert user.is_active is True


@pytest.mark.django_db
def test_activate_account_missing_params_returns_400(client):
    response = client.get(reverse("activate"))

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Activation link is invalid."


@pytest.mark.django_db
def test_activate_account_invalid_uid_returns_400(client):
    response = client.get(reverse("activate"), {
        "uid": "invalid-uid",
        "token": "invalid-token",
    })

    data = response.json()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Activation link is invalid or expired."


@pytest.mark.django_db
def test_activate_account_invalid_token_returns_400(client):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=False,
    )
    uid = urlsafe_base64_encode(force_bytes(user.pk))

    response = client.get(reverse("activate"), {
        "uid": uid,
        "token": "invalid-token",
    })

    data = response.json()
    user.refresh_from_db()

    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Activation token is invalid or expired."
    assert user.is_active is False


@pytest.mark.django_db
def test_activate_account_already_active_returns_success(client):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
        is_active=True,
    )
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = activation_token.make_token(user)

    response = client.get(reverse("activate"), {
        "uid": uid,
        "token": token,
    })

    data = response.json()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Account already activated."