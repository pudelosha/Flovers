from datetime import date

import pytest
from django.contrib.auth import get_user_model

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.serializers import ReminderSerializer, ReminderTaskExportEmailSerializer

User = get_user_model()


def _plant():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name="Monstera")


@pytest.mark.django_db
def test_reminder_serializer_accepts_valid_data():
    plant = _plant()
    serializer = ReminderSerializer(
        data={
            "plant": plant.id,
            "type": "water",
            "start_date": "2026-05-05",
            "interval_value": 7,
            "interval_unit": "days",
            "is_active": True,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["type"] == "water"
    assert serializer.validated_data["start_date"] == date(2026, 5, 5)


@pytest.mark.parametrize(
    "field, value",
    [
        ("type", "watering"),
        ("interval_unit", "weeks"),
        ("interval_value", -1),
    ],
)
@pytest.mark.django_db
def test_reminder_serializer_rejects_invalid_data(field, value):
    plant = _plant()
    payload = {
        "plant": plant.id,
        "type": "water",
        "start_date": "2026-05-05",
        "interval_value": 7,
        "interval_unit": "days",
    }
    payload[field] = value
    serializer = ReminderSerializer(data=payload)

    assert serializer.is_valid() is False
    assert field in serializer.errors


def test_export_email_serializer_accepts_current_payload():
    serializer = ReminderTaskExportEmailSerializer(
        data={
            "plantId": 1,
            "location": "Living room",
            "types": ["watering", "fertilising"],
            "completedFrom": "2026-05-01",
            "completedTo": "2026-05-05",
            "sortKey": "plant",
            "sortDir": "asc",
            "includePending": True,
            "lang": "pl",
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["types"] == ["watering", "fertilising"]


def test_export_email_serializer_rejects_completed_to_before_completed_from():
    serializer = ReminderTaskExportEmailSerializer(
        data={
            "completedFrom": "2026-05-05",
            "completedTo": "2026-05-01",
        }
    )

    assert serializer.is_valid() is False
    assert "completedTo" in serializer.errors


def test_export_email_serializer_rejects_invalid_type_choice():
    serializer = ReminderTaskExportEmailSerializer(data={"types": ["water"]})

    assert serializer.is_valid() is False
    assert "types" in serializer.errors
