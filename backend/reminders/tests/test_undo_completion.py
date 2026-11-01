import uuid
from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from unittest.mock import patch

from reminders.tests.test_postpone import scene
from reminders.models import Reminder, ReminderTask
from reminders.undo import undo_versions
from profiles.models import AccountProgression, TaskXPAward
from profiles.progression import get_progression

pytestmark = pytest.mark.django_db


def complete(scene, actor=None, note="Completed note"):
    scene.task.refresh_from_db()
    child = scene.task.mark_complete_and_spawn_next(note=note, actor=actor or scene.owner)
    scene.task.refresh_from_db()
    return child


def undo(scene, token=None):
    return scene.client.post(reverse("reminder-task-undo-completion", args=[scene.task.pk]),
        {"expected_completion": token or scene.task.completion_undo["version"]}, format="json")


def test_undo_restores_task_only_and_reverses_balance_and_daily_quota(scene):
    definition = Reminder.objects.values().get(pk=scene.reminder.pk)
    due = scene.task.due_date
    child = complete(scene)
    assert undo_versions([scene.task], scene.owner)[scene.task.pk]
    assert get_progression(scene.owner)["total_xp"] == 100
    response = undo(scene)
    assert response.status_code == 200, response.data
    scene.task.refresh_from_db()
    assert scene.task.status == "pending" and scene.task.due_date == due
    assert scene.task.note == "Keep note"
    assert scene.task.completed_at is None and scene.task.completed_by_id is None
    assert scene.task.completed_event is None and scene.task.completion_undo is None
    assert not ReminderTask.objects.filter(pk=child.pk).exists()
    assert ReminderTask.objects.filter(reminder=scene.reminder, status="pending").count() == 1
    assert Reminder.objects.values().get(pk=scene.reminder.pk) == definition
    assert get_progression(scene.owner)["total_xp"] == get_progression(scene.owner)["daily_xp"] == 0
    assert TaskXPAward.objects.get(source_task_id=scene.task.pk).is_reversed


def test_owner_can_undo_caregiver_completion_but_caregiver_cannot(scene):
    complete(scene, actor=scene.caregiver)
    assert get_progression(scene.caregiver)["total_xp"] == 100
    assert not undo_versions([scene.task], scene.caregiver)
    scene.client.force_authenticate(scene.caregiver)
    assert undo(scene).status_code == 404
    scene.client.force_authenticate(scene.owner)
    assert undo(scene).status_code == 200
    assert get_progression(scene.caregiver)["total_xp"] == 0
    assert get_progression(scene.owner)["total_xp"] == 0


def test_stale_token_and_duplicate_undo_cannot_undo_another_completion(scene):
    complete(scene);token = scene.task.completion_undo["version"]
    assert undo(scene, str(uuid.uuid4())).status_code == 409
    assert undo(scene, token).status_code == 200
    assert undo(scene, token).status_code == 409
    complete(scene)
    assert undo(scene, token).status_code == 409
    assert get_progression(scene.owner)["total_xp"] == 100


@pytest.mark.parametrize("change", ["postpone", "note", "delete", "reminder", "complete"])
def test_any_later_activity_blocks_undo_without_losing_data(scene, change):
    child = complete(scene)
    if change == "postpone":
        child.postpone(child.due_date + timedelta(days=1), actor=scene.owner, expected_due_date=child.due_date)
    elif change == "note":
        child.note = "Keep this later edit";child.save(update_fields=["note", "updated_at"])
    elif change == "delete":
        child.delete();scene.reminder.ensure_one_pending_task()
    elif change == "reminder":
        scene.reminder.interval_value = 8;scene.reminder.save(update_fields=["interval_value", "updated_at"])
    else:
        child.mark_complete_and_spawn_next(actor=scene.owner)
    assert not undo_versions([scene.task], scene.owner)
    before = list(ReminderTask.objects.filter(reminder=scene.reminder).values())
    assert undo(scene).status_code == 409
    assert list(ReminderTask.objects.filter(reminder=scene.reminder).values()) == before


