import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


@pytest.mark.django_db
def test_plant_journal_returns_completed_tasks_for_plant():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Monstera")
    other_plant = PlantInstance.objects.create(user=user, location=location, display_name="Ficus")
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    other_reminder = Reminder.objects.create(
        user=user,
        plant=other_plant,
        type="care",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    completed = ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="completed",
        completed_at=timezone.now(),
        note="Watered",
    )
    ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="pending",
    )
    ReminderTask.objects.create(
        reminder=other_reminder,
        user=user,
        due_date=timezone.localdate(),
        status="completed",
        completed_at=timezone.now(),
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("plant-instance-journal", args=[plant.id]))

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == completed.id
    assert data[0]["type"] == "water"
    assert data[0]["note"] == "Watered"


@pytest.mark.django_db
def test_plant_journal_does_not_return_other_users_tasks():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    other_location = Location.objects.create(user=other_user, name="Office", category="indoor")
    other_plant = PlantInstance.objects.create(
        user=other_user,
        location=other_location,
        display_name="Other",
    )
    other_reminder = Reminder.objects.create(
        user=other_user,
        plant=other_plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    ReminderTask.objects.create(
        reminder=other_reminder,
        user=other_user,
        due_date=timezone.localdate(),
        status="completed",
        completed_at=timezone.now(),
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("plant-instance-journal", args=[other_plant.id]))

    assert response.status_code == 200
    assert response.json() == []
