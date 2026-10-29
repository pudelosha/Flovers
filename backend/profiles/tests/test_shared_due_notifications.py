from datetime import datetime, timedelta, timezone as datetime_timezone
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from profiles import tasks
from profiles.models import NotificationDeliveryLog as Delivery, ProfileNotifications, PushDevice
from profiles.tests.test_task_notifications import _reminder
from reminders.models import ReminderTask
from sharing.models import PlantShare

pytestmark = pytest.mark.django_db


@pytest.fixture
def shared_scene(monkeypatch):
    clock = SimpleNamespace(now=datetime(2026, 10, 29, 12, 16, tzinfo=datetime_timezone.utc))
    monkeypatch.setattr(tasks.timezone, "now", lambda: clock.now)
    User = get_user_model()
    owner = User.objects.create_user(email="due-owner@example.test", is_active=True)
    caregiver = User.objects.create_user(email="due-caregiver@example.test", is_active=True)
    other = User.objects.create_user(email="due-other@example.test", is_active=True)
    ProfileNotifications.objects.all().update(
        timezone="UTC", email_daily=False, email_24h=False, push_daily=False, push_24h=False,
        email_hour=12, email_minute=15, push_hour=16, push_minute=45,
        email_shared_due=False, push_shared_due=False,
    )
    reminder = _reminder(owner, name="Shared fern")
    shared_task = ReminderTask.objects.create(user=owner, reminder=reminder, due_date=clock.now.date())
    owned_tasks = []
    for name in ("Caregiver plant A", "Caregiver plant B"):
        own_reminder = _reminder(caregiver, name=name)
        owned_tasks.append(ReminderTask.objects.create(user=caregiver, reminder=own_reminder, due_date=clock.now.date()))
    low, high = sorted((owner.pk, caregiver.pk))
    connection = Connection.objects.create(user_low_id=low, user_high_id=high, initiator=owner, status="accepted")
    grant = PlantShare.objects.create(plant=reminder.plant, recipient=caregiver, connection=connection, can_complete_tasks=False)
    emails, pushes, overdue = [], [], []
    monkeypatch.setattr(tasks, "_send_email_due_today", lambda user, count: emails.append((user.pk, count)) or True)
    monkeypatch.setattr(tasks, "_send_email_overdue_1d", lambda user, count: overdue.append((user.pk, count)) or True)
    monkeypatch.setattr(tasks, "_get_push_due_today_text", lambda user, count: ("due", str(count)))
    monkeypatch.setattr(tasks, "_send_push_and_deactivate_bad_tokens", lambda tokens, title, body, data: pushes.append((tokens, body, data)) or 1)
    return SimpleNamespace(clock=clock, owner=owner, caregiver=caregiver, other=other, reminder=reminder,
        task=shared_task, own_tasks=owned_tasks, connection=connection, grant=grant,
        emails=emails, pushes=pushes, overdue=overdue)


def prefs(scene, **values):
    ProfileNotifications.objects.filter(user=scene.caregiver).update(**values)
    return ProfileNotifications.objects.get(user=scene.caregiver)


def test_shared_due_options_default_off_and_profile_api_updates_only_current_account(shared_scene):
    scene = shared_scene
    client = APIClient()
    client.force_authenticate(scene.caregiver)
    data = client.get("/profile/notifications/").data["data"]
    assert data["email_shared_due"] is data["push_shared_due"] is False
    tasks.check_and_send_daily_task_notifications()
    assert not Delivery.objects.exists()
    response = client.patch("/profile/notifications/", {"email_shared_due": True, "push_shared_due": True}, format="json")
    assert response.status_code == 200
    assert response.data["data"]["email_shared_due"] is response.data["data"]["push_shared_due"] is True
    assert ProfileNotifications.objects.get(user=scene.owner).email_shared_due is False
    response = client.patch("/profile/notifications/", {"email_hour": 9, "email_shared_due": False}, format="json")
    assert response.data["data"]["email_shared_due"] is False
    assert response.data["data"]["push_shared_due"] is True


def test_view_only_shared_tasks_can_notify_without_enabling_owned_plant_reminders(shared_scene):
    scene = shared_scene
    prefs(scene, email_shared_due=True)
    assert scene.grant.can_complete_tasks is False
    tasks.check_and_send_daily_task_notifications()
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails == [(scene.caregiver.pk, 1)]
    assert Delivery.objects.filter(user=scene.caregiver, channel="email", kind="due_today").count() == 1
    assert scene.pushes == []


def test_email_and_push_use_independent_count_scopes_and_one_combined_summary(shared_scene):
    scene = shared_scene
    prefs(scene, email_shared_due=True, push_daily=True, push_shared_due=False, push_hour=12, push_minute=15)
    PushDevice.objects.create(user=scene.caregiver, token="own-reminders-device")
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails == [(scene.caregiver.pk, 1)]
    assert scene.pushes[0][1] == "2"
    assert Delivery.objects.filter(user=scene.caregiver).count() == 2
    # Own + shared due tasks are combined, never sent as duplicate summaries.
    Delivery.objects.all().delete()
    prefs(scene, email_daily=True, push_daily=False, push_shared_due=True)
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails[-1] == (scene.caregiver.pk, 3)
    assert scene.pushes[-1][1] == "1"


