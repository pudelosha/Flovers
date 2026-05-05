import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import PumpTask, ReadingDevice

User = get_user_model()


def _plant(user, name="Monstera"):
    location = Location.objects.create(user=user, name=f"{name} location", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name=name)


def test_reading_device_list_requires_authentication():
    response = APIClient().get(reverse("reading-device-list"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_create_reading_device_with_canonical_payload():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reading-device-list"),
        data={
            "plant": plant.id,
            "device_name": "Soil sensor",
            "is_active": True,
            "interval_hours": 3,
            "sensors": {"temperature": True, "moisture": True},
            "pump_included": True,
            "pump_threshold_pct": 25,
        },
        format="json",
    )

    data = response.json()
    device = ReadingDevice.objects.get(user=user)

    assert response.status_code == 201
    assert data["id"] == device.id
    assert data["device_name"] == "Soil sensor"
    assert data["plant"] == plant.id
    assert data["plant_name"] == "Monstera"
    assert data["plant_location"] == "Monstera location"
    assert data["interval_hours"] == 3
    assert data["device_key"] == device.device_key


@pytest.mark.django_db
def test_list_reading_devices_returns_only_current_users_devices():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    ReadingDevice.objects.create(user=other_user, plant=_plant(other_user, "Other"), device_name="Other")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reading-device-list"))

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == device.id


@pytest.mark.django_db
def test_retrieve_reading_device_returns_404_for_other_users_device():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    other_device = ReadingDevice.objects.create(
        user=other_user,
        plant=_plant(other_user, "Other"),
        device_name="Other",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reading-device-detail", args=[other_device.id]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_patch_reading_device_updates_alias_fields():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reading-device-detail", args=[device.id]),
        data={"name": "Updated sensor", "enabled": False, "intervalHours": 6},
        format="json",
    )

    data = response.json()
    device.refresh_from_db()

    assert response.status_code == 200
    assert data["device_name"] == "Updated sensor"
    assert data["is_active"] is False
    assert data["interval_hours"] == 6
    assert device.device_name == "Updated sensor"


@pytest.mark.django_db
def test_auto_pump_action_rejects_device_without_pump():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=False,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reading-device-auto-pump", args=[device.id]),
        data={"automatic_pump_launch": True},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert data["detail"] == "Pump must be included to enable automatic pump launch."


@pytest.mark.django_db
def test_pump_schedule_creates_manual_pending_task_and_is_idempotent():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    first = client.post(reverse("reading-device-pump-schedule", args=[device.id]), format="json")
    second = client.post(reverse("reading-device-pump-schedule", args=[device.id]), format="json")

    first_data = first.json()
    second_data = second.json()
    assert first.status_code == 201
    assert first_data["detail"] == "Watering scheduled."
    assert second.status_code == 200
    assert second_data["detail"] == "Watering is already scheduled."
    assert PumpTask.objects.filter(device=device, status=PumpTask.STATUS_PENDING).count() == 1


@pytest.mark.django_db
def test_pump_recall_cancels_pending_manual_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=True,
    )
    task = PumpTask.objects.create(device=device, status=PumpTask.STATUS_PENDING)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("reading-device-pump-recall", args=[device.id]), format="json")

    data = response.json()
    task.refresh_from_db()
    assert response.status_code == 200
    assert data["detail"] == "Scheduled watering recalled."
    assert data["pending_pump_task"] is None
    assert task.status == PumpTask.STATUS_CANCELLED
