from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _completed_task(user, plant_name="Monstera", location_name="Living room", type="water", days_ago=1):
    location, _ = Location.objects.get_or_create(
        user=user,
        name=location_name,
        defaults={"category": "indoor"},
    )
    plant = PlantInstance.objects.create(user=user, location=location, display_name=plant_name)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type=type,
        start_date=timezone.localdate(),
        interval_value=7,
    )
    return ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="completed",
        completed_at=timezone.now() - timedelta(days=days_ago),
    )


@pytest.mark.django_db
def test_bulk_delete_by_plant_deletes_completed_tasks_for_that_plant():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    task = _completed_task(user, plant_name="Monstera")
    _completed_task(user, plant_name="Ficus")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-bulk-delete"),
        data={"mode": "plant", "plantId": task.reminder.plant_id},
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["deleted"] == 1
    assert ReminderTask.objects.filter(id=task.id).exists() is False


@pytest.mark.django_db
def test_bulk_delete_by_location_deletes_completed_tasks_for_location_name():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    task = _completed_task(user, location_name="Living room")
    _completed_task(user, location_name="Bedroom")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-bulk-delete"),
        data={"mode": "location", "location": "Living room"},
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["deleted"] == 1
    assert ReminderTask.objects.filter(id=task.id).exists() is False


@pytest.mark.django_db
def test_bulk_delete_by_types_maps_ui_types_to_model_types():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    water_task = _completed_task(user, type="water")
    _completed_task(user, type="care")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-bulk-delete"),
        data={"mode": "types", "types": ["watering"]},
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["deleted"] == 1
    assert ReminderTask.objects.filter(id=water_task.id).exists() is False


@pytest.mark.django_db
def test_bulk_delete_older_than_deletes_old_completed_tasks():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    old_task = _completed_task(user, days_ago=30)
    _completed_task(user, days_ago=1)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-bulk-delete"),
        data={"mode": "olderThan", "days": 7},
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["deleted"] == 1
    assert ReminderTask.objects.filter(id=old_task.id).exists() is False


@pytest.mark.django_db
def test_bulk_delete_rejects_invalid_mode():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-bulk-delete"),
        data={"mode": "everything"},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert "Invalid mode" in data["detail"]
