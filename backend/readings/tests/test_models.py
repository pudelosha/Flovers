import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import AccountSecret, PumpTask, Reading, ReadingDevice

User = get_user_model()


def _plant(user):
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name="Monstera")


@pytest.mark.django_db
def test_account_secret_string_representation():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    secret = AccountSecret.objects.create(user=user, secret="secret-123")

    assert str(secret) == f"AccountSecret<{user.id}>"


@pytest.mark.django_db
def test_reading_device_generates_device_key_and_caches_plant_display():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)

    device = ReadingDevice.objects.create(
        user=user,
        plant=plant,
        device_name="Sensor",
        sensors={"temperature": True},
    )

    assert device.device_key
    assert len(device.device_key) == 8
    assert device.plant_name == "Monstera"
    assert device.plant_location == "Living room"
    assert str(device) == f"Sensor [{device.id}]"


@pytest.mark.django_db
def test_pump_task_string_representation_and_is_open():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    task = PumpTask.objects.create(device=device, status=PumpTask.STATUS_PENDING)

    assert str(task) == f"PumpTask<{task.id}:{device.id}:manual:pending>"
    assert task.is_open is True

    task.status = PumpTask.STATUS_EXECUTED
    assert task.is_open is False


@pytest.mark.django_db
def test_reading_string_representation():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    reading = Reading.objects.create(
        device=device,
        timestamp=timezone.now(),
        temperature=22.5,
    )

    assert str(reading) == f"Reading<{device.id}@{reading.timestamp.isoformat()}>"
