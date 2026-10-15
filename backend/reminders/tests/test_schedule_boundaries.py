from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def plant_for(user):
    location = Location.objects.create(user=user, name="Room")
    return PlantInstance.objects.create(user=user, location=location)


def reminder_for(user, plant, **kwargs):
    return Reminder.objects.create(user=user, plant=plant, type="water", start_date=timezone.localdate(),
                                   interval_value=7, **kwargs)


@pytest.mark.django_db
@pytest.mark.parametrize("method", ["post", "patch"])
def test_reminder_rejects_other_users_plant(method):
    user = User.objects.create_user(email="owner@example.com", password="password-123")
    other = User.objects.create_user(email="other@example.com", password="password-123")
    own_plant, foreign_plant = plant_for(user), plant_for(other)
    client = APIClient()
    client.force_authenticate(user)
    if method == "post":
        response = client.post(reverse("reminders-list-create"), {
            "plant": foreign_plant.pk, "type": "water", "start_date": str(timezone.localdate()),
            "interval_value": 7, "interval_unit": "days",
        }, format="json")
        assert Reminder.objects.filter(plant=foreign_plant).count() == 0
    else:
        reminder = reminder_for(user, own_plant)
        response = client.patch(reverse("reminder-detail", args=[reminder.pk]), {"plant": foreign_plant.pk}, format="json")
        reminder.refresh_from_db()
        assert reminder.plant_id == own_plant.pk
    assert response.status_code == 400
    assert "plant" in response.json()


@pytest.mark.django_db
def test_task_list_does_not_leak_legacy_cross_owner_tasks():
    owner = User.objects.create_user(email="owner@example.com", password="password-123")
    other = User.objects.create_user(email="other@example.com", password="password-123")
    reminder = reminder_for(other, plant_for(owner))
    ReminderTask.objects.create(reminder=reminder, user=other, due_date=timezone.localdate())
    client = APIClient()
    client.force_authenticate(owner)
    assert client.get(reverse("reminder-tasks-list")).json() == []


@pytest.mark.django_db
@pytest.mark.parametrize("interval", [0, -1])
def test_api_rejects_non_positive_interval_before_creating_tasks(interval):
    user = User.objects.create_user(email="owner@example.com", password="password-123")
    plant = plant_for(user)
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(reverse("reminders-list-create"), {
        "plant": plant.pk, "type": "water", "start_date": str(timezone.localdate()), "interval_value": interval,
    }, format="json")
    assert response.status_code == 400
    assert not Reminder.objects.exists()


@pytest.mark.django_db
def test_model_and_database_reject_zero_interval_and_completion_uses_saved_schedule():
    user = User.objects.create_user(email="owner@example.com", password="password-123")
    reminder = reminder_for(user, plant_for(user))
    task = reminder.ensure_one_pending_task()
    reminder.interval_value = 0
    with pytest.raises(ValidationError):
        reminder.save()
    task.reminder = reminder
    next_task = task.mark_complete_and_spawn_next()
    task.refresh_from_db()
    assert task.status == "completed"
    assert next_task.due_date == timezone.localdate() + timedelta(days=7)
    with pytest.raises(IntegrityError), transaction.atomic():
        Reminder.objects.filter(pk=reminder.pk).update(interval_value=0)


@pytest.mark.django_db
def test_first_due_today_and_unchanged_patch_preserve_pending_and_history():
    user = User.objects.create_user(email="owner@example.com", password="password-123")
    reminder = reminder_for(user, plant_for(user))
    task = reminder.ensure_one_pending_task()
    assert task.due_date == timezone.localdate()
    task.due_date -= timedelta(days=1)
    task.save(update_fields=["due_date"])
    client = APIClient()
    client.force_authenticate(user)
    response = client.patch(reverse("reminder-detail", args=[reminder.pk]), {"interval_value": 7}, format="json")
    assert response.status_code == 200
    task.refresh_from_db()
    assert task.due_date == timezone.localdate() - timedelta(days=1)
    assert task.status == "pending" and task.completed_at is None
    assert reminder.tasks.filter(status="completed").count() == 0


@pytest.mark.django_db
def test_schedule_edit_moves_pending_in_place_and_preserves_completed_history():
    user = User.objects.create_user(email="owner@example.com", password="password-123")
    reminder = reminder_for(user, plant_for(user))
    pending = reminder.ensure_one_pending_task()
    completed = ReminderTask.objects.create(reminder=reminder, user=user, status="completed",
                                           due_date=timezone.localdate() - timedelta(days=7), completed_at=timezone.now(), note="Actual care")
    client = APIClient()
    client.force_authenticate(user)
    first_due = timezone.localdate() + timedelta(days=3)
    response = client.patch(reverse("reminder-detail", args=[reminder.pk]), {"start_date": str(first_due)}, format="json")
    assert response.status_code == 200
    pending.refresh_from_db()
    completed.refresh_from_db()
    assert pending.due_date == first_due and pending.status == "pending"
    assert pending.completed_at is None
    assert completed.status == "completed" and completed.note == "Actual care"
    assert reminder.tasks.count() == 2
