"""Real PostgreSQL + Redis + prefork worker + Beat + SMTP capture journeys."""
from datetime import timedelta
import os
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from contacts.models import InvitationEmailDelivery
from contacts.services import invite_by_email
from profiles.models import NotificationDeliveryLog, ProfileNotifications, PushDevice
from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask
from .harness import INVITATIONS, NOTIFICATIONS, mailpit, wait_until

pytestmark = pytest.mark.django_db(transaction=True)


def user():
    person = get_user_model().objects.create_user(
        email=f"owner-{uuid4().hex}@example.invalid", password="Synthetic-only-123", is_active=True,
        first_name="Synthetic", last_name="Gardener",
    )
    ProfileNotifications.objects.filter(user=person).update(
        email_daily=False, email_shared_due=False, email_24h=False,
        push_daily=False, push_shared_due=False, push_24h=False,
    )
    return person


def invitation(sender=None):
    sender = sender or user()
    recipient = f"invite-{uuid4().hex}@example.invalid"
    invite_by_email(sender, recipient, "pl")
    return InvitationEmailDelivery.objects.get(invitation__email=recipient), recipient


def status(job, expected):
    job.refresh_from_db()
    return job.status == expected


def test_json_serialization_and_registered_worker(runtime):
    payload = {"plant": "Zażółć", "ids": [1, 2], "optional": None, "enabled": True}
    result = runtime.echo(payload)
    assert result["payload"] == payload
    assert result["pid"] != os.getpid() and result["eager"] is False
    assert result["database"] == "flovers_ci"
    assert 160000 <= result["postgres_version"] < 170000
    assert INVITATIONS in result["registered"] and NOTIFICATIONS in result["registered"]


def test_contact_invitation_reaches_smtp_capture(runtime):
    sender = user()
    job, recipient = invitation(sender)
    assert runtime.messages(recipient) == [] and job.status == "pending"
    runtime.send(INVITATIONS)
    runtime.drain()
    assert status(job, "sent") and job.attempts == 1 and job.sent_at
    messages = runtime.wait_mail(recipient)
    assert len(messages) == 1
    message = mailpit("message/" + messages[0]["ID"])
    assert "Synthetic Gardener" in message["Text"]
    assert "/pl" in message["HTML"]


def test_worker_observes_only_committed_invitation_data(runtime):
    sender = user()
    with transaction.atomic():
        job, recipient = invitation(sender)
        runtime.send(INVITATIONS)
        runtime.drain()
        assert status(job, "pending") and job.attempts == 0
        assert runtime.messages(recipient) == []
    runtime.send(INVITATIONS)
    runtime.drain()
    assert status(job, "sent") and len(runtime.wait_mail(recipient)) == 1


def test_rolled_back_invitation_is_never_delivered(runtime):
    sender = user()
    with transaction.atomic():
        job, recipient = invitation(sender)
        transaction.set_rollback(True)
    runtime.send(INVITATIONS)
    runtime.drain()
    assert not InvitationEmailDelivery.objects.filter(pk=job.pk).exists()
    assert runtime.messages(recipient) == []


def test_duplicate_delivery_does_not_send_twice(runtime):
    job, recipient = invitation()
    task_id = str(uuid4())
    runtime.send(INVITATIONS, task_id=task_id)
    runtime.send(INVITATIONS, task_id=task_id)
    runtime.drain()
    assert status(job, "sent") and job.attempts == 1
    assert len(runtime.wait_mail(recipient)) == 1


def test_real_celery_retry_executes_again_in_worker(runtime):
    key = runtime.queue + ":retry"
    result = runtime.send("flovers.integration.retry", args=[key]).get(timeout=30)
    assert result["attempts"] == 2 and result["retries"] == 1
    assert result["pid"] != os.getpid()


