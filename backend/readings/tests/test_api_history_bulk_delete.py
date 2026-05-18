import pytest
from datetime import timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import Reading, ReadingDevice

User = get_user_model()


def _device(user):
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Monstera")
    return ReadingDevice.objects.create(user=user, plant=plant, device_name="Sensor")


def _reading(device, when, **metrics):
    return Reading.objects.create(
        device=device,
        timestamp=when,
        **metrics,
    )


@pytest.mark.django_db
def test_history_delete_options_are_scoped_to_current_users_device():
    user = User.objects.create_user(email="owner@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    device = _device(user)
    other_device = _device(other_user)
    _reading(
        device,
        timezone.datetime(2026, 5, 18, 10, 0, tzinfo=dt_timezone.utc),
        temperature=22,
        moisture=40,
    )
    _reading(
        other_device,
        timezone.datetime(2026, 4, 1, 10, 0, tzinfo=dt_timezone.utc),
        humidity=50,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("history-delete-options"), data={"device_id": device.id})

    assert response.status_code == 200
    data = response.json()
    assert data["days"] == [{"key": "2026-05-18", "label": "2026-05-18"}]
    assert data["weeks"][0]["key"] == "2026-05-18"
    assert data["months"][0]["key"] == "2026-05"
    assert data["types"] == ["temperature", "moisture"]


@pytest.mark.django_db
def test_history_bulk_delete_removes_selected_day_and_refreshes_latest_snapshot():
    user = User.objects.create_user(email="owner@example.com", password="strong-password-123")
    device = _device(user)
    older = _reading(
        device,
        timezone.datetime(2026, 5, 17, 10, 0, tzinfo=dt_timezone.utc),
        temperature=19,
    )
    newer = _reading(
        device,
        timezone.datetime(2026, 5, 18, 10, 0, tzinfo=dt_timezone.utc),
        temperature=23,
    )
    device.last_read_at = newer.timestamp
    device.latest_snapshot = {"temperature": newer.temperature}
    device.save(update_fields=["last_read_at", "latest_snapshot", "updated_at"])
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("history-bulk-delete"),
        data={"device_id": device.id, "mode": "day", "day": "2026-05-18"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["deleted"] == 1
    assert Reading.objects.filter(id=newer.id).exists() is False
    assert Reading.objects.filter(id=older.id).exists() is True

    device.refresh_from_db()
    assert device.last_read_at == older.timestamp
    assert device.latest_snapshot["temperature"] == 19.0


@pytest.mark.django_db
def test_history_bulk_delete_type_clears_metric_without_deleting_other_metrics():
    user = User.objects.create_user(email="owner@example.com", password="strong-password-123")
    device = _device(user)
    reading = _reading(
        device,
        timezone.datetime(2026, 5, 18, 10, 0, tzinfo=dt_timezone.utc),
        temperature=22,
        humidity=55,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("history-bulk-delete"),
        data={"device_id": device.id, "mode": "types", "types": ["temperature"]},
        format="json",
    )

    assert response.status_code == 200
    assert response.json() == {"deleted": 0, "updated": 1}
    reading.refresh_from_db()
    assert reading.temperature is None
    assert reading.humidity == 55.0


@pytest.mark.django_db
def test_history_bulk_delete_rejects_other_users_device():
    user = User.objects.create_user(email="owner@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    other_device = _device(other_user)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("history-bulk-delete"),
        data={"device_id": other_device.id, "mode": "olderThan", "days": 30},
        format="json",
    )

    assert response.status_code == 404
