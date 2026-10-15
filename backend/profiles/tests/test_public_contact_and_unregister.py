from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from profiles.models import PushDevice, SupportMessage

User = get_user_model()


@pytest.mark.django_db
def test_push_unregister_is_idempotent_and_owner_scoped():
    owner = User.objects.create_user(email="owner@example.com", password="password-123")
    other = User.objects.create_user(email="other@example.com", password="password-123")
    own_device = PushDevice.objects.create(user=owner, token="own-token", platform="android")
    other_device = PushDevice.objects.create(user=other, token="other-token", platform="android")
    client = APIClient()
    client.force_authenticate(owner)
    for token in ("own-token", "own-token", "other-token", "unknown-token"):
        response = client.delete(reverse("push-device-register"), {"token": token}, format="json")
        assert response.status_code == 200
    own_device.refresh_from_db()
    other_device.refresh_from_db()
    assert not own_device.is_active
    assert other_device.is_active


def test_push_unregister_requires_authentication():
    assert APIClient().delete(reverse("push-device-register"), {"token": "token"}, format="json").status_code == 401


@pytest.mark.django_db
def test_public_contact_sends_to_support_and_requested_sender_without_user():
    payload = {"email": "visitor@example.com", "subject": "Question", "message": "How can I start?",
               "copy_to_user": True, "lang": "pl", "website": ""}
    with patch("profiles.views_support.send_templated_email") as send:
        response = APIClient().post(reverse("profile-support-public-contact"), payload, format="json")
    assert response.status_code == 200
    message = SupportMessage.objects.get()
    assert message.user_id is None and message.user_email == payload["email"]
    assert message.body == payload["message"]
    assert send.call_count == 2
    assert send.call_args_list[0].kwargs["reply_to"] == [payload["email"]]
    assert send.call_args_list[1].kwargs["to_email"] == payload["email"]
    assert send.call_args_list[1].kwargs["lang"] == "pl"
    assert send.call_args_list[1].kwargs["context"]["message"] == payload["message"]


@pytest.mark.django_db
def test_public_contact_honeypot_silently_discards_submission():
    with patch("profiles.views_support.send_templated_email") as send:
        response = APIClient().post(reverse("profile-support-public-contact"), {
            "email": "bot@example.com", "subject": "Spam", "message": "Spam", "website": "https://spam.invalid",
        }, format="json")
    assert response.status_code == 200
    assert not SupportMessage.objects.exists()
    send.assert_not_called()


@pytest.mark.django_db
def test_public_contact_validates_sender_and_preserves_private_contact_permission():
    with patch("profiles.views_support.send_templated_email") as send:
        response = APIClient().post(reverse("profile-support-public-contact"), {
            "email": "invalid", "subject": "Question", "message": "Hello",
        }, format="json")
    assert response.status_code == 400 and "email" in response.json()["errors"]
    assert not SupportMessage.objects.exists()
    send.assert_not_called()
    assert APIClient().post(reverse("profile-support-contact"), {"subject": "Question", "message": "Hello"}, format="json").status_code == 401


@pytest.mark.django_db
def test_public_contact_limits_anonymous_submissions():
    cache.clear()
    client = APIClient()
    with patch("profiles.views_support.send_templated_email"):
        payload = {"email": "visitor@example.com", "subject": "Question", "message": "Hello", "copy_to_user": False}
        statuses = [client.post(reverse("profile-support-public-contact"), payload, format="json").status_code for _ in range(6)]
    assert statuses == [200] * 5 + [429]
    assert SupportMessage.objects.count() == 5
    cache.clear()
