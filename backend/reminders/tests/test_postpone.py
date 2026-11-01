from datetime import timedelta
from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.models import TaskXPAward
from reminders.models import Reminder, ReminderTask
from sharing.models import PlantShare

pytestmark=pytest.mark.django_db


@pytest.fixture
def scene():
    User=get_user_model()
    owner=User.objects.create_user(email="postpone-owner@example.test",is_active=True)
    other=User.objects.create_user(email="postpone-other@example.test",is_active=True)
    caregiver=User.objects.create_user(email="postpone-care@example.test",is_active=True)
    location=Location.objects.create(user=owner,name="Room")
    plant=PlantInstance.objects.create(user=owner,location=location,display_name="Fern")
    reminder=Reminder.objects.create(user=owner,plant=plant,type="water",start_date=timezone.localdate(),interval_value=7)
    task=ReminderTask.objects.create(user=owner,reminder=reminder,due_date=timezone.localdate(),note="Keep note")
    low,high=sorted((owner.pk,caregiver.pk))
    contact=Connection.objects.create(user_low_id=low,user_high_id=high,initiator=owner,status="accepted")
    grant=PlantShare.objects.create(plant=plant,recipient=caregiver,connection=contact,can_complete_tasks=True)
    client=APIClient();client.force_authenticate(owner)
    return SimpleNamespace(owner=owner,other=other,caregiver=caregiver,plant=plant,reminder=reminder,
        task=task,grant=grant,client=client,url=reverse("reminder-task-postpone",args=[task.pk]))


def postpone(scene,days=2,**extra):
    return scene.client.post(scene.url,{"due_date":(timezone.localdate()+timedelta(days=days)).isoformat(),
        "expected_due_date":scene.task.due_date.isoformat(),**extra},format="json")


def test_moves_only_pending_due_date_and_preserves_the_complete_reminder_definition(scene):
    definition=Reminder.objects.values().get(pk=scene.reminder.pk)
    task_id=scene.task.pk
    response=postpone(scene,interval_value=1,start_date="2000-01-01")
    assert response.status_code==200,response.data
    scene.task.refresh_from_db()
    assert scene.task.pk==task_id and scene.task.status=="pending" and scene.task.note=="Keep note"
    assert scene.task.due_date==timezone.localdate()+timedelta(days=2)
    assert Reminder.objects.values().get(pk=scene.reminder.pk)==definition
    assert ReminderTask.objects.filter(reminder=scene.reminder,status="pending").count()==1
    assert not TaskXPAward.objects.exists()
    pending=scene.client.get(reverse("reminder-tasks-list"),{"status":"pending"}).data
    assert pending[0]["due_date"]==scene.task.due_date.isoformat()


def test_identical_retry_is_idempotent_but_stale_different_date_is_a_conflict(scene):
    first=postpone(scene)
    assert first.status_code==200
    updated=first.data["updated_at"]
    assert postpone(scene).data["updated_at"]==updated
    conflict=postpone(scene,days=3)
    assert conflict.status_code==409 and conflict.data["code"]=="task_changed"
    scene.task.refresh_from_db()
    assert scene.task.due_date==timezone.localdate()+timedelta(days=2)


@pytest.mark.parametrize("due",["bad","2026-02-31",None,"",False])
def test_invalid_dates_do_not_change_the_task(scene,due):
    response=postpone(scene,due_date=due)
    assert response.status_code==400,response.data
    scene.task.refresh_from_db()
    assert scene.task.due_date==timezone.localdate()


def test_requires_expected_date_and_prevents_moving_future_tasks_earlier(scene):
    assert scene.client.post(scene.url,{"due_date":"2030-01-01"},format="json").status_code==400
    scene.task.due_date=timezone.localdate()+timedelta(days=5);scene.task.save()
    response=postpone(scene,days=2)
    assert response.status_code==400 and response.data["code"]=="invalid_due_date"
    assert postpone(scene,days=-1).status_code==400


def test_overdue_task_can_be_moved_to_today(scene):
    scene.task.due_date=timezone.localdate()-timedelta(days=3);scene.task.save()
    assert postpone(scene,days=0).status_code==200
    scene.task.refresh_from_db()
    assert scene.task.due_date==timezone.localdate()


@pytest.mark.parametrize("person",["other","caregiver"])
def test_only_the_owner_can_change_due_dates_even_if_caregiver_can_complete(scene,person):
    scene.client.force_authenticate(getattr(scene,person))
    assert postpone(scene).status_code==404
    scene.task.refresh_from_db()
    assert scene.task.due_date==timezone.localdate()


def test_model_helper_also_rechecks_owner_permission(scene):
    from django.http import Http404
    with pytest.raises(Http404):
        scene.task.postpone(timezone.localdate()+timedelta(days=1),actor=scene.caregiver,expected_due_date=scene.task.due_date)


def test_completed_and_paused_tasks_cannot_be_postponed(scene):
    stale=ReminderTask.objects.get(pk=scene.task.pk)
    scene.task.mark_complete_and_spawn_next(actor=scene.owner)
    response=postpone(scene)
    assert response.status_code==409 and response.data["code"]=="task_unavailable"
    with pytest.raises(ValidationError):
        stale.postpone(timezone.localdate()+timedelta(days=1),actor=scene.owner,expected_due_date=stale.due_date)
    next_task=ReminderTask.objects.get(reminder=scene.reminder,status="pending")
    scene.reminder.is_active=False;scene.reminder.save()
    scene.url=reverse("reminder-task-postpone",args=[next_task.pk]);scene.task=next_task
    assert postpone(scene,days=10).status_code==409


def test_completion_eligibility_still_uses_the_new_due_date_and_postpone_gives_no_xp(scene):
    assert postpone(scene).status_code==200
    scene.task.refresh_from_db()
    scene.task.mark_complete_and_spawn_next(actor=scene.owner)
    award=TaskXPAward.objects.get(source_task_id=scene.task.pk)
    assert award.xp==0
    scene.reminder.refresh_from_db()
    assert scene.reminder.interval_value==7 and scene.reminder.start_date==timezone.localdate()


def test_authentication_inactive_owner_and_missing_tasks_are_rejected(scene):
    scene.client.force_authenticate(None)
    assert postpone(scene).status_code in (401,403)
    scene.owner.is_active=False;scene.owner.save(update_fields=["is_active"])
    scene.client.force_authenticate(scene.owner)
    assert postpone(scene).status_code==404
    scene.owner.is_active=True;scene.owner.save(update_fields=["is_active"])
    scene.task.delete()
    assert postpone(scene).status_code==404
