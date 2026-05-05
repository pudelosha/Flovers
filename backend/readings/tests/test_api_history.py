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


def test_history_requires_authentication():
    response = APIClient().get(reverse("history"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_history_requires_device_id():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("history"))

    assert response.status_code == 400
    assert response.json()["detail"] == "device_id is required"


@pytest.mark.django_db
def test_history_returns_day_points_for_current_users_device():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = _device(user)
    Reading.objects.create(
        device=device,
        timestamp=timezone.datetime(2026, 5, 5, 10, 0, tzinfo=dt_timezone.utc),
        temperature=22,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        reverse("history"),
        data={
            "device_id": device.id,
            "range": "day",
            "metric": "temperature",
            "anchor": "2026-05-05T12:00:00Z",
        },
    )

    data = response.json()
    assert response.status_code == 200
    assert data["device"]["id"] == device.id
    assert data["range"] == "day"
    assert data["metric"] == "temperature"
    assert data["unit"]
    assert len(data["points"]) == 24
    assert any(point["value"] == 22.0 for point in data["points"])


@pytest.mark.django_db
def test_history_rejects_invalid_metric():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = _device(user)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("history"), data={"device_id": device.id, "metric": "ph"})

    assert response.status_code == 400
    assert "metric must be one of" in response.json()["detail"]