def test_smtp_failure_retries_durable_outbox(runtime):
    job, recipient = invitation()
    with runtime.paused_mailpit():
        runtime.send(INVITATIONS)
        wait_until(lambda: status(job, "pending") and job.attempts == 1 and job.last_error,
                   description="SMTP timeout recorded for retry")
    assert job.next_attempt_at > timezone.now() and job.sent_at is None
    runtime.send(INVITATIONS)
    runtime.drain()
    assert status(job, "pending") and job.attempts == 1
    # Advance only this synthetic job's deadline; do not shorten production backoff.
    InvitationEmailDelivery.objects.filter(pk=job.pk).update(next_attempt_at=timezone.now() - timedelta(seconds=1))
    runtime.send(INVITATIONS)
    runtime.drain()
    assert status(job, "sent") and job.attempts == 2
    assert len(runtime.wait_mail(recipient)) == 1


def test_worker_crash_recovers_after_lease_expiration(runtime):
    job, recipient = invitation()
    with runtime.paused_mailpit():
        runtime.send(INVITATIONS)
        wait_until(lambda: status(job, "sending"), description="real worker claim before SMTP")
        assert job.lease_expires_at > timezone.now() and job.claim_token
        old_token = job.claim_token
        runtime.kill_worker()
    runtime.start_worker()
    runtime.send(INVITATIONS)
    runtime.drain()
    assert status(job, "sending") and job.attempts == 1 and job.claim_token == old_token
    assert runtime.messages(recipient) == []
    # Model lease expiry on this fixture, instead of waiting the real 15 minutes.
    InvitationEmailDelivery.objects.filter(pk=job.pk).update(lease_expires_at=timezone.now() - timedelta(seconds=1))
    runtime.send(INVITATIONS)
    runtime.drain()
    assert status(job, "sent") and job.attempts == 2 and job.claim_token == ""
    assert len(runtime.wait_mail(recipient)) == 1


def test_broker_restart_preserves_queued_delivery_and_worker_recovers(runtime):
    job, recipient = invitation()
    worker_pid = runtime.worker[0].pid
    key = runtime.queue + ":gate"
    gate = runtime.send("flovers.integration.gate", args=[key])
    wait_until(lambda: runtime.redis.get(key + ":started"), description="worker gate")
    runtime.send(INVITATIONS)
    runtime.restart_redis()
    runtime.redis.set(key + ":release", "1", ex=120)
    gate.get(timeout=40)
    wait_until(lambda: status(job, "sent"), description="queued invitation after broker restart")
    runtime.drain()
    assert runtime.worker[0].pid == worker_pid and runtime.worker[0].poll() is None
    assert job.attempts == 1 and len(runtime.wait_mail(recipient)) == 1


def test_notification_consent_revoked_before_worker_delivery(runtime):
    recipient = user()
    today = timezone.now().date()
    place = Location.objects.create(user=recipient, name="Synthetic room", category="indoor")
    plant = PlantInstance.objects.create(user=recipient, location=place, display_name="Synthetic plant")
    reminder = Reminder.objects.create(user=recipient, plant=plant, type="water", start_date=today,
                                      interval_value=7, interval_unit="days")
    ReminderTask.objects.create(user=recipient, reminder=reminder, due_date=today)
    ProfileNotifications.objects.filter(user=recipient).update(email_daily=True, timezone="UTC", email_hour=0, email_minute=0)
    delivery = NotificationDeliveryLog.objects.create(user=recipient, channel="email", kind="due_today",
        local_date=today, status="pending", next_attempt_at=timezone.now())
    runtime.kill_worker()
    runtime.send(NOTIFICATIONS)
    ProfileNotifications.objects.filter(user=recipient).update(email_daily=False)
    runtime.start_worker()
    runtime.drain()
    delivery.refresh_from_db()
    assert delivery.status == "skipped" and delivery.attempts == 1
    assert runtime.messages(recipient.email) == []
    assert not PushDevice.objects.exists()


def test_celery_beat_dispatches_real_invitation_task(runtime):
    job, recipient = invitation()
    runtime.drain()
    assert status(job, "pending") and job.attempts == 0
    runtime.start_beat()
    wait_until(lambda: status(job, "sent"), description="Beat-dispatched outbox task")
    assert job.attempts == 1 and len(runtime.wait_mail(recipient)) == 1
    runtime.drain()
    assert len(runtime.messages(recipient)) == 1
