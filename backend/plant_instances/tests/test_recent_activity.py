from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from reminders.tests.test_postpone import scene
from reminders.models import Reminder, ReminderTask
from plant_instances.models import PlantInstance

pytestmark=pytest.mark.django_db


def detail(scene):
    return scene.client.get(f"/api/plant-instances/{scene.plant.pk}/")


def test_detail_contains_only_five_latest_completions_newest_first(scene):
    now=timezone.now();rows=[]
    for i in range(7):
        rows.append(ReminderTask.objects.create(user=scene.owner,reminder=scene.reminder,status="completed",
            due_date=timezone.localdate(),completed_at=now-timedelta(days=i),completed_by=scene.owner,note="Private completion note"))
    response=detail(scene)
    assert response.status_code==200,response.data
    activity=response.data["recent_activity"]
    assert [row["id"] for row in activity]==[row.pk for row in rows[:5]]
    assert all(set(row)=={"id","type","completed_at","completed_by"} for row in activity)
    assert activity[0]["type"]=="water"
    assert activity[0]["completed_by"]["id"]==str(scene.owner.pk)
    assert scene.task.pk not in {row["id"] for row in activity}


def test_empty_ties_and_deleted_actor_are_handled_without_fabricating_activity(scene):
    assert detail(scene).data["recent_activity"]==[]
    now=timezone.now()
    first=ReminderTask.objects.create(user=scene.owner,reminder=scene.reminder,status="completed",due_date=timezone.localdate(),completed_at=now)
    second=ReminderTask.objects.create(user=scene.owner,reminder=scene.reminder,status="completed",due_date=timezone.localdate(),completed_at=now)
    activity=detail(scene).data["recent_activity"]
    assert [row["id"] for row in activity]==[second.pk,first.pk]
    assert all(row["completed_by"] is None for row in activity)


def test_owner_and_shared_viewers_see_authorized_activity_but_removed_access_does_not(scene):
    scene.task.mark_complete_and_spawn_next(actor=scene.caregiver)
    owner_activity=detail(scene).data["recent_activity"]
    assert owner_activity[0]["completed_by"]["id"]==str(scene.caregiver.pk)
    scene.client.force_authenticate(scene.caregiver)
    shared=detail(scene)
    assert shared.status_code==200 and shared.data["recent_activity"][0]["id"]==scene.task.pk
    scene.grant.delete()
    assert detail(scene).status_code==404
    scene.client.force_authenticate(scene.other)
    assert detail(scene).status_code==404


def test_moving_a_reminder_does_not_move_old_activity_or_leak_it_to_another_shared_plant(scene):
    scene.task.mark_complete_and_spawn_next(actor=scene.owner)
    other=PlantInstance.objects.create(user=scene.owner,location=scene.plant.location,display_name="Other plant")
    scene.reminder.plant=other;scene.reminder.save(update_fields=["plant","updated_at"])
    response=scene.client.get(f"/api/plant-instances/{other.pk}/")
    assert response.data["recent_activity"]==[]
    assert detail(scene).data["recent_activity"][0]["id"]==scene.task.pk


def test_undone_completion_disappears_from_activity(scene):
    scene.task.mark_complete_and_spawn_next(actor=scene.owner)
    assert len(detail(scene).data["recent_activity"])==1
    response=scene.client.post(reverse("reminder-task-undo-completion",args=[scene.task.pk]),
        {"expected_completion":scene.task.completion_undo["version"]},format="json")
    assert response.status_code==200,response.data
    assert detail(scene).data["recent_activity"]==[]
