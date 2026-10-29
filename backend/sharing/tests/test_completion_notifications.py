from datetime import timedelta
from unittest.mock import Mock, patch

import pytest
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from core.i18n import load_email_scope
from profiles.models import ProfileNotifications, ProfileSettings, PushDevice
from sharing.identity import care_actor_identity
from reminders.models import Reminder, ReminderTask
from sharing.models import SharedCareNotification
from sharing.tasks import _claim, deliver_shared_care_notifications
from .conftest import put, recipient, snapshot, update

pytestmark = pytest.mark.django_db


def enable(scene, email=True, push=True, complete=True):
    change = update(scene.plant, [recipient(scene.viewer, complete), recipient(scene.second)])
    data = snapshot(put(scene.a, change))
    response = scene.a.patch("/profile/notifications/", {"shared_task_email": email, "shared_task_push": push}, format="json")
    assert response.status_code == 200
    return data


@pytest.fixture
def providers(monkeypatch):
    email, push = Mock(return_value=True), Mock(return_value=1)
    monkeypatch.setattr("sharing.tasks.send_templated_email", email)
    monkeypatch.setattr("sharing.tasks._send_push_and_deactivate_bad_tokens", push)
    return email, push


def complete(scene, actor=None):
    scene.task.mark_complete_and_spawn_next(actor=actor or scene.viewer)


def test_preferences_live_in_owner_profile_and_sharing_cannot_change_them(scene):
    data = snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer, True)])))
    assert "notification_preferences" not in data
    settings = scene.a.get("/profile/notifications/").data["data"]
    assert settings["shared_task_email"] is settings["shared_task_push"] is False
    response = scene.a.patch("/profile/notifications/", {"shared_task_email": True}, format="json")
    assert response.data["data"]["shared_task_email"] is True
    assert response.data["data"]["shared_task_push"] is False
    snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer, True)], revision=1)))
    assert scene.a.get("/profile/notifications/").data["data"]["shared_task_email"] is True
    scene.b.patch("/profile/notifications/", {"shared_task_email": False}, format="json")
    assert scene.a.get("/profile/notifications/").data["data"]["shared_task_email"] is True


def test_global_preferences_apply_to_every_plant_the_owner_shares(scene):
    enable(scene)
    snapshot(put(scene.a, update(scene.second_plant, [recipient(scene.viewer, True)])))
    reminder = Reminder.objects.create(user=scene.owner, plant=scene.second_plant, type="water", start_date=timezone.localdate(), interval_value=7)
    second_task = ReminderTask.objects.create(user=scene.owner, reminder=reminder, due_date=timezone.localdate())
    complete(scene)
    second_task.mark_complete_and_spawn_next(actor=scene.viewer)
    assert SharedCareNotification.objects.count() == 4
    assert set(SharedCareNotification.objects.values_list("plant_id", flat=True)) == {scene.plant.pk, scene.second_plant.pk}


@pytest.mark.parametrize("email,push", [(False, False), (True, False), (False, True), (True, True)])
def test_only_opted_in_channels_are_queued_for_owner_independent_of_daily_summaries(scene, email, push, providers):
    enable(scene, email, push)
    ProfileNotifications.objects.filter(user=scene.owner).update(email_daily=False, email_24h=False, push_daily=False, push_24h=False)
    complete(scene)
    expected = ({"email"} if email else set()) | ({"push"} if push else set())
    assert set(SharedCareNotification.objects.values_list("channel", flat=True)) == expected
    assert all(row.owner_id == scene.owner.pk and row.plant_id == scene.plant.pk for row in SharedCareNotification.objects.all())
    assert all(mock.call_count == 0 for mock in providers)


def test_owner_completion_never_notifies_self(scene):
    enable(scene)
    complete(scene, scene.owner)
    assert not SharedCareNotification.objects.exists()


def test_view_only_caregiver_cannot_complete_or_generate_notifications(scene):
    enable(scene, complete=False)
    with pytest.raises(Http404):
        complete(scene)
    assert not SharedCareNotification.objects.exists()


def test_repeated_completion_deduplicates_and_dispatches_only_after_commit(scene, django_capture_on_commit_callbacks):
    enable(scene)
    with django_capture_on_commit_callbacks() as callbacks:
        complete(scene)
        complete(scene)
        assert SharedCareNotification.objects.count() == 2
    assert len(callbacks) == 1
    with patch("sharing.tasks.deliver_shared_care_notifications.apply_async") as enqueue:
        callbacks[0]()
        assert enqueue.call_count == 1
        assert set(enqueue.call_args.kwargs["kwargs"]["delivery_ids"]) == set(SharedCareNotification.objects.values_list("pk", flat=True))


def test_rolled_back_completion_has_no_delivery_or_commit_callback(scene, django_capture_on_commit_callbacks):
    enable(scene)
    with django_capture_on_commit_callbacks() as callbacks:
        with pytest.raises(ValueError), transaction.atomic():
            complete(scene)
            raise ValueError("Rollback completion")
    assert callbacks == []
    assert not SharedCareNotification.objects.exists()
    scene.task.refresh_from_db()
    assert scene.task.status == "pending"


def test_broker_failure_keeps_committed_work_available_for_periodic_recovery(scene, providers, django_capture_on_commit_callbacks):
    enable(scene, push=False)
    with patch("sharing.tasks.deliver_shared_care_notifications.apply_async", side_effect=RuntimeError("Broker down")):
        with django_capture_on_commit_callbacks(execute=True):
            complete(scene)
    assert SharedCareNotification.objects.get().status == "pending"
    deliver_shared_care_notifications()
    assert SharedCareNotification.objects.get().status == "sent"


