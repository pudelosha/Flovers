from datetime import datetime, timedelta, timezone as datetime_timezone
from smtplib import SMTPException
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from profiles import tasks
from profiles.models import NotificationDeliveryLog as Delivery, ProfileNotifications, PushDevice
from profiles.tests.test_task_notifications import _reminder
from reminders.models import ReminderTask

pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def clock(monkeypatch):
    clock = SimpleNamespace(now=datetime(2026, 10, 15, 12, 1, tzinfo=datetime_timezone.utc))
    monkeypatch.setattr(tasks.timezone, "now", lambda: clock.now)
    return clock


def recipient(email, clock, **settings):
    user = User.objects.create_user(email=email, password="password123")
    ProfileNotifications.objects.filter(user=user).update(
        timezone="UTC", email_hour=12, email_minute=0,
        push_hour=12, push_minute=0, push_daily=False, **settings,
    )
    reminder = _reminder(user, name=email)
    task = ReminderTask.objects.create(reminder=reminder, user=user, due_date=clock.now.date())
    return user, task


def test_catches_up_after_missed_minute_and_sends_only_once(clock, monkeypatch):
    user, _ = recipient("catch-up@example.com", clock)
    calls = []
    monkeypatch.setattr(tasks, "_send_email_due_today", lambda u, count: calls.append((u.pk, count)) or True)
    tasks.check_and_send_daily_task_notifications()
    clock.now += timedelta(minutes=10)
    tasks.check_and_send_daily_task_notifications()
    delivery = Delivery.objects.get(user=user)
    assert calls == [(user.pk, 1)]
    assert delivery.status == Delivery.STATUS_SENT and delivery.attempts == 1
    assert delivery.sent_at is not None


def test_failure_isolated_and_retried_after_backoff(clock, monkeypatch):
    first, _ = recipient("failing@example.com", clock)
    second, _ = recipient("healthy@example.com", clock)
    calls = []
    failing = True

    def send(user, count):
        calls.append(user.pk)
        if user.pk == first.pk and failing:
            raise SMTPException("private SMTP response")
        return True

    monkeypatch.setattr(tasks, "_send_email_due_today", send)
    tasks.check_and_send_daily_task_notifications()
    assert sorted(calls) == sorted([first.pk, second.pk])
    failed = Delivery.objects.get(user=first)
    assert failed.status == Delivery.STATUS_PENDING and failed.attempts == 1
    assert failed.last_error == "SMTPException"
    assert Delivery.objects.get(user=second).status == Delivery.STATUS_SENT
    tasks.check_and_send_daily_task_notifications()
    assert len(calls) == 2
    clock.now += timedelta(minutes=1)
    failing = False
    tasks.check_and_send_daily_task_notifications()
    failed.refresh_from_db()
    assert failed.status == Delivery.STATUS_SENT and failed.attempts == 2
    assert calls.count(first.pk) == 2 and calls.count(second.pk) == 1


def test_overlapping_scheduler_claims_before_calling_provider(clock, monkeypatch):
    user, _ = recipient("overlap@example.com", clock)
    calls = []

    def send(user, count):
        calls.append(user.pk)
        assert Delivery.objects.get(user=user).status == Delivery.STATUS_SENDING
        tasks.check_and_send_daily_task_notifications()
        return True

    monkeypatch.setattr(tasks, "_send_email_due_today", send)
    tasks.check_and_send_daily_task_notifications()
    assert calls == [user.pk]
    assert Delivery.objects.get(user=user).status == Delivery.STATUS_SENT


