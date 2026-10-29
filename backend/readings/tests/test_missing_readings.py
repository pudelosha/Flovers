from datetime import timedelta
from importlib import import_module
from types import SimpleNamespace
from unittest.mock import patch
from zoneinfo import ZoneInfo

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import connection
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.models import ProfileNotifications, ProfileSettings, PushDevice
from readings.models import MissingReadingNotification, ReadingDevice
from readings.tasks import (_claim, _deliver, _finish, check_missing_readings,
                            deliver_missing_reading_notifications, readings_overdue)
from sharing.models import PlantShare

pytestmark = pytest.mark.django_db


@pytest.fixture
def context():
    now = timezone.now()
    owner = get_user_model().objects.create_user(email="offline-owner@example.test", is_active=True)
    room = Location.objects.create(user=owner, name="Room", category="indoor")
    plant = PlantInstance.objects.create(user=owner, location=room, display_name="Fern")
    device = ReadingDevice.objects.create(
        user=owner, plant=plant, device_name="Fern sensor", interval_minutes=60,
        created_at=now - timedelta(hours=2), last_read_at=now - timedelta(hours=1),
        send_email_missing_readings=True, send_push_missing_readings=True,
    )
    PushDevice.objects.create(user=owner, token="owner-android", platform="android")
    PushDevice.objects.create(user=owner, token="owner-ios", platform="ios")
    client = APIClient()
    client.force_authenticate(owner)
    return SimpleNamespace(now=now, owner=owner, plant=plant, device=device, client=client)


@pytest.mark.parametrize("minutes", [1, 15, 60, 90, 1440])
def test_minutes_are_saved_and_returned_with_legacy_hours(context, minutes):
    response = context.client.patch(reverse("reading-device-detail", args=[context.device.pk]), {
        "interval_minutes": minutes, "send_email_missing_readings": True,
        "send_push_missing_readings": False,
    }, format="json")
    assert response.status_code == 200
    assert response.data["interval_minutes"] == minutes
    assert response.data["interval_hours"] == (minutes + 59) // 60
    context.device.refresh_from_db()
    assert context.device.effective_interval_minutes == minutes
    assert context.device.send_email_missing_readings is True
    assert context.device.send_push_missing_readings is False


@pytest.mark.parametrize("minutes", [0, -1, 1441, 1.5, None])
def test_invalid_minutes_do_not_modify_interval(context, minutes):
    response = context.client.patch(reverse("reading-device-detail", args=[context.device.pk]), {
        "interval_minutes": minutes,
    }, format="json")
    assert response.status_code == 400
    context.device.refresh_from_db()
    assert context.device.interval_minutes == 60


def test_legacy_aliases_and_unrelated_patch_preserve_minutes(context):
    endpoint = reverse("reading-device-detail", args=[context.device.pk])
    response = context.client.patch(endpoint, {"intervalHours": 3}, format="json")
    assert response.status_code == 200 and response.data["interval_minutes"] == 180
    response = context.client.patch(endpoint, {"intervalMinutes": 17, "sendEmailMissingReadings": True}, format="json")
    assert response.status_code == 200 and response.data["interval_minutes"] == 17
    response = context.client.patch(endpoint, {"notes": "Keep the minute setting"}, format="json")
    assert response.status_code == 200 and response.data["interval_minutes"] == 17
    assert context.client.patch(endpoint, {"interval_minutes": 15, "interval_hours": 2}, format="json").status_code == 400


def test_default_interval_and_alerts_are_safe_for_new_and_old_clients(context):
    response = context.client.post(reverse("reading-device-list"), {
        "plant": context.plant.pk, "device_name": "New device",
    }, format="json")
    assert response.status_code == 201
    assert response.data["interval_minutes"] == 60
    assert response.data["send_email_missing_readings"] is False
    assert response.data["send_push_missing_readings"] is False


def test_returned_minute_and_legacy_hour_fields_can_round_trip_together(context):
    endpoint = reverse("reading-device-detail", args=[context.device.pk])
    saved = context.client.patch(endpoint, {"interval_minutes": 90}, format="json")
    assert saved.status_code == 200
    response = context.client.patch(endpoint, {
        "interval_minutes": saved.data["interval_minutes"],
        "interval_hours": saved.data["interval_hours"],
    }, format="json")
    assert response.status_code == 200
    assert response.data["interval_minutes"] == 90 and response.data["interval_hours"] == 2


def test_legacy_model_calls_and_data_migration_keep_existing_hour_intervals(context):
    context.device.interval_minutes = None
    context.device.interval_hours = 4
    context.device.save(update_fields=["interval_minutes", "interval_hours"])
    assert context.device.effective_interval_minutes == 240
    migration = import_module("readings.migrations.0009_reading_intervals_and_missing_alerts")
    migration.preserve_existing_intervals(apps, SimpleNamespace(connection=connection))
    context.device.refresh_from_db()
    assert context.device.interval_minutes == 240
    context.device.interval_minutes = 17
    context.device.save(update_fields=["interval_minutes"])
    migration.preserve_existing_intervals(apps, SimpleNamespace(connection=connection))
    context.device.refresh_from_db()
    assert context.device.interval_minutes == 17


