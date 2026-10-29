from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.http import Http404
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.models import AccountProgression, TaskXPAward
from reminders.models import Reminder, ReminderTask
from sharing.models import PlantShare

pytestmark = pytest.mark.django_db


@pytest.fixture
def scene():
    User = get_user_model()
    owner = User.objects.create_user(email="owner-sharing@example.test", first_name="Alice")
    viewer = User.objects.create_user(email="viewer-sharing@example.test", first_name="Cara")
    outsider = User.objects.create_user(email="outsider-sharing@example.test")
    low, high = sorted((owner.pk, viewer.pk))
    contact = Connection.objects.create(user_low_id=low, user_high_id=high, initiator=owner, status="accepted")
    location = Location.objects.create(user=owner, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(user=owner, location=location, display_name="Family fern")
    reminder = Reminder.objects.create(user=owner, plant=plant, type="water", start_date=timezone.localdate(), interval_value=7)
    task = ReminderTask.objects.create(reminder=reminder, user=owner, due_date=timezone.localdate())
    grant = PlantShare.objects.create(plant=plant, recipient=viewer, connection=contact, can_complete_tasks=True)
    clients = []
    for user in (owner, viewer, outsider):
        client = APIClient()
        client.force_authenticate(user)
        clients.append(client)
    return SimpleNamespace(owner=owner, viewer=viewer, outsider=outsider, contact=contact, location=location,
        plant=plant, reminder=reminder, task=task, grant=grant, a=clients[0], b=clients[1], c=clients[2])


def complete(client, task):
    return client.post(reverse("reminder-task-complete", args=[task.pk]), {"note": "Actual care"}, format="json")


def test_recipient_reads_tasks_but_reminder_definitions_remain_owner_only(scene):
    reminders = scene.b.get(reverse("reminders-list-create"))
    tasks = scene.b.get(reverse("reminder-tasks-list"), {"status": "pending"})
    assert reminders.status_code == tasks.status_code == 200
    assert reminders.data == []
    assert scene.b.get(reverse("reminder-detail", args=[scene.reminder.pk])).status_code == 404
    assert [item["id"] for item in scene.a.get(reverse("reminders-list-create")).data] == [scene.reminder.pk]
    assert scene.a.get(reverse("reminder-detail", args=[scene.reminder.pk])).status_code == 200
    assert [item["id"] for item in tasks.data] == [scene.task.pk]
    assert tasks.data[0]["access"]["is_shared"] is True
    assert tasks.data[0]["access"]["can_edit"] is False
    assert tasks.data[0]["access"]["can_complete_tasks"] is True
    assert tasks.data[0]["access"]["owner"]["id"] == str(scene.owner.pk)
    assert tasks.data[0]["plant"] == scene.plant.pk
    assert tasks.data[0]["type"] == "water"
    assert scene.c.get(reverse("reminder-tasks-list")).data == []


def test_caregiver_completion_preserves_owner_and_rewards_only_the_actor(scene):
    response = complete(scene.b, scene.task)
    assert response.status_code == 200, response.data
    scene.task.refresh_from_db()
    next_task = ReminderTask.objects.get(status="pending")
    assert scene.task.status == "completed"
    assert scene.task.completed_by_id == scene.viewer.pk
    assert scene.task.user_id == next_task.user_id == scene.owner.pk
    assert scene.reminder.user_id == scene.owner.pk
    assert TaskXPAward.objects.get(source_task_id=scene.task.pk).user_id == scene.viewer.pk
    assert AccountProgression.objects.get(user=scene.viewer).total_xp == 100
    assert not AccountProgression.objects.filter(user=scene.owner).exists()
    assert response.data["completed_task"]["completed_by"] == {"id": str(scene.viewer.pk), "name": "Cara"}
    repeated = complete(scene.a, scene.task)
    assert repeated.status_code == 200
    assert repeated.data["next_task"] is None
    assert repeated.data["completed_task"]["completed_by"]["id"] == str(scene.viewer.pk)
    assert ReminderTask.objects.count() == 2
    assert TaskXPAward.objects.count() == 1


def test_view_only_recipient_can_read_but_cannot_complete(scene):
    scene.grant.can_complete_tasks = False
    scene.grant.save(update_fields=["can_complete_tasks"])
    assert scene.b.get(reverse("reminder-tasks-list")).data[0]["access"]["can_complete_tasks"] is False
    assert complete(scene.b, scene.task).status_code == 404
    scene.task.refresh_from_db()
    assert scene.task.status == "pending"
    assert scene.task.completed_by_id is None
    assert not TaskXPAward.objects.exists()


@pytest.mark.parametrize("change", ["expired", "revoked", "contact_removed", "contact_pending", "owner_disabled"])
def test_expiry_revocation_and_contact_removal_stop_reads_and_completion(scene, change):
    if change == "expired":
        PlantShare.objects.filter(pk=scene.grant.pk).update(expires_at=timezone.now() - timedelta(seconds=1))
    elif change == "revoked":
        scene.grant.delete()
    elif change == "contact_removed":
        scene.contact.delete()
    elif change == "contact_pending":
        Connection.objects.filter(pk=scene.contact.pk).update(status="pending")
    else:
        get_user_model().objects.filter(pk=scene.owner.pk).update(is_active=False)
    assert scene.b.get(reverse("reminders-list-create")).data == []
    assert scene.b.get(reverse("reminder-tasks-list")).data == []
    assert complete(scene.b, scene.task).status_code == 404
    assert not TaskXPAward.objects.exists()


def test_stale_task_objects_cannot_complete_after_permission_removal(scene):
    stale = ReminderTask.objects.get(pk=scene.task.pk)
    scene.grant.can_complete_tasks = False
    scene.grant.save(update_fields=["can_complete_tasks"])
    with pytest.raises(Http404):
        stale.mark_complete_and_spawn_next(actor=scene.viewer)
    assert not TaskXPAward.objects.exists()


def test_shared_recipients_cannot_create_edit_delete_or_export_owner_history(scene, mailoutbox):
    payload = {"plant": scene.plant.pk, "type": "care", "start_date": str(timezone.localdate()), "interval_value": 3}
    assert scene.b.post(reverse("reminders-list-create"), payload, format="json").status_code == 400
    detail = reverse("reminder-detail", args=[scene.reminder.pk])
    assert scene.b.patch(detail, {"interval_value": 2}, format="json").status_code == 404
    assert scene.b.delete(detail).status_code == 404
    assert complete(scene.b, scene.task).status_code == 200
    assert scene.b.delete(reverse("reminder-task-detail-delete", args=[scene.task.pk])).status_code == 404
    # The existing export endpoint permits an empty export of the caller's own
    # history. It must not add shared history to that export.
    with patch("reminders.views.send_templated_email") as send:
        assert scene.b.post(reverse("reminder-task-export-email"), {}, format="json").status_code == 200
    assert send.call_args.kwargs["context"]["total_count"] == 0
    assert Reminder.objects.filter(pk=scene.reminder.pk).exists()
    assert ReminderTask.objects.filter(pk=scene.task.pk).exists()
    assert mailoutbox == []


def test_task_history_and_journal_are_shared_but_never_editable(scene):
    assert complete(scene.a, scene.task).status_code == 200
    history = scene.b.get(reverse("reminder-tasks-list"), {"status": "completed"})
    journal = scene.b.get(reverse("plant-instance-journal", args=[scene.plant.pk]))
    assert [item["id"] for item in history.data] == [scene.task.pk]
    assert [item["id"] for item in journal.data] == [scene.task.pk]
    assert history.data[0]["completed_by"]["id"] == str(scene.owner.pk)
    scene.grant.delete()
    assert scene.b.get(reverse("reminder-tasks-list"), {"status": "completed"}).data == []
    assert scene.b.get(reverse("plant-instance-journal", args=[scene.plant.pk])).data == []


def test_moving_a_reminder_to_a_shared_plant_does_not_expose_old_unshared_history(scene):
    scene.task.mark_complete_and_spawn_next(note="Private old-plant history")
    new_plant = PlantInstance.objects.create(user=scene.owner, location=scene.location, display_name="Shared orchid")
    Reminder.objects.filter(pk=scene.reminder.pk).update(plant=new_plant)
    scene.grant.delete()
    PlantShare.objects.create(plant=new_plant, recipient=scene.viewer, connection=scene.contact, can_complete_tasks=False)
    assert scene.b.get(reverse("reminder-tasks-list"), {"status": "completed"}).data == []
    assert scene.b.get(reverse("plant-instance-journal", args=[new_plant.pk])).data == []
    assert scene.b.get(reverse("plant-instance-journal", args=[scene.plant.pk])).data == []
    # The original owner retains the immutable historical event.
    history = scene.a.get(reverse("reminder-tasks-list"), {"status": "completed"})
    assert history.data[0]["completed_event"]["plant_id"] == scene.plant.pk
    assert history.data[0]["note"] == "Private old-plant history"


def test_history_permissions_follow_event_plant_not_moved_reminder(scene):
    scene.task.mark_complete_and_spawn_next()
    other_plant = PlantInstance.objects.create(user=scene.owner, location=scene.location, display_name="Other shared plant")
    Reminder.objects.filter(pk=scene.reminder.pk).update(plant=other_plant)
    PlantShare.objects.create(plant=other_plant, recipient=scene.viewer, connection=scene.contact, can_complete_tasks=False)
    history = scene.b.get(reverse("reminder-tasks-list"), {"status": "completed"})
    assert history.data[0]["access"]["can_complete_tasks"] is True


def test_deleting_a_caregiver_retains_owner_task_history(scene):
    assert complete(scene.b, scene.task).status_code == 200
    scene.viewer.delete()
    scene.task.refresh_from_db()
    assert scene.task.completed_by_id is None
    assert scene.task.status == "completed"
    assert scene.task.user_id == scene.owner.pk
    assert scene.task.note == "Actual care"


@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(connection.vendor != "postgresql", reason="PostgreSQL row-lock concurrency check")
def test_owner_and_caregiver_simultaneously_complete_one_canonical_task(scene):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.db import close_old_connections

    ready = Barrier(2)

    def finish(user_id):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(get_user_model().objects.get(pk=user_id))
            ready.wait(timeout=5)
            return complete(client, scene.task).status_code
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(finish, [scene.owner.pk, scene.viewer.pk]))
    assert results == [200, 200]
    scene.task.refresh_from_db()
    award = TaskXPAward.objects.get(source_task_id=scene.task.pk)
    assert scene.task.completed_by_id == award.user_id
    assert ReminderTask.objects.count() == 2
    assert ReminderTask.objects.filter(status="pending", user=scene.owner).count() == 1
    assert TaskXPAward.objects.count() == 1
    assert AccountProgression.objects.get(user_id=award.user_id).total_xp == 100