def test_worker_sends_once_per_channel_to_owner_and_supports_both_mobile_platforms(scene, providers):
    enable(scene)
    complete(scene)
    PushDevice.objects.create(user=scene.owner, token="owner-android", platform="android")
    PushDevice.objects.create(user=scene.owner, token="owner-ios", platform="ios")
    PushDevice.objects.create(user=scene.viewer, token="actor-device")
    deliver_shared_care_notifications()
    deliver_shared_care_notifications()
    email, push = providers
    assert email.call_count == push.call_count == 1
    assert email.call_args.kwargs["to_email"] == scene.owner.email
    assert "Cara" in email.call_args.kwargs["context"]["line1"]
    assert "Family fern" in email.call_args.kwargs["context"]["line1"]
    assert set(push.call_args.args[0]) == {"owner-android", "owner-ios"}
    assert push.call_args.args[3]["route"] == "TaskHistory"
    assert push.call_args.args[3]["url"].endswith(f"task-history?plantId={scene.plant.pk}")
    assert set(SharedCareNotification.objects.values_list("status", flat=True)) == {"sent"}


def test_one_failed_channel_retries_without_resending_the_successful_channel(scene, providers):
    enable(scene)
    complete(scene)
    PushDevice.objects.create(user=scene.owner, token="owner-device")
    email, push = providers
    email.side_effect = RuntimeError("Mail temporarily unavailable")
    deliver_shared_care_notifications()
    delivery = SharedCareNotification.objects.get(channel="email")
    assert delivery.status == "pending" and delivery.next_attempt_at > timezone.now()
    assert SharedCareNotification.objects.get(channel="push").status == "sent"
    deliver_shared_care_notifications()
    assert email.call_count == push.call_count == 1
    email.side_effect = None
    SharedCareNotification.objects.filter(pk=delivery.pk).update(next_attempt_at=timezone.now())
    deliver_shared_care_notifications()
    assert email.call_count == 2 and push.call_count == 1


def test_worker_claim_prevents_overlapping_sends_and_recovers_expired_leases(scene, providers):
    enable(scene, push=False)
    complete(scene)
    delivery = SharedCareNotification.objects.get()
    assert _claim(delivery.pk) is not None
    assert _claim(delivery.pk) is None
    deliver_shared_care_notifications()
    assert providers[0].call_count == 0
    SharedCareNotification.objects.filter(pk=delivery.pk).update(lease_expires_at=timezone.now() - timedelta(seconds=1))
    deliver_shared_care_notifications()
    assert providers[0].call_count == 1
    assert SharedCareNotification.objects.get().status == "sent"


@pytest.mark.parametrize("cause", ["opt_out", "inactive_owner", "deleted_task", "stale"])
def test_delivery_rechecks_preferences_and_skips_obsolete_work(scene, providers, cause):
    enable(scene, push=False)
    complete(scene)
    if cause == "opt_out":
        ProfileNotifications.objects.filter(user=scene.owner).update(shared_task_email=False)
    elif cause == "inactive_owner":
        scene.owner.is_active = False
        scene.owner.save(update_fields=["is_active"])
    elif cause == "deleted_task":
        scene.task.delete()
    else:
        SharedCareNotification.objects.update(created_at=timezone.now() - timedelta(days=2))
    deliver_shared_care_notifications()
    assert SharedCareNotification.objects.get().status == "skipped"
    assert providers[0].call_count == providers[1].call_count == 0


def test_actor_names_use_private_alias_for_owner_without_leaking_email_to_other_caregivers(scene):
    enable(scene, email=False, push=False)
    scene.viewer.first_name = ""
    scene.viewer.save(update_fields=["first_name"])
    low = scene.connection.user_low_id == scene.owner.pk
    setattr(scene.connection, "alias_low" if low else "alias_high", "Mom")
    scene.connection.save()
    complete(scene)
    assert care_actor_identity(scene.viewer, scene.owner)["name"] == "Mom"
    assert care_actor_identity(scene.viewer, scene.viewer)["name"] == scene.viewer.email
    assert care_actor_identity(scene.viewer, scene.second)["name"].startswith("FL-")
    response = scene.a.get("/reminders/tasks/?status=completed")
    assert response.status_code == 200
    assert response.data[0]["completed_by"]["name"] == "Mom"
    response = scene.c.get("/reminders/tasks/?status=completed")
    assert response.data[0]["completed_by"]["name"].startswith("FL-")
    assert scene.viewer.email not in str(response.data)


@pytest.mark.parametrize("language", ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko", "id", "ru", "tr"])
def test_email_renders_localized_care_details_in_existing_template(scene, mailoutbox, language):
    enable(scene, push=False)
    ProfileSettings.objects.filter(user=scene.owner).update(language=language)
    complete(scene)
    deliver_shared_care_notifications()
    assert len(mailoutbox) == 1
    message = mailoutbox[0]
    assert message.subject == load_email_scope("sharing.task_completed", lang=language)["subject"]
    assert not message.subject.startswith("[Flovers]")
    assert "Family fern" in message.body and "Cara" in message.body
    assert "{actor}" not in message.body and "{date}" not in message.body
    assert "/profile/open/task-history/" in message.body
    assert message.alternatives
