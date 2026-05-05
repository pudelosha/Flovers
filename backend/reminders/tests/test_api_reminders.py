import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _plant(user, name="Monstera"):
    location = Location.objects.create(user=user, name=f"{name} location", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name=name)


def test_reminder_list_requires_authentication():
    response = APIClient().get(reverse("reminders-list-create"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_create_reminder_creates_pending_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminders-list-create"),
        data={
            "plant": plant.id,
            "type": "water",
            "start_date": str(timezone.localdate()),
            "interval_value": 7,
            "interval_unit": "days",
            "is_active": True,
        },
        format="json",
    )

    data = response.json()
    reminder = Reminder.objects.get(user=user)

    assert response.status_code == 201
    assert data["id"] == reminder.id
    assert data["plant"] == plant.id
    assert reminder.tasks.filter(status="pending").count() == 1


@pytest.mark.django_db
def test_list_reminders_returns_only_current_users_reminders():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    plant = _plant(user)
    other_plant = _plant(other_user, name="Other")
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    Reminder.objects.create(
        user=other_user,
        plant=other_plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reminders-list-create"))

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == reminder.id


@pytest.mark.django_db
def test_retrieve_reminder_returns_404_for_other_users_reminder():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    other_plant = _plant(other_user, name="Other")
    other_reminder = Reminder.objects.create(
        user=other_user,
        plant=other_plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reminder-detail", args=[other_reminder.id]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_patch_reminder_regenerates_pending_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    old_task = reminder.ensure_one_pending_task()
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reminder-detail", args=[reminder.id]),
        data={"interval_value": 14},
        format="json",
    )

    data = response.json()
    reminder.refresh_from_db()
    old_task.refresh_from_db()

    assert response.status_code == 200
    assert data["interval_value"] == 14
    assert reminder.interval_value == 14
    assert old_task.status == "completed"
    assert reminder.tasks.filter(status="pending").count() == 1


@pytest.mark.django_db
def test_delete_reminder_success():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(reverse("reminder-detail", args=[reminder.id]))

    assert response.status_code == 204
    assert Reminder.objects.filter(id=reminder.id).exists() is False
    assert ReminderTask.objects.filter(reminder_id=reminder.id).exists() is False
