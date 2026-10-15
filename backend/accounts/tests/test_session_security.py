from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from accounts.tokens import activation_token, reset_password_token

User = get_user_model()


def login(client, user, password="original-password-123"):
    response = client.post(reverse("login"), {"email": user.email, "password": password}, format="json")
    assert response.status_code == 200
    return response.json()["data"]


@pytest.mark.django_db
def test_activation_token_is_single_purpose_and_consumed_by_activation():
    user = User.objects.create_user(email="activation@example.com", password="original-password-123", is_active=False)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = activation_token.make_token(user)
    client = APIClient()
    assert client.get(reverse("activate"), {"uid": uid, "token": token}).status_code == 200
    user.refresh_from_db()
    assert not activation_token.check_token(user, token)
    login(client, user)
    response = client.post(reverse("reset-password"), {
        "uid": uid, "token": token, "new_password": "attacker-password-123",
    }, format="json")
    assert response.status_code == 400
    user.refresh_from_db()
    assert user.check_password("original-password-123")


@pytest.mark.django_db
@pytest.mark.parametrize("operation", ["reset", "change"])
def test_password_recovery_revokes_access_and_refresh_and_new_login_works(operation):
    user = User.objects.create_user(email="recovery@example.com", password="original-password-123", is_active=True)
    client = APIClient()
    tokens = login(client, user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    assert client.get(reverse("profile-settings")).status_code == 200
    if operation == "change":
        response = client.post(reverse("change-password"), {
            "current_password": "original-password-123", "new_password": "replacement-password-123",
        }, format="json")
    else:
        client.credentials()
        response = client.post(reverse("reset-password"), {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": reset_password_token.make_token(user), "new_password": "replacement-password-123",
        }, format="json")
    assert response.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    assert client.get(reverse("profile-settings")).status_code == 401
    client.credentials()
    assert client.post(reverse("token-refresh"), {"refresh": tokens["refresh"]}, format="json").status_code == 401
    fresh = login(client, user, "replacement-password-123")
    refreshed = client.post(reverse("token-refresh"), {"refresh": fresh["refresh"]}, format="json")
    assert refreshed.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refreshed.json()['access']}")
    assert client.get(reverse("profile-settings")).status_code == 200


@pytest.mark.django_db
@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_refresh_rejects_disabled_or_deleted_accounts(account_state):
    user = User.objects.create_user(email="disabled@example.com", password="original-password-123", is_active=True)
    client = APIClient()
    tokens = login(client, user)
    if account_state == "deleted":
        user.delete()
    else:
        user.is_active = False
        user.save(update_fields=["is_active"])
    assert client.post(reverse("token-refresh"), {"refresh": tokens["refresh"]}, format="json").status_code == 401


@pytest.mark.django_db
@pytest.mark.parametrize("language", ["pl", "ja", "ko"])
def test_registration_persists_selected_language_after_profile_signal(language):
    email = f"{language}@example.com"
    with patch("accounts.views.send_activation_email_task.delay"):
        response = APIClient().post(reverse("register"), {
            "email": email, "password": "registration-password-123", "lang": language,
        }, format="json")
    assert response.status_code == 201
    assert User.objects.get(email=email).profile_settings.language == language
