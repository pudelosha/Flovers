import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _reminder(user, name="Monstera"):
    location = Location.objects.create(
        user=user,
        name=f"{name} location",
        category="indoor",
    )
    plant = PlantInstance.objects.create(
        user=user,
        location=location,
        display_name=name,
    )
    return Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
        interval_unit="days",
        is_active=True,
    )


@pytest.mark.django_db
def test_pause_reminder_disables_it_and_removes_pending_task():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    reminder = _reminder(user)
    pending_task = reminder.ensure_one_pending_task()
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reminder-detail", args=[reminder.id]),
        data={"is_active": False},
        format="json",
    )

    reminder.refresh_from_db()

    assert response.status_code == 200
    assert response.json()["is_active"] is False
    assert reminder.is_active is False
    assert ReminderTask.objects.filter(id=pending_task.id).exists() is False
    assert reminder.tasks.filter(status="pending").exists() is False


@pytest.mark.django_db
def test_resume_reminder_enables_it_and_creates_pending_task():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    reminder = _reminder(user)
    reminder.is_active = False
    reminder.save(update_fields=["is_active", "updated_at"])
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reminder-detail", args=[reminder.id]),
        data={"is_active": True},
        format="json",
    )

    reminder.refresh_from_db()

    assert response.status_code == 200
    assert response.json()["is_active"] is True
    assert reminder.is_active is True
    assert reminder.tasks.filter(status="pending").count() == 1


@pytest.mark.django_db
def test_pending_task_list_excludes_tasks_for_paused_reminders():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    active_reminder = _reminder(user, name="Active")
    paused_reminder = _reminder(user, name="Paused")
    active_task = active_reminder.ensure_one_pending_task()
    paused_task = paused_reminder.ensure_one_pending_task()
    paused_reminder.is_active = False
    paused_reminder.save(update_fields=["is_active", "updated_at"])
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        reverse("reminder-tasks-list"),
        data={"status": "pending"},
    )

    ids = {item["id"] for item in response.json()}

    assert response.status_code == 200
    assert active_task.id in ids
    assert paused_task.id not in ids
