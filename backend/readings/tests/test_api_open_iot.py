from unittest.mock import patch
from datetime import timezone as dt_timezone

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import AccountSecret, PumpTask, Reading, ReadingDevice

User = get_user_model()


def _device_with_secret(user=None, **device_kwargs):
    user = user or User.objects.create_user(email="test@example.com", password="strong-password-123")
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Monstera")
    defaults = {
        "device_name": "Sensor",
        "sensors": {"temperature": True, "humidity": True, "light": True, "moisture": True},
    }
    defaults.update(device_kwargs)
    device = ReadingDevice.objects.create(user=user, plant=plant, **defaults)
    secret = AccountSecret.objects.create(user=user, secret="secret-123")
    return user, device, secret


def test_ingest_is_open_but_requires_device_key_and_secret():
    response = APIClient().post(reverse("ingest"), data={}, format="json")

    assert response.status_code == 400
    assert response.json()["detail"] == "device_key and secret are required"


@pytest.mark.django_db
@patch("readings.views.send_moisture_alert_notifications")
def test_ingest_creates_or_updates_hourly_reading_and_updates_device_snapshot(mock_alert):
    user, device, secret = _device_with_secret()
    client = APIClient()

    payload = {
        "secret": secret.secret,
        "device_key": device.device_key,
        "timestamp": "2026-05-05T10:15:00Z",
        "metrics": {
            "temperature": 22.5,
            "humidity": 41,
            "light": 600,
            "moisture": 35,
        },
    }
    first = client.post(reverse("ingest"), data=payload, format="json")
    payload["metrics"]["temperature"] = 23.0
    second = client.post(reverse("ingest"), data=payload, format="json")

    device.refresh_from_db()
    reading = Reading.objects.get(device=device)

    assert first.status_code == 202
    assert first.json()["status"] == "ok"
    assert second.status_code == 202
    assert Reading.objects.filter(device=device).count() == 1
    assert reading.timestamp.minute == 0
    assert reading.temperature == 23.0
    assert device.latest_snapshot["temperature"] == 23.0
    assert device.last_read_at is not None
    mock_alert.assert_not_called()


@pytest.mark.django_db
def test_feed_is_open_and_returns_latest_reading():
    user, device, secret = _device_with_secret()
    older = timezone.datetime(2026, 5, 5, 9, 0, tzinfo=dt_timezone.utc)
    newer = timezone.datetime(2026, 5, 5, 10, 0, tzinfo=dt_timezone.utc)
    Reading.objects.create(device=device, timestamp=older, temperature=21)
    Reading.objects.create(device=device, timestamp=newer, temperature=22)

    response = APIClient().get(
        reverse("feed"),
        data={"secret": secret.secret, "device_key": device.device_key},
    )

    data = response.json()
    assert response.status_code == 200
    assert data["device"]["id"] == device.id
    assert len(data["readings"]) == 1
    assert data["readings"][0]["temperature"] == 22.0


@pytest.mark.django_db
def test_feed_rejects_invalid_secret():
    user, device, secret = _device_with_secret()

    response = APIClient().get(
        reverse("feed"),
        data={"secret": "wrong", "device_key": device.device_key},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "invalid credentials"


@pytest.mark.django_db
def test_pump_next_task_delivers_pending_manual_task():
    user, device, secret = _device_with_secret(pump_included=True)
    task = PumpTask.objects.create(device=device, status=PumpTask.STATUS_PENDING)

    response = APIClient().post(
        reverse("pump-next-task"),
        data={"secret": secret.secret, "device_key": device.device_key},
        format="json",
    )

    data = response.json()
    task.refresh_from_db()
    assert response.status_code == 200
    assert data["run"] is True
    assert data["task_id"] == task.id
    assert data["source"] == "manual"
    assert data["reason"] == "manual_scheduled"
    assert task.status == PumpTask.STATUS_DELIVERED


@pytest.mark.django_db
@patch("readings.views.send_watering_completed_notifications")
def test_pump_complete_records_manual_execution(mock_notify, django_capture_on_commit_callbacks):
    user, device, secret = _device_with_secret(pump_included=True)
    task = PumpTask.objects.create(device=device, status=PumpTask.STATUS_DELIVERED)

    with django_capture_on_commit_callbacks(execute=True):
        response = APIClient().post(
            reverse("pump-complete"),
            data={
                "secret": secret.secret,
                "device_key": device.device_key,
                "task_id": task.id,
                "source": "manual",
                "success": True,
            },
            format="json",
        )

    data = response.json()
    task.refresh_from_db()
    device.refresh_from_db()
    assert response.status_code == 200
    assert data["detail"] == "Pump execution recorded."
    assert task.status == PumpTask.STATUS_EXECUTED
    assert device.last_pump_run_source == "manual"
    mock_notify.assert_called_once_with(device_id=device.id, source="manual")


@pytest.mark.django_db
def test_pump_complete_rejects_device_without_pump():
    user, device, secret = _device_with_secret(pump_included=False)

    response = APIClient().post(
        reverse("pump-complete"),
        data={"secret": secret.secret, "device_key": device.device_key},
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Pump is not included for this device."