def test_expired_lease_reclaimed_and_old_worker_cannot_finish_new_claim(clock):
    user, _ = recipient("lease@example.com", clock)
    delivery = Delivery.objects.create(user=user, channel="email", kind="due_today", local_date=clock.now.date(),
                                       status=Delivery.STATUS_PENDING, next_attempt_at=clock.now)
    old = tasks._claim_delivery(delivery.pk, clock.now)
    assert old is not None
    assert tasks._claim_delivery(delivery.pk, clock.now) is None
    clock.now += tasks.DELIVERY_LEASE + timedelta(seconds=1)
    new = tasks._claim_delivery(delivery.pk, clock.now)
    assert new is not None and new.claim_token != old.claim_token
    tasks._finish_delivery(old, Delivery.STATUS_SENT, now_utc=clock.now)
    delivery.refresh_from_db()
    assert delivery.status == Delivery.STATUS_SENDING and delivery.claim_token == new.claim_token
    tasks._finish_delivery(new, Delivery.STATUS_SENT, now_utc=clock.now)
    delivery.refresh_from_db()
    assert delivery.status == Delivery.STATUS_SENT and delivery.attempts == 2


@pytest.mark.parametrize("reason", ["opt_out", "completed", "inactive", "expired_day"])
def test_retry_rechecks_current_recipient_and_pending_work(clock, monkeypatch, reason):
    user, task = recipient("recheck@example.com", clock)
    delivery = Delivery.objects.create(user=user, channel="email", kind="due_today", local_date=clock.now.date(),
                                       status=Delivery.STATUS_PENDING, next_attempt_at=clock.now)
    if reason == "opt_out":
        ProfileNotifications.objects.filter(user=user).update(email_daily=False)
    elif reason == "completed":
        task.mark_complete_and_spawn_next()
    elif reason == "inactive":
        User.objects.filter(pk=user.pk).update(is_active=False)
    else:
        clock.now += timedelta(days=1)
    sends = []
    monkeypatch.setattr(tasks, "_send_email_due_today", lambda *args: sends.append(args) or True)
    tasks.check_and_send_daily_task_notifications()
    delivery.refresh_from_db()
    assert delivery.status == Delivery.STATUS_SKIPPED
    if reason != "expired_day":
        assert sends == []
    else:
        # Next day work has no task due; the old job is never sent as today's.
        assert sends == []


def test_no_send_before_preferred_local_time_and_timezone_catch_up(clock, monkeypatch):
    user, _ = recipient("timezone@example.com", clock)
    ProfileNotifications.objects.filter(user=user).update(timezone="America/New_York")
    calls = []
    monkeypatch.setattr(tasks, "_send_email_due_today", lambda *args: calls.append(args) or True)
    tasks.check_and_send_daily_task_notifications()
    assert calls == [] and not Delivery.objects.filter(user=user).exists()
    clock.now += timedelta(hours=4)
    tasks.check_and_send_daily_task_notifications()
    assert len(calls) == 1


def test_push_failure_does_not_block_email_and_push_retries(clock, monkeypatch):
    user, _ = recipient("channels@example.com", clock)
    ProfileNotifications.objects.filter(user=user).update(push_daily=True)
    PushDevice.objects.create(user=user, token="not-a-real-token")
    monkeypatch.setattr(tasks, "_send_email_due_today", lambda *args: True)
    responses = [0, 1]
    monkeypatch.setattr(tasks, "_send_push_and_deactivate_bad_tokens", lambda *args: responses.pop(0))
    tasks.check_and_send_daily_task_notifications()
    assert Delivery.objects.get(user=user, channel="email").status == Delivery.STATUS_SENT
    assert Delivery.objects.get(user=user, channel="push").status == Delivery.STATUS_PENDING
    clock.now += timedelta(minutes=1)
    tasks.check_and_send_daily_task_notifications()
    assert Delivery.objects.get(user=user, channel="push").status == Delivery.STATUS_SENT


def test_legacy_sent_log_is_not_requeued(clock, monkeypatch):
    user, _ = recipient("legacy-log@example.com", clock)
    Delivery.objects.create(user=user, channel="email", local_date=clock.now.date())
    sends = []
    monkeypatch.setattr(tasks, "_send_email_due_today", lambda *args: sends.append(args) or True)
    tasks.check_and_send_daily_task_notifications()
    assert sends == []