def test_shared_readonly_device_exposes_interval_but_not_owners_notification_settings(context):
    recipient = get_user_model().objects.create_user(email="caregiver@example.test", is_active=True)
    low, high = sorted((context.owner.pk, recipient.pk))
    contact = Connection.objects.create(user_low_id=low, user_high_id=high, initiator=context.owner, status="accepted")
    PlantShare.objects.create(plant=context.plant, recipient=recipient, connection=contact)
    context.client.force_authenticate(recipient)
    response = context.client.get(reverse("reading-device-detail", args=[context.device.pk]))
    assert response.status_code == 200
    assert response.data["interval_minutes"] == 60
    assert "send_email_missing_readings" not in response.data
    assert "send_push_missing_readings" not in response.data
    assert context.client.patch(reverse("reading-device-detail", args=[context.device.pk]), {
        "send_email_missing_readings": False,
    }, format="json").status_code == 404


def test_deadline_matches_interval_and_never_received_uses_creation(context):
    assert not readings_overdue(context.device, context.now - timedelta(microseconds=1))
    assert readings_overdue(context.device, context.now)
    context.device.last_read_at = None
    context.device.created_at = context.now
    assert not readings_overdue(context.device, context.now + timedelta(minutes=59, seconds=59))
    assert readings_overdue(context.device, context.now + timedelta(minutes=60))


def test_missing_alert_is_once_per_outage_per_channel_and_rearms_after_recovery(context):
    with patch("readings.tasks.timezone.now", return_value=context.now), \
            patch("readings.tasks.send_templated_email", return_value=1) as email, \
            patch("readings.tasks._send_push_and_deactivate_bad_tokens", return_value=1) as push:
        check_missing_readings()
        check_missing_readings()
        assert email.call_count == push.call_count == 1
        assert set(push.call_args.args[0]) == {"owner-ios", "owner-android"}
        assert push.call_args.args[3]["kind"] == "missing_readings"
        assert push.call_args.args[3]["url"].startswith("flovers://")
        assert email.call_args.kwargs["to_email"] == context.owner.email
        assert MissingReadingNotification.objects.filter(status="sent").count() == 2
        context.device.last_read_at = context.now
        context.device.save(update_fields=["last_read_at"])
        check_missing_readings()
        assert email.call_count == push.call_count == 1
    with patch("readings.tasks.timezone.now", return_value=context.now + timedelta(minutes=60)), \
            patch("readings.tasks.send_templated_email", return_value=1) as email, \
            patch("readings.tasks._send_push_and_deactivate_bad_tokens", return_value=1) as push:
        check_missing_readings()
        assert email.call_count == push.call_count == 1
        assert MissingReadingNotification.objects.filter(status="sent").count() == 4


@pytest.mark.parametrize("change", ["disabled", "inactive-owner", "recovered", "longer-interval", "opted-out"])
def test_pending_delivery_rechecks_current_device_and_consent(context, change):
    row = MissingReadingNotification.objects.create(device=context.device, baseline_at=context.device.last_read_at, channel="email")
    if change == "disabled":
        context.device.is_active = False
    elif change == "inactive-owner":
        context.owner.is_active = False
        context.owner.save(update_fields=["is_active"])
    elif change == "recovered":
        context.device.last_read_at = context.now
    elif change == "longer-interval":
        context.device.interval_minutes = 120
    else:
        context.device.send_email_missing_readings = False
    context.device.save()
    with patch("readings.tasks.timezone.now", return_value=context.now + timedelta(seconds=1)), \
            patch("readings.tasks.send_templated_email") as send:
        deliver_missing_reading_notifications([row.pk])
    row.refresh_from_db()
    assert row.status == "skipped"
    send.assert_not_called()


def test_disabled_and_opted_out_devices_are_not_queued(context):
    context.device.is_active = False
    context.device.save(update_fields=["is_active"])
    check_missing_readings()
    assert not MissingReadingNotification.objects.exists()
    context.device.is_active = True
    context.device.send_email_missing_readings = False
    context.device.send_push_missing_readings = False
    context.device.save()
    check_missing_readings()
    assert not MissingReadingNotification.objects.exists()


def test_email_failure_does_not_repeat_successful_push_and_is_retried(context):
    with patch("readings.tasks.timezone.now", return_value=context.now), \
            patch("readings.tasks.send_templated_email", side_effect=RuntimeError("Temporary SMTP failure")), \
            patch("readings.tasks._send_push_and_deactivate_bad_tokens", return_value=1) as push:
        check_missing_readings()
        assert push.call_count == 1
    assert MissingReadingNotification.objects.get(channel="email").status == "pending"
    assert MissingReadingNotification.objects.get(channel="push").status == "sent"
    with patch("readings.tasks.timezone.now", return_value=context.now + timedelta(minutes=2)), \
            patch("readings.tasks.send_templated_email", return_value=1) as email, \
            patch("readings.tasks._send_push_and_deactivate_bad_tokens", return_value=1) as push:
        check_missing_readings()
        assert email.call_count == 1
        push.assert_not_called()