def test_shared_reminders_follow_existing_channel_time_and_push_supports_both_platforms(shared_scene):
    scene = shared_scene
    prefs(scene, email_shared_due=True, push_shared_due=True)
    PushDevice.objects.create(user=scene.caregiver, token="caregiver-android", platform="android")
    PushDevice.objects.create(user=scene.caregiver, token="caregiver-ios", platform="ios")
    PushDevice.objects.create(user=scene.caregiver, token="inactive-token", is_active=False)
    PushDevice.objects.create(user=scene.owner, token="owner-token")
    scene.clock.now = scene.clock.now.replace(hour=12, minute=14)
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails == [] and scene.pushes == []
    scene.clock.now += timedelta(minutes=2)
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails == [(scene.caregiver.pk, 1)] and scene.pushes == []
    scene.clock.now = scene.clock.now.replace(hour=16, minute=45)
    tasks.check_and_send_daily_task_notifications()
    assert len(scene.emails) == len(scene.pushes) == 1
    assert set(scene.pushes[0][0]) == {"caregiver-android", "caregiver-ios"}
    assert scene.pushes[0][2]["route"] == "Home"


def test_shared_reminders_use_caregiver_notification_timezone(shared_scene):
    scene = shared_scene
    prefs(scene, email_shared_due=True, timezone="America/New_York")
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails == []
    scene.clock.now += timedelta(hours=4)
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails == [(scene.caregiver.pk, 1)]


@pytest.mark.parametrize("reason", ["revoked", "expired", "contact_removed", "contact_pending", "owner_disabled", "recipient_disabled", "paused", "completed", "opt_out", "mismatched_owner"])
def test_queued_shared_summary_rechecks_access_and_pending_work_before_delivery(shared_scene, reason):
    scene = shared_scene
    prefs(scene, email_shared_due=True)
    tasks._enqueue_due_notifications(scene.clock.now)
    delivery = Delivery.objects.get(user=scene.caregiver)
    if reason == "revoked":
        scene.grant.delete()
    elif reason == "expired":
        PlantShare.objects.filter(pk=scene.grant.pk).update(expires_at=scene.clock.now - timedelta(seconds=1))
    elif reason == "contact_removed":
        scene.connection.delete()
    elif reason == "contact_pending":
        Connection.objects.filter(pk=scene.connection.pk).update(status="pending")
    elif reason == "owner_disabled":
        type(scene.owner).objects.filter(pk=scene.owner.pk).update(is_active=False)
    elif reason == "recipient_disabled":
        type(scene.caregiver).objects.filter(pk=scene.caregiver.pk).update(is_active=False)
    elif reason == "paused":
        type(scene.reminder).objects.filter(pk=scene.reminder.pk).update(is_active=False)
    elif reason == "completed":
        scene.task.mark_complete_and_spawn_next(actor=scene.owner)
    elif reason == "opt_out":
        prefs(scene, email_shared_due=False)
    else:
        ReminderTask.objects.filter(pk=scene.task.pk).update(user=scene.other)
    tasks.check_and_send_daily_task_notifications()
    delivery.refresh_from_db()
    assert delivery.status == Delivery.STATUS_SKIPPED
    assert scene.emails == [] and scene.pushes == []


def test_next_day_followup_remains_owner_only(shared_scene):
    scene = shared_scene
    yesterday = scene.clock.now.date() - timedelta(days=1)
    ReminderTask.objects.filter(pk=scene.task.pk).update(due_date=yesterday)
    ReminderTask.objects.filter(pk=scene.own_tasks[0].pk).update(due_date=yesterday)
    ReminderTask.objects.filter(pk=scene.own_tasks[1].pk).update(due_date=scene.clock.now.date() + timedelta(days=1))
    prefs(scene, email_shared_due=True, email_24h=True)
    tasks.check_and_send_daily_task_notifications()
    assert scene.emails == []
    assert scene.overdue == [(scene.caregiver.pk, 1)]
    assert Delivery.objects.get(user=scene.caregiver).kind == Delivery.KIND_OVERDUE_1D


def test_other_recipients_and_unshared_plants_are_not_counted(shared_scene):
    scene = shared_scene
    other_reminder = _reminder(scene.owner, name="Not shared with caregiver")
    ReminderTask.objects.create(user=scene.owner, reminder=other_reminder, due_date=scene.clock.now.date())
    pn = prefs(scene, email_shared_due=True)
    assert tasks._count_notification_tasks(pn, "email", "due_today", scene.clock.now.date(), now=scene.clock.now) == 1
    assert tasks._count_due_on_date(scene.caregiver.pk, scene.clock.now.date()) == 2
