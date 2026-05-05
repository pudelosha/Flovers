from datetime import date

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from profiles.models import (
    NotificationDeliveryLog,
    ProfileNotifications,
    ProfileSettings,
    PushDevice,
    SupportMessage,
)

User = get_user_model()


@pytest.mark.django_db
def test_user_creation_creates_profile_settings_and_notifications():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    assert ProfileSettings.objects.filter(user=user).exists()
    assert ProfileNotifications.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_profile_settings_defaults_and_string_representation():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    settings = user.profile_settings

    assert settings.language == "en"
    assert settings.temperature_unit == "C"
    assert settings.measure_unit == "metric"
    assert settings.background == "bg1"
    assert settings.fab_position == "right"
    assert str(settings) == f"ProfileSettings<{user}>"


@pytest.mark.django_db
def test_profile_notifications_defaults_and_string_representation():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    notifications = user.profile_notifications

    assert notifications.timezone == "Europe/Warsaw"
    assert notifications.email_daily is True
    assert notifications.email_hour == 12
    assert notifications.email_minute == 0
    assert notifications.push_daily is True
    assert notifications.push_hour == 12
    assert notifications.push_minute == 0
    assert str(notifications) == f"ProfileNotifications<{user}>"


@pytest.mark.django_db
def test_notification_delivery_log_is_unique_per_user_channel_kind_and_date():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    NotificationDeliveryLog.objects.create(
        user=user,
        channel=NotificationDeliveryLog.CHANNEL_EMAIL,
        kind=NotificationDeliveryLog.KIND_DUE_TODAY,
        local_date=date(2026, 5, 5),
    )

    with pytest.raises(IntegrityError):
        NotificationDeliveryLog.objects.create(
            user=user,
            channel=NotificationDeliveryLog.CHANNEL_EMAIL,
            kind=NotificationDeliveryLog.KIND_DUE_TODAY,
            local_date=date(2026, 5, 5),
        )


@pytest.mark.django_db
def test_push_device_string_representation():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    device = PushDevice.objects.create(
        user=user,
        token="token-123",
        platform=PushDevice.PLATFORM_ANDROID,
    )

    assert str(device) == f"PushDevice<{user.id}:android:active>"


@pytest.mark.django_db
def test_support_message_string_representation():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    message = SupportMessage.objects.create(
        user=user,
        kind=SupportMessage.KIND_CONTACT,
        subject="Need help",
        body="Please help me.",
    )

    assert str(message) == f"SupportMessage<contact:{user.id}:Need help>"