def test_delivery_claim_is_exclusive_and_an_old_lease_cannot_finish_new_attempt(context):
    row = MissingReadingNotification.objects.create(device=context.device, baseline_at=context.device.last_read_at, channel="email")
    with patch("readings.tasks.timezone.now", return_value=context.now + timedelta(seconds=1)):
        first = _claim(row.pk)
        assert first is not None
        assert _claim(row.pk) is None
    with patch("readings.tasks.timezone.now", return_value=context.now + timedelta(minutes=16)):
        second = _claim(row.pk)
        assert second.claim_token != first.claim_token
        _finish(first, "sent")
        row.refresh_from_db()
        assert row.status == "sending" and row.claim_token == second.claim_token
        _finish(second, "sent")
    row.refresh_from_db()
    assert row.status == "sent"


def test_newly_enabled_channel_gets_one_alert_for_an_existing_outage(context):
    context.device.send_push_missing_readings = False
    context.device.save(update_fields=["send_push_missing_readings"])
    with patch("readings.tasks.send_templated_email", return_value=1) as email, \
            patch("readings.tasks._send_push_and_deactivate_bad_tokens", return_value=1) as push:
        check_missing_readings()
        context.device.send_push_missing_readings = True
        context.device.save(update_fields=["send_push_missing_readings"])
        check_missing_readings()
        check_missing_readings()
        assert email.call_count == push.call_count == 1


@pytest.mark.parametrize("language", ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko", "id", "ru", "tr"])
def test_real_email_template_renders_localized_content_without_raw_placeholders(context, language, mailoutbox):
    ProfileSettings.objects.update_or_create(user=context.owner, defaults={"language": language, "date_format": "DD.MM.YYYY"})
    ProfileNotifications.objects.update_or_create(user=context.owner, defaults={"timezone": "Europe/Warsaw"})
    context.device.send_push_missing_readings = False
    context.device.save(update_fields=["send_push_missing_readings"])
    check_missing_readings()
    assert len(mailoutbox) == 1
    message = mailoutbox[0]
    assert message.to == [context.owner.email]
    assert "[Flovers]" not in message.subject
    assert context.device.device_name in message.body
    assert "60" in message.body
    expected_time = timezone.localtime(context.device.last_read_at, ZoneInfo("Europe/Warsaw")).strftime("%d.%m.%Y %H:%M %Z")
    assert expected_time in message.body
    for placeholder in ("{device_name}", "{interval_minutes}", "{last_read}"):
        assert placeholder not in message.body
    assert message.alternatives and context.device.device_name in message.alternatives[0][0]
    assert MissingReadingNotification.objects.get(channel="email").status == "sent"


def test_no_readings_email_explains_that_the_device_has_not_reported(context, mailoutbox):
    context.device.last_read_at = None
    context.device.send_push_missing_readings = False
    context.device.save(update_fields=["last_read_at", "send_push_missing_readings"])
    check_missing_readings()
    assert len(mailoutbox) == 1
    assert "No readings received yet" in mailoutbox[0].body


def test_push_waits_for_an_active_phone_and_retries_after_registration(context):
    context.device.send_email_missing_readings = False
    context.device.save(update_fields=["send_email_missing_readings"])
    PushDevice.objects.filter(user=context.owner).update(is_active=False)
    with patch("readings.tasks.timezone.now", return_value=context.now):
        check_missing_readings()
    row = MissingReadingNotification.objects.get(channel="push")
    assert row.status == "pending"
    PushDevice.objects.filter(token="owner-ios").update(is_active=True)
    with patch("readings.tasks.timezone.now", return_value=context.now + timedelta(minutes=2)), \
            patch("readings.tasks._send_push_and_deactivate_bad_tokens", return_value=1) as send:
        check_missing_readings()
    assert send.call_args.args[0] == ["owner-ios"]
    row.refresh_from_db()
    assert row.status == "sent"


def test_removed_device_cascades_queued_notifications_and_delivery_is_safe(context):
    row = MissingReadingNotification.objects.create(device=context.device, baseline_at=context.device.last_read_at, channel="email")
    context.device.delete()
    deliver_missing_reading_notifications([row.pk])
    assert not MissingReadingNotification.objects.exists()


def test_code_download_and_email_use_the_same_saved_minute_interval(context):
    context.device.interval_minutes = 17
    context.device.save(update_fields=["interval_minutes"])
    download = context.client.post(reverse("reading-device-code-text", args=[context.device.pk]), format="json")
    assert download.status_code == 200
    assert "SEND_INTERVAL_MS = 17UL * 60UL * 1000UL;" in download.content.decode()
    with patch("readings.views.send_device_code_email") as send:
        response = context.client.post(reverse("reading-device-send-code-email", args=[context.device.pk]), format="json")
    assert response.status_code == 200
    assert "SEND_INTERVAL_MS = 17UL * 60UL * 1000UL;" in send.call_args.kwargs["code_text"]
