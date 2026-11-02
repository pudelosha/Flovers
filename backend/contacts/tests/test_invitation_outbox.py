from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.db import connection, transaction
from django.utils import timezone

from contacts.models import EmailInvitation, InvitationEmailDelivery
from contacts.services import ContactError, invite_by_email, cancel_email_invitation
from contacts.tasks import deliver_invitation_emails, _claim, _finish, MAX_ATTEMPTS

pytestmark = pytest.mark.django_db


def invite(people, email="new@example.test"):
    return invite_by_email(people.owner,email,"en")


def test_queue_is_atomic_without_smtp_or_broker_calls(people):
    with patch("contacts.tasks.send_templated_email") as smtp, patch.object(deliver_invitation_emails,"delay") as broker:
        with pytest.raises(RuntimeError), transaction.atomic():
            invite(people)
            assert InvitationEmailDelivery.objects.count() == 1
            raise RuntimeError("request transaction rolled back")
        smtp.assert_not_called(); broker.assert_not_called()
    assert not InvitationEmailDelivery.objects.exists()
    assert not EmailInvitation.objects.exists()


@pytest.mark.django_db(transaction=True)
def test_worker_sends_outside_transactions_once(people):
    invite(people)
    def smtp(**kwargs):
        assert not connection.in_atomic_block
        return True
    with patch("contacts.tasks.send_templated_email",side_effect=smtp) as delivery:
        deliver_invitation_emails(); deliver_invitation_emails()
    assert delivery.call_count == 1
    assert InvitationEmailDelivery.objects.get().status == "sent"


@pytest.mark.parametrize("reason",["cancelled","expired","inactive","registered","old_generation"])
def test_no_stale_or_invalid_invitation_is_emailed(people,reason):
    invite(people)
    row=EmailInvitation.objects.get()
    if reason=="cancelled": cancel_email_invitation(people.owner,row.pk)
    elif reason=="expired": EmailInvitation.objects.update(expires_at=timezone.now()-timedelta(seconds=1))
    elif reason=="inactive": get_user_model().objects.filter(pk=people.owner.pk).update(is_active=False)
    elif reason=="registered": get_user_model().objects.create_user(email=row.email,is_active=False)
    else:
        import uuid
        EmailInvitation.objects.update(delivery_generation=uuid.uuid4())
    with patch("contacts.tasks.send_templated_email") as smtp:
        deliver_invitation_emails(); smtp.assert_not_called()
    assert InvitationEmailDelivery.objects.get().status == "skipped"


def test_claim_lease_is_exclusive_and_old_worker_cannot_finish_new_claim(people):
    invite(people)
    pk=InvitationEmailDelivery.objects.get().pk
    old=_claim(pk);assert old is not None and _claim(pk) is None
    InvitationEmailDelivery.objects.update(lease_expires_at=timezone.now()-timedelta(seconds=1))
    new=_claim(pk);assert new is not None and new.claim_token!=old.claim_token
    _finish(old,"sent")
    assert InvitationEmailDelivery.objects.get().status=="sending"
    assert EmailInvitation.objects.get().sent_at is None
    _finish(new,"sent")
    assert InvitationEmailDelivery.objects.get().status=="sent"


def test_retries_stop_after_six_attempts_and_do_not_retry_early(people):
    invite(people)
    with patch("contacts.tasks.send_templated_email",return_value=False) as smtp:
        for attempt in range(MAX_ATTEMPTS):
            deliver_invitation_emails()
            job=InvitationEmailDelivery.objects.get()
            assert job.attempts==attempt+1
            deliver_invitation_emails();assert smtp.call_count==attempt+1
            InvitationEmailDelivery.objects.update(next_attempt_at=timezone.now()-timedelta(seconds=1))
    assert InvitationEmailDelivery.objects.get().status=="failed"
    assert EmailInvitation.objects.get().sent_at is None


def test_hourly_budget_counts_queued_and_cancelled_jobs(people):
    for i in range(20):
        invite(people,f"new{i}@example.test")
        cancel_email_invitation(people.owner,EmailInvitation.objects.get(email=f"new{i}@example.test").pk)
    with pytest.raises(ContactError) as error: invite(people,"extra@example.test")
    assert error.value.status_code==429
    assert InvitationEmailDelivery.objects.count()==20


def test_daily_budget_survives_hour_boundary(people):
    for batch in range(5):
        for i in range(20):invite(people,f"new{batch}-{i}@example.test")
        InvitationEmailDelivery.objects.update(status="sent",created_at=timezone.now()-timedelta(hours=2),sent_at=timezone.now()-timedelta(hours=2))
    with pytest.raises(ContactError) as error: invite(people,"extra@example.test")
    assert error.value.status_code==429


def test_recipient_budget_counts_reservations_before_any_mail_is_sent(people):
    users=get_user_model()
    for i in range(3):
        sender=users.objects.create_user(email=f"sender{i}@example.test",is_active=True)
        invite_by_email(sender," NEW@example.test ","en")
    with pytest.raises(ContactError) as error: invite(people)
    assert error.value.status_code==429
    assert InvitationEmailDelivery.objects.count()==3
    assert len(mail.outbox)==0


def test_long_outage_keeps_recipient_reservations_and_delivered_mail_keeps_its_window(people):
    for i in range(3):
        sender=get_user_model().objects.create_user(email=f"sender{i}@example.test",is_active=True)
        invite_by_email(sender,"new@example.test","en")
    InvitationEmailDelivery.objects.update(created_at=timezone.now()-timedelta(days=2))
    with pytest.raises(ContactError) as error: invite(people)
    assert error.value.status_code==429
    deliver_invitation_emails()
    assert InvitationEmailDelivery.objects.filter(status="sent").count()==3
    with pytest.raises(ContactError) as error: invite(people)
    assert error.value.status_code==429


def test_long_outage_keeps_sender_reservations(people):
    for i in range(20): invite(people,f"new{i}@example.test")
    InvitationEmailDelivery.objects.update(created_at=timezone.now()-timedelta(days=2))
    with pytest.raises(ContactError) as error: invite(people,"extra@example.test")
    assert error.value.status_code==429


def test_reinvite_after_cooldown_supersedes_the_old_undelivered_generation(people):
    invite(people)
    row=EmailInvitation.objects.get()
    cancel_email_invitation(people.owner,row.pk)
    InvitationEmailDelivery.objects.update(created_at=timezone.now()-timedelta(days=2))
    invite(people)
    deliver_invitation_emails()
    assert InvitationEmailDelivery.objects.filter(status="skipped").count()==1
    assert InvitationEmailDelivery.objects.filter(status="sent").count()==1
    assert len(mail.outbox)==1
