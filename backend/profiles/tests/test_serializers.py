from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model

from profiles.models import ProfileSettings
from profiles.serializers import (
    ProfileNotificationsSerializer,
    ProfileSettingsSerializer,
    PushDeviceSerializer,
)
from profiles.serializers_support import SupportBugSerializer, SupportContactSerializer

User = get_user_model()


@pytest.mark.django_db
def test_profile_settings_serializer_updates_valid_data():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    profile_settings = user.profile_settings

    serializer = ProfileSettingsSerializer(
        instance=profile_settings,
        data={
            "language": "pl",
            "temperature_unit": "F",
            "measure_unit": "imperial",
            "tile_transparency": "0.45",
            "tile_motive": "dark",
            "background": "bg2",
            "fab_position": "left",
        },
        partial=True,
    )

    assert serializer.is_valid(), serializer.errors
    saved = serializer.save()
    assert saved.language == "pl"
    assert saved.temperature_unit == "F"
    assert saved.measure_unit == "imperial"
    assert saved.tile_transparency == Decimal("0.45")
    assert saved.tile_motive == "dark"
    assert saved.background == "bg2"
    assert saved.fab_position == "left"


@pytest.mark.parametrize(
    "field, value",
    [
        ("language", "xx"),
        ("temperature_unit", "X"),
        ("measure_unit", "unknown"),
        ("tile_motive", "blue"),
        ("background", "bg9"),
        ("fab_position", "center"),
    ],
)
def test_profile_settings_serializer_rejects_invalid_choices(field, value):
    serializer = ProfileSettingsSerializer(data={field: value}, partial=True)

    assert serializer.is_valid() is False
    assert field in serializer.errors


@pytest.mark.parametrize("value", ["-0.01", "0.61", "not-a-number"])
def test_profile_settings_serializer_rejects_invalid_tile_transparency(value):
    serializer = ProfileSettingsSerializer(data={"tile_transparency": value}, partial=True)

    assert serializer.is_valid() is False
    assert "tile_transparency" in serializer.errors


def test_profile_settings_serializer_quantizes_tile_transparency():
    serializer = ProfileSettingsSerializer(data={"tile_transparency": "0.456"}, partial=True)

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["tile_transparency"] == Decimal("0.46")


def test_profile_notifications_serializer_accepts_valid_data():
    serializer = ProfileNotificationsSerializer(
        data={
            "timezone": " Europe/Warsaw ",
            "email_daily": False,
            "email_hour": 8,
            "email_minute": 30,
            "email_24h": True,
            "push_daily": True,
            "push_hour": 19,
            "push_minute": 45,
            "push_24h": False,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["timezone"] == "Europe/Warsaw"


@pytest.mark.parametrize(
    "field, value",
    [
        ("timezone", ""),
        ("email_hour", -1),
        ("email_hour", 24),
        ("email_minute", -1),
        ("email_minute", 60),
        ("push_hour", -1),
        ("push_hour", 24),
        ("push_minute", -1),
        ("push_minute", 60),
    ],
)
def test_profile_notifications_serializer_rejects_invalid_data(field, value):
    serializer = ProfileNotificationsSerializer(data={field: value}, partial=True)

    assert serializer.is_valid() is False
    assert field in serializer.errors


def test_push_device_serializer_accepts_and_normalizes_data():
    serializer = PushDeviceSerializer(data={"token": " token-123 ", "platform": "ANDROID"})

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["token"] == "token-123"
    assert serializer.validated_data["platform"] == "android"


@pytest.mark.parametrize(
    "payload, field",
    [
        ({"token": "", "platform": "android"}, "token"),
        ({"token": "token-123", "platform": "web"}, "platform"),
    ],
)
def test_push_device_serializer_rejects_invalid_data(payload, field):
    serializer = PushDeviceSerializer(data=payload)

    assert serializer.is_valid() is False
    assert field in serializer.errors


def test_support_contact_serializer_trims_valid_data():
    serializer = SupportContactSerializer(
        data={
            "subject": " Help ",
            "message": " Please help. ",
            "copy_to_user": False,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["subject"] == "Help"
    assert serializer.validated_data["message"] == "Please help."
    assert serializer.validated_data["copy_to_user"] is False


def test_support_contact_serializer_rejects_blank_message():
    serializer = SupportContactSerializer(
        data={
            "subject": "Help",
            "message": "   ",
        }
    )

    assert serializer.is_valid() is False
    assert "message" in serializer.errors


def test_support_bug_serializer_trims_valid_data():
    serializer = SupportBugSerializer(
        data={
            "subject": " Bug ",
            "description": " Something broke. ",
            "copy_to_user": True,
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["subject"] == "Bug"
    assert serializer.validated_data["description"] == "Something broke."
    assert serializer.validated_data["copy_to_user"] is True


def test_support_bug_serializer_rejects_blank_description():
    serializer = SupportBugSerializer(
        data={
            "subject": "Bug",
            "description": "   ",
        }
    )

    assert serializer.is_valid() is False
    assert "description" in serializer.errors