def test_latest_is_per_reminder_and_not_per_plant(scene):
    complete(scene)
    reminder = Reminder.objects.create(user=scene.owner, plant=scene.plant, type="care", start_date=timezone.localdate(), interval_value=3)
    other = reminder.ensure_one_pending_task();other.mark_complete_and_spawn_next(actor=scene.owner)
    assert set(undo_versions([scene.task, other], scene.owner)) == {scene.task.pk, other.pk}
    assert undo(scene).status_code == 200
    other.refresh_from_db();assert other.status == "completed"


def test_repeat_complete_undo_cannot_multiply_rewards_and_can_change_completing_actor(scene):
    for _ in range(3):
        complete(scene)
        assert get_progression(scene.owner)["total_xp"] == 100
        assert undo(scene).status_code == 200
        assert get_progression(scene.owner)["total_xp"] == 0
    complete(scene, actor=scene.caregiver)
    assert get_progression(scene.caregiver)["total_xp"] == 100
    assert get_progression(scene.owner)["total_xp"] == 0
    assert TaskXPAward.objects.filter(source_task_id=scene.task.pk).count() == 1


def test_restores_postponed_date_and_old_completions_without_provenance_are_not_offered(scene):
    scene.task.due_date -= timedelta(days=2);scene.task.save()
    due = scene.task.due_date;complete(scene)
    assert undo(scene).status_code == 200
    scene.task.refresh_from_db();assert scene.task.due_date == due
    complete(scene);ReminderTask.objects.filter(pk=scene.task.pk).update(completion_undo=None)
    scene.task.refresh_from_db()
    assert not undo_versions([scene.task], scene.owner)
    assert undo(scene, str(uuid.uuid4())).status_code == 409


def test_transaction_rolls_back_on_balance_write_failure(scene):
    child = complete(scene)
    with patch.object(AccountProgression, "save", side_effect=RuntimeError("storage failed")):
        with pytest.raises(RuntimeError):undo(scene)
    scene.task.refresh_from_db()
    assert scene.task.status == "completed" and ReminderTask.objects.filter(pk=child.pk).exists()
    assert get_progression(scene.owner)["total_xp"] == 100
    assert not TaskXPAward.objects.get(source_task_id=scene.task.pk).is_reversed


def test_journal_feed_exposes_eligibility_from_server(scene):
    complete(scene)
    response = scene.client.get("/api/journal/entries/")
    assert response.status_code == 200, response.data
    row = next(row["data"] for row in response.data["results"] if row["kind"] == "task")
    assert row["undo_completion"] == scene.task.completion_undo["version"]
    scene.client.force_authenticate(scene.caregiver)
    response = scene.client.get("/api/journal/entries/")
    row = next(row["data"] for row in response.data["results"] if row["kind"] == "task")
    assert row["undo_completion"] is None


def test_undo_skips_pending_messages_but_does_not_recall_sent_notifications(scene):
    from sharing.models import SharedCareNotification
    complete(scene, actor=scene.caregiver)
    pending = SharedCareNotification.objects.create(owner=scene.owner, plant=scene.plant, source_task_id=scene.task.pk, channel="email")
    sent = SharedCareNotification.objects.create(owner=scene.owner, plant=scene.plant, source_task_id=scene.task.pk, channel="push", status="sent", sent_at=timezone.now())
    assert undo(scene).status_code == 200
    pending.refresh_from_db();sent.refresh_from_db()
    assert pending.status == "skipped" and sent.status == "sent" and sent.sent_at


@pytest.mark.django_db(transaction=True)
def test_concurrent_undo_reverses_xp_only_once_on_postgresql(scene):
    from django.db import connection, close_old_connections
    if connection.vendor != "postgresql":
        pytest.skip("PostgreSQL row-lock concurrency check")
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.contrib.auth import get_user_model
    from rest_framework.test import APIClient
    complete(scene);token=scene.task.completion_undo["version"]
    barrier=Barrier(2);url=reverse("reminder-task-undo-completion",args=[scene.task.pk]);owner_id=scene.owner.pk
    def worker(_):
        close_old_connections()
        try:
            client=APIClient();client.force_authenticate(get_user_model().objects.get(pk=owner_id))
            barrier.wait(timeout=5)
            return client.post(url,{"expected_completion":token},format="json").status_code
        finally:
            connection.close()
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(worker,range(2)))
    assert sorted(results)==[200,409]
    assert get_progression(scene.owner)["total_xp"] == 0
    assert ReminderTask.objects.filter(reminder=scene.reminder,status="pending").count()==1
