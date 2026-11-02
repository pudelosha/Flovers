from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone

from contacts.models import Connection, EmailInvitation, InvitationEmailDelivery
from contacts.tasks import deliver_invitation_emails
from contacts.services import claim_email_invitations

pytestmark = pytest.mark.django_db
URL = "/contacts/email-invitations/"


def send(people, **overrides):
    return people.a.post(URL, {"email": "new@example.test", "language": "pl", **overrides}, format="json")


def test_delivery_pending_and_private_cancellation(people, settings):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    response = send(people)
    assert response.status_code == 201, response.content
    row = EmailInvitation.objects.get()
    data = response.json()["data"]
    assert data["invitations"] == []
    assert data["email_invitations"][0]["email"] == "new@example.test"
    assert data["email_invitations"][0]["language"] == "pl"
    assert len(mail.outbox) == 0
    assert row.sent_at is None
    deliver_invitation_emails()
    assert len(mail.outbox) == 1
    message = mail.outbox[0]
    assert message.to == ["new@example.test"]
    assert message.subject == "Zapro? przez e-mail"
    assert "Alice Owner" in message.body
    assert "30 dni" in message.body and "new@example.test" in message.body
    assert "[Flovers]" not in message.subject
    assert not Connection.objects.exists()
    assert people.c.get("/contacts/").json()["data"]["email_invitations"] == []
    assert people.c.delete(f"{URL}{row.pk}/").status_code == 404
    assert people.a.delete(f"{URL}{row.pk}/").status_code == 200
    assert people.a.get("/contacts/").json()["data"]["email_invitations"] == []
    assert send(people).status_code == 429  # cancellation cannot bypass resend limit
    assert len(mail.outbox) == 1


@pytest.mark.parametrize("identifier", ["owner@example.test", "RECIPIENT@example.test", "inactive@example.test"])
def test_registered_including_unverified_rejected(people, identifier):
    response = send(people, email=identifier)
    assert response.status_code == 409
    assert response.json()["code"] == "alreadyRegistered"
    assert not EmailInvitation.objects.exists()


@pytest.mark.parametrize("overrides", [{"email": "invalid"}, {"language": "xx"}, {"email": ""}])
def test_invalid_payload_never_sends(people, overrides):
    with patch("core.emailing.send_templated_email") as delivery:
        assert send(people, **overrides).status_code == 400
        delivery.assert_not_called()


def test_duplicate_case_insensitive_does_not_send_twice(people):
    assert send(people, email=" NEW@example.test ").status_code == 201
    response = send(people, email="new@EXAMPLE.test")
    assert response.status_code == 409
    assert EmailInvitation.objects.count() == 1


def test_delivery_failure_keeps_the_durable_job_and_retry_is_possible(people):
    assert send(people).status_code == 201
    with patch("contacts.tasks.send_templated_email", side_effect=RuntimeError("SMTP failed")):
        deliver_invitation_emails()
    job = InvitationEmailDelivery.objects.get()
    assert job.status == "pending" and job.attempts == 1
    assert EmailInvitation.objects.get().sent_at is None
    assert send(people).status_code == 409
    InvitationEmailDelivery.objects.update(next_attempt_at=timezone.now()-timedelta(seconds=1))
    deliver_invitation_emails()
    job.refresh_from_db()
    assert job.status == "sent" and job.attempts == 2
    assert EmailInvitation.objects.get().sent_at is not None


def test_verified_recipient_gets_request_not_automatic_access(people):
    assert send(people).status_code == 201
    user = get_user_model().objects.create_user(email="new@example.test", password="test-password", is_active=False)
    claim_email_invitations(user)
    assert not Connection.objects.exists()
    user.is_active = True
    user.save(update_fields=["is_active"])
    people.b.force_authenticate(user=user)
    data = people.b.get("/contacts/").json()["data"]
    assert len(data["invitations"]) == 1
    assert data["invitations"][0]["direction"] == "incoming"
    assert data["contacts"] == []
    row = Connection.objects.get()
    assert row.initiator_id == people.owner.pk and row.status == "pending"
    assert people.a.get("/contacts/").json()["data"]["email_invitations"] == []
    assert len(people.b.get("/contacts/").json()["data"]["invitations"]) == 1
    response = people.b.post(f"/contacts/invitations/{row.pk}/accept/", {}, format="json")
    assert response.status_code == 200
    row.refresh_from_db()
    assert row.status == "accepted"


def test_expired_and_cancelled_invitations_cannot_be_claimed(people):
    assert send(people).status_code == 201
    EmailInvitation.objects.update(expires_at=timezone.now()-timedelta(seconds=1))
    user = get_user_model().objects.create_user(email="new@example.test", password="test-password", is_active=True)
    claim_email_invitations(user)
    assert not Connection.objects.exists()
    assert people.a.get("/contacts/").json()["data"]["email_invitations"] == []
    EmailInvitation.objects.update(expires_at=timezone.now()+timedelta(days=1), closed=True)
    claim_email_invitations(user)
    assert not Connection.objects.exists()


@pytest.mark.parametrize("language", ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko", "id", "ru", "tr"])
def test_localized_mail_and_optional_store_links(people, settings, language):
    settings.INVITATION_GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=com.flovers.mobile"
    settings.INVITATION_APP_STORE_URL = "https://apps.apple.com/app/example"
    assert send(people, language=language).status_code == 201
    deliver_invitation_emails()
    message = mail.outbox[-1]
    assert "{{" not in message.body and "{{" not in message.alternatives[0].content
    assert "https://play.google.com/" in message.body
    assert "https://apps.apple.com/" in message.body
    assert message.subject != "Flovers"


def test_authentication_required():
    from rest_framework.test import APIClient
    assert APIClient().post(URL, {"email": "new@example.test", "language": "en"}).status_code == 401


def test_multiple_senders_require_separate_consent_and_decline_does_not_reappear(people):
    assert send(people).status_code == 201
    assert people.c.post(URL, {"email": "new@example.test", "language": "en"}, format="json").status_code == 201
    user = get_user_model().objects.create_user(email="new@example.test", password="test-password", is_active=True)
    people.b.force_authenticate(user=user)
    data = people.b.get("/contacts/").json()["data"]
    assert len(data["invitations"]) == 2 and data["contacts"] == []
    invitation_id = data["invitations"][0]["id"]
    assert people.b.delete(f"/contacts/invitations/{invitation_id}/").status_code == 200
    assert len(people.b.get("/contacts/").json()["data"]["invitations"]) == 1
    assert EmailInvitation.objects.filter(closed=False).count() == 0


def test_recipient_daily_limit_across_senders(people):
    for sender in (people.owner, people.recipient, people.outsider):
        EmailInvitation.objects.create(sender=sender, email="new@example.test", language="en",
            sent_at=timezone.now(), expires_at=timezone.now()+timedelta(days=30), closed=True)
    response = send(people)
    assert response.status_code == 429
    assert response.json()["code"] == "throttled"
