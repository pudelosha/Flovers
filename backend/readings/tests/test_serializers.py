import pytest
from django.contrib.auth import get_user_model

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import PumpTask, ReadingDevice
from readings.serializers import (
    ReadingDeviceSerializer,
    ReadingsExportEmailSerializer,
)

User = get_user_model()


def _plant(user):
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name="Monstera")


@pytest.mark.django_db
def test_reading_device_serializer_accepts_current_modal_alias_payload():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)

    serializer = ReadingDeviceSerializer(
        data={
            "mode": "create",
            "plantId": plant.id,
            "name": "Soil sensor",
            "enabled": True,
            "intervalHours": 4,
            "sensors": {
                "temperature": True,
                "humidity": True,
                "light": False,
                "moisture": True,
                "moistureAlertEnabled": True,
                "moistureAlertPct": 35,
            },
            "sendEmailNotifications": True,
            "sendPushNotifications": False,
            "pumpIncluded": True,
            "automaticPumpLaunch": True,
            "pumpThresholdPct": 25,
            "sendEmailWateringNotifications": True,
            "sendPushWateringNotifications": False,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["plant"] == plant
    assert serializer.validated_data["device_name"] == "Soil sensor"
    assert serializer.validated_data["interval_hours"] == 4
    assert serializer.validated_data["moisture_alert_enabled"] is True
    assert serializer.validated_data["moisture_alert_threshold"] == 35
    assert serializer.validated_data["sensors"] == {
        "temperature": True,
        "humidity": True,
        "light": False,
        "moisture": True,
    }
    assert serializer.validated_data["pump_included"] is True
    assert serializer.validated_data["automatic_pump_launch"] is True
    assert serializer.validated_data["pump_threshold_pct"] == 25


@pytest.mark.django_db
def test_reading_device_serializer_disables_moisture_dependent_features_when_sensor_off():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)

    serializer = ReadingDeviceSerializer(
        data={
            "plant": plant.id,
            "device_name": "Sensor",
            "interval_hours": 2,
            "sensors": {"moisture": False},
            "moisture_alert_enabled": True,
            "moisture_alert_threshold": 35,
            "send_email_notifications": True,
            "send_push_notifications": True,
            "pump_included": True,
            "automatic_pump_launch": True,
            "pump_threshold_pct": 25,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["moisture_alert_enabled"] is False
    assert serializer.validated_data["moisture_alert_threshold"] is None
    assert serializer.validated_data["send_email_notifications"] is False
    assert serializer.validated_data["send_push_notifications"] is False
    assert serializer.validated_data["automatic_pump_launch"] is False
    assert serializer.validated_data["pump_threshold_pct"] is None


@pytest.mark.django_db
def test_reading_device_serializer_rejects_invalid_interval_hours():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    serializer = ReadingDeviceSerializer(
        data={
            "plant": plant.id,
            "device_name": "Sensor",
            "interval_hours": 25,
        }
    )

    assert serializer.is_valid() is False
    assert "interval_hours" in serializer.errors


@pytest.mark.django_db
def test_reading_device_serializer_rejects_moisture_alert_without_threshold():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    serializer = ReadingDeviceSerializer(
        data={
            "plant": plant.id,
            "device_name": "Sensor",
            "moisture_alert_enabled": True,
        }
    )

    assert serializer.is_valid() is False
    assert "moisture_alert_threshold" in serializer.errors


@pytest.mark.django_db
def test_reading_device_serializer_rejects_automatic_pump_without_threshold():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    serializer = ReadingDeviceSerializer(
        data={
            "plant": plant.id,
            "device_name": "Sensor",
            "pump_included": True,
            "automatic_pump_launch": True,
        }
    )

    assert serializer.is_valid() is False
    assert "pump_threshold_pct" in serializer.errors


@pytest.mark.django_db
def test_reading_device_serializer_returns_pending_pump_task_without_expires_at():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=True,
    )
    task = PumpTask.objects.create(device=device, status=PumpTask.STATUS_PENDING)

    data = ReadingDeviceSerializer(device).data

    assert data["pending_pump_task"]["id"] == task.id
    assert "expires_at" not in data["pending_pump_task"]


def test_readings_export_email_serializer_accepts_current_payload():
    serializer = ReadingsExportEmailSerializer(
        data={
            "plantId": 1,
            "location": "Living room",
            "status": "enabled",
            "sortKey": "lastRead",
            "sortDir": "desc",
            "lang": "pl",
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["status"] == "enabled"


def test_readings_export_email_serializer_rejects_invalid_status():
    serializer = ReadingsExportEmailSerializer(data={"status": "active"})

    assert serializer.is_valid() is False
    assert "status" in serializer.errors
