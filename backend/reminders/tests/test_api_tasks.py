import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _reminder(user, type="water"):
    location = Location.objects.create(user=user, name=f"{type} location", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Monstera")
    return Reminder.objects.create(
        user=user,
        plant=plant,
        type=type,
        start_date=timezone.localdate(),
        interval_value=7,
        interval_unit="days",
    )


@pytest.mark.django_db
def test_task_list_returns_only_current_users_tasks_and_filters_by_status():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    reminder = _reminder(user)
    other_reminder = _reminder(other_user)
    pending = ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="pending",
    )
    ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="completed",
        completed_at=timezone.now(),
    )
    ReminderTask.objects.create(
        reminder=other_reminder,
        user=other_user,
        due_date=timezone.localdate(),
        status="pending",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reminder-tasks-list"), data={"status": "pending"})

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == pending.id
    assert data[0]["status"] == "pending"


@pytest.mark.django_db
def test_complete_task_marks_completed_and_returns_next_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    reminder = _reminder(user)
    task = ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="pending",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-complete", args=[task.id]),
        data={"note": "Watered well."},
        format="json",
    )

    data = response.json()
    task.refresh_from_db()

    assert response.status_code == 200
    assert data["completed_task"]["id"] == task.id
    assert data["completed_task"]["status"] == "completed"
    assert data["completed_task"]["note"] == "Watered well."
    assert data["next_task"]["status"] == "pending"
    assert task.status == "completed"


@pytest.mark.django_db
def test_complete_task_returns_404_for_other_users_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    other_reminder = _reminder(other_user)
    other_task = ReminderTask.objects.create(
        reminder=other_reminder,
        user=other_user,
        due_date=timezone.localdate(),
        status="pending",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("reminder-task-complete", args=[other_task.id]), format="json")

    assert response.status_code == 404


@pytest.mark.django_db
def test_delete_completed_task_success():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    reminder = _reminder(user)
    task = ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="completed",
        completed_at=timezone.now(),
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(reverse("reminder-task-detail-delete", args=[task.id]))

    assert response.status_code == 204
    assert ReminderTask.objects.filter(id=task.id).exists() is False


@pytest.mark.django_db
def test_delete_pending_task_returns_400():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    reminder = _reminder(user)
    task = ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="pending",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(reverse("reminder-task-detail-delete", args=[task.id]))

    data = response.json()
    assert response.status_code == 400
    assert data["detail"] == "Only completed tasks can be deleted."
