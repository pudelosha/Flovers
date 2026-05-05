from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from profiles.models import SupportMessage

User = get_user_model()


def test_support_contact_requires_authentication():
    response = APIClient().post(
        reverse("profile-support-contact"),
        data={"subject": "Help", "message": "Please help."},
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
@override_settings(SUPPORT_INBOX_EMAIL="support@example.com")
@patch("profiles.views_support.send_templated_email")
def test_support_contact_creates_message_and_sends_admin_and_user_copy(mock_send):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    user.profile_settings.language = "pl"
    user.profile_settings.save(update_fields=["language"])
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("profile-support-contact"),
        data={
            "subject": " Help ",
            "message": " Please help. ",
            "copy_to_user": True,
        },
        format="json",
        HTTP_USER_AGENT="pytest-agent",
    )

    data = response.json()
    message = SupportMessage.objects.get(user=user)

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Message sent."
    assert message.kind == SupportMessage.KIND_CONTACT
    assert message.subject == "Help"
    assert message.body == "Please help."
    assert message.user_agent == "pytest-agent"
    assert mock_send.call_count == 2
    assert mock_send.call_args_list[0].kwargs["to_email"] == "support@example.com"
    assert mock_send.call_args_list[0].kwargs["lang"] == "en"
    assert mock_send.call_args_list[1].kwargs["to_email"] == "test@example.com"
    assert mock_send.call_args_list[1].kwargs["lang"] == "pl"


@pytest.mark.django_db
@override_settings(SUPPORT_INBOX_EMAIL="support@example.com")
@patch("profiles.views_support.send_templated_email")
def test_support_contact_can_skip_user_copy(mock_send):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("profile-support-contact"),
        data={
            "subject": "Help",
            "message": "Please help.",
            "copy_to_user": False,
        },
        format="json",
    )

    assert response.status_code == 200
    assert mock_send.call_count == 1


@pytest.mark.django_db
def test_support_contact_rejects_blank_message():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("profile-support-contact"),
        data={"subject": "Help", "message": "   "},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Validation failed."
    assert "message" in data["errors"]


@pytest.mark.django_db
@override_settings(SUPPORT_INBOX_EMAIL="", DEFAULT_FROM_EMAIL="fallback@example.com")
@patch("profiles.views_support.send_templated_email")
def test_support_contact_falls_back_to_default_from_email(mock_send):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("profile-support-contact"),
        data={"subject": "Help", "message": "Please help."},
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Message sent."
    assert mock_send.call_args_list[0].kwargs["to_email"] == "fallback@example.com"


@pytest.mark.django_db
@override_settings(SUPPORT_INBOX_EMAIL="", DEFAULT_FROM_EMAIL="")
def test_support_contact_returns_500_when_no_support_email_is_configured():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("profile-support-contact"),
        data={"subject": "Help", "message": "Please help."},
        format="json",
    )

    data = response.json()
    assert response.status_code == 500
    assert data["status"] == "error"
    assert data["message"] == "Support inbox is not configured."


@pytest.mark.django_db
@override_settings(SUPPORT_INBOX_EMAIL="support@example.com")
@patch("profiles.views_support.send_templated_email")
def test_support_bug_creates_message_and_sends_emails(mock_send):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("profile-support-bug"),
        data={
            "subject": " Bug ",
            "description": " Something broke. ",
            "copy_to_user": True,
        },
        format="json",
        HTTP_USER_AGENT="pytest-agent",
        REMOTE_ADDR="127.0.0.1",
    )

    data = response.json()
    message = SupportMessage.objects.get(user=user)

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Bug report sent."
    assert message.kind == SupportMessage.KIND_BUG
    assert message.subject == "Bug"
    assert message.body == "Something broke."
    assert mock_send.call_count == 2
    assert mock_send.call_args_list[0].kwargs["to_email"] == "support@example.com"
    assert mock_send.call_args_list[1].kwargs["to_email"] == "test@example.com"


@pytest.mark.django_db
@override_settings(SUPPORT_INBOX_EMAIL="support@example.com")
@patch("profiles.views_support.send_templated_email")
def test_support_bug_returns_500_if_email_send_fails(mock_send):
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    mock_send.side_effect = Exception("SMTP unavailable")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("profile-support-bug"),
        data={
            "subject": "Bug",
            "description": "Something broke.",
        },
        format="json",
    )

    data = response.json()
    assert response.status_code == 500
    assert data["status"] == "error"
    assert data["message"] == "Failed to send bug report email."
