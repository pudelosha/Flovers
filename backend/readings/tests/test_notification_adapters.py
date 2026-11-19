"""Exercise real rendering/inbox persistence; only the external providers are fake."""
from datetime import datetime, timedelta, timezone as dt_timezone
from smtplib import SMTPException
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone

from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.models import InboxNotification, ProfileSettings, PushDevice
from readings import notifications, tasks
from readings.models import MissingReadingNotification, ReadingDevice

pytestmark = pytest.mark.django_db


@pytest.fixture
def delivery(monkeypatch, settings):
    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    settings.EMAIL_DEFAULT_LANG = "en"
    settings.SUPPORTED_LANGS = ["en", "pl"]
    now = datetime(2026, 11, 19, 12, tzinfo=dt_timezone.utc)
    monkeypatch.setattr(timezone, "now", lambda: now)
    owner = get_user_model().objects.create_user(email="sensor-owner@example.test", is_active=True)
    other = get_user_model().objects.create_user(email="unrelated@example.test", is_active=True)
    ProfileSettings.objects.filter(user=owner).update(language="pl")
    room = Location.objects.create(user=owner, name="Balcony", category="outdoor")
    plant = PlantInstance.objects.create(user=owner, location=room, display_name="Blueberry")
    device = ReadingDevice.objects.create(
        user=owner, plant=plant, device_name="Berry sensor", moisture_alert_threshold=30,
        send_email_notifications=True, send_push_notifications=True,
        pump_included=True, send_email_watering_notifications=True,
        send_push_watering_notifications=True, last_pump_run_at=now,
        last_pump_run_source="automatic", last_read_at=now - timedelta(hours=3),
        interval_minutes=60, send_email_missing_readings=True, send_push_missing_readings=True,
    )
    PushDevice.objects.create(user=owner, token="synthetic-android", platform="android")
    PushDevice.objects.create(user=owner, token="synthetic-ios", platform="ios")
    PushDevice.objects.create(user=owner, token="synthetic-disabled", platform="android", is_active=False)
    PushDevice.objects.create(user=other, token="synthetic-other", platform="android")
    fcm = Mock(return_value=SimpleNamespace(success_count=1, responses=[SimpleNamespace(success=True)]))
    monkeypatch.setattr(notifications, "send_fcm_multicast", fcm)
    # Missing-reading delivery uses the common profiles FCM adapter.
    monkeypatch.setattr("profiles.tasks.send_fcm_multicast", fcm)
    return SimpleNamespace(owner=owner, device=device, now=now, fcm=fcm)


def send(kind, device):
    if kind == "moisture_alert":
        notifications.send_moisture_alert_notifications(device_id=device.pk, moisture_value=12.5)
    else:
        notifications.send_watering_completed_notifications(device_id=device.pk)


@pytest.mark.parametrize("kind", ["moisture_alert", "watering_completed"])
def test_localized_email_and_push_are_delivered_only_to_owner_and_recorded(delivery, kind):
    send(kind, delivery.device)
    assert len(mail.outbox) == 1
    email = mail.outbox[0]
    assert email.to == [delivery.owner.email]
    assert "Berry sensor" in email.body
    assert email.alternatives and "Berry sensor" in email.alternatives[0].content
    assert email.subject == ("Alert wilgotności gleby" if kind == "moisture_alert" else "Podlewanie zakończone")
    payload = delivery.fcm.call_args.kwargs
    assert payload["tokens"] == ["synthetic-android"]  # Current moisture/pump policy is Android-only.
    assert payload["data"] == {
        "kind": kind, "route": "Readings", "deviceId": str(delivery.device.pk),
        **({"source": "automatic"} if kind == "watering_completed" else {}),
    }
    assert "Berry sensor" in payload["body"] and payload["title"] == email.subject
    if kind == "moisture_alert":
        assert "12.5" in email.body and "30" in email.body
        expected = {"device": "Berry sensor", "value": "12.5", "threshold": "30"}
    else:
        assert "Blueberry" in email.body and "Balcony" in email.body
        expected = {"device": "Berry sensor", "plant": "Blueberry"}
    rows = InboxNotification.objects.all()
    assert rows.count() == 2
    assert set(rows.values_list("channel", flat=True)) == {"email", "push"}
    assert all(row.user_id == delivery.owner.pk and row.kind == kind and row.payload == expected for row in rows)
    assert all(row.source == ("pump" if kind == "watering_completed" else "device") for row in rows)


@pytest.mark.parametrize("kind", ["moisture_alert", "watering_completed"])
@pytest.mark.parametrize("channel", ["email", "push"])
def test_consent_is_reloaded_at_delivery_time_and_is_channel_specific(delivery, kind, channel):
    field = f"send_{channel}_" + ("notifications" if kind == "moisture_alert" else "watering_notifications")
    ReadingDevice.objects.filter(pk=delivery.device.pk).update(**{field: False})
    send(kind, delivery.device)  # Pass only ID: stale in-memory consent must not be used.
    assert len(mail.outbox) == (0 if channel == "email" else 1)
    assert delivery.fcm.call_count == (0 if channel == "push" else 1)
    assert list(InboxNotification.objects.values_list("channel", flat=True)) == ["push" if channel == "email" else "email"]


@pytest.mark.parametrize("kind", ["moisture_alert", "watering_completed"])
@pytest.mark.parametrize("failure", ["raised", "rejected"])
def test_email_failure_does_not_block_push_or_claim_email_delivery(delivery, monkeypatch, kind, failure):
    email = Mock(side_effect=SMTPException("synthetic failure")) if failure == "raised" else Mock(return_value=False)
    monkeypatch.setattr(notifications, "send_templated_email", email)
    send(kind, delivery.device)
    assert delivery.fcm.call_count == 1
    assert list(InboxNotification.objects.values_list("channel", flat=True)) == ["push"]


@pytest.mark.parametrize("failure", ["raised", "malformed", "rejected"])
def test_push_failure_keeps_email_and_never_claims_push_success(delivery, failure):
    if failure == "raised":
        delivery.fcm.side_effect = RuntimeError("synthetic provider outage")
    elif failure == "malformed":
        delivery.fcm.return_value = SimpleNamespace()
    else:
        delivery.fcm.return_value = SimpleNamespace(success_count=0, responses=[SimpleNamespace(success=False)])
    send("moisture_alert", delivery.device)
    assert len(mail.outbox) == 1
    assert list(InboxNotification.objects.values_list("channel", flat=True)) == ["email"]
    assert PushDevice.objects.get(token="synthetic-android").is_active


@pytest.mark.parametrize("error", ["registration-token-not-registered", "Requested entity was not found"])
def test_invalid_token_is_retired_but_transient_error_and_other_users_are_preserved(delivery, error):
    PushDevice.objects.create(user=delivery.owner, token="synthetic-transient", platform="android")

    def respond(**kwargs):
        return SimpleNamespace(success_count=0, responses=[
            SimpleNamespace(success=False, exception=RuntimeError(error if token == "synthetic-android" else "unavailable"))
            for token in kwargs["tokens"]
        ])

    delivery.fcm.side_effect = respond
    send("moisture_alert", delivery.device)
    assert not PushDevice.objects.get(token="synthetic-android").is_active
    assert PushDevice.objects.get(token="synthetic-transient").is_active
    assert PushDevice.objects.get(token="synthetic-other").is_active
    assert not InboxNotification.objects.filter(channel="push").exists()


@pytest.mark.parametrize("language", ["en", "xx"])
def test_unsupported_locale_falls_back_to_english(delivery, language):
    ProfileSettings.objects.filter(user=delivery.owner).update(language=language)
    send("moisture_alert", delivery.device)
    assert mail.outbox[0].subject == "Soil moisture alert"
    assert delivery.fcm.call_args.kwargs["title"] == "Soil moisture alert"


def test_pump_absent_and_deleted_device_do_not_send(delivery):
    ReadingDevice.objects.filter(pk=delivery.device.pk).update(pump_included=False)
    send("watering_completed", delivery.device)
    ReadingDevice.objects.filter(pk=delivery.device.pk).delete()
    send("moisture_alert", delivery.device)
    assert not mail.outbox and not delivery.fcm.called
    assert not InboxNotification.objects.exists()


@pytest.mark.parametrize("kind", ["moisture_alert", "watering_completed"])
def test_partial_push_success_records_one_event_and_retires_only_the_invalid_token(delivery, kind):
    PushDevice.objects.create(user=delivery.owner, token="synthetic-healthy", platform="android")

    def respond(**kwargs):
        return SimpleNamespace(success_count=1, responses=[
            SimpleNamespace(success=token == "synthetic-healthy", exception=RuntimeError("unregistered") if token != "synthetic-healthy" else None)
            for token in kwargs["tokens"]
        ])

    delivery.fcm.side_effect = respond
    send(kind, delivery.device)
    send(kind, delivery.device)
    assert delivery.fcm.call_args.kwargs["tokens"] == ["synthetic-healthy"]
    assert InboxNotification.objects.filter(channel="push", user=delivery.owner, kind=kind).count() == 1
    assert not PushDevice.objects.get(token="synthetic-android").is_active
    assert PushDevice.objects.get(token="synthetic-healthy").is_active


@pytest.mark.parametrize("missing", ["email", "tokens"])
def test_missing_recipient_channel_does_not_block_the_other_channel(delivery, missing):
    if missing == "email":
        get_user_model().objects.filter(pk=delivery.owner.pk).update(email="")
    else:
        PushDevice.objects.filter(user=delivery.owner).update(is_active=False)
    send("moisture_alert", delivery.device)
    assert len(mail.outbox) == (0 if missing == "email" else 1)
    assert delivery.fcm.call_count == (1 if missing == "email" else 0)
    assert list(InboxNotification.objects.values_list("channel", flat=True)) == ["push" if missing == "email" else "email"]


def test_explicit_manual_pump_source_overrides_previous_automatic_source(delivery):
    notifications.send_watering_completed_notifications(device_id=delivery.device.pk, source="manual")
    assert delivery.fcm.call_args.kwargs["data"]["source"] == "manual"
    assert "Ręczne" in mail.outbox[0].body


def test_duplicate_event_does_not_recreate_deleted_inbox_entry(delivery):
    send("moisture_alert", delivery.device)
    InboxNotification.objects.update(deleted_at=delivery.now)
    send("moisture_alert", delivery.device)
    assert InboxNotification.objects.count() == 2
    assert not InboxNotification.objects.filter(deleted_at__isnull=True).exists()
    # These legacy immediate adapters do NOT deduplicate provider sends.
    assert len(mail.outbox) == 2 and delivery.fcm.call_count == 2


@pytest.mark.parametrize("channel", ["email", "push"])
def test_missing_reading_adapter_retries_provider_failure_then_records_one_inbox_event(delivery, monkeypatch, channel):
    row = MissingReadingNotification.objects.create(
        device=delivery.device, baseline_at=delivery.device.last_read_at, channel=channel,
        next_attempt_at=delivery.now,
    )
    if channel == "email":
        provider = Mock(side_effect=[SMTPException("synthetic outage"), True])
        monkeypatch.setattr(tasks, "send_templated_email", provider)
    else:
        provider = delivery.fcm
        provider.side_effect = [RuntimeError("synthetic outage"), SimpleNamespace(success_count=1, responses=[SimpleNamespace(success=True)] * 2)]
    tasks.deliver_missing_reading_notifications([row.pk])
    row.refresh_from_db()
    assert row.status == "pending" and row.attempts == 1 and row.next_attempt_at > delivery.now
    assert not InboxNotification.objects.exists()
    tasks.deliver_missing_reading_notifications([row.pk])
    assert provider.call_count == 1  # Backoff is respected.
    monkeypatch.setattr(timezone, "now", lambda: delivery.now + timedelta(minutes=1))
    tasks.deliver_missing_reading_notifications([row.pk])
    tasks.deliver_missing_reading_notifications([row.pk])
    row.refresh_from_db()
    assert row.status == "sent" and row.attempts == 2 and provider.call_count == 2
    inbox = InboxNotification.objects.get()
    assert inbox.user_id == delivery.owner.pk and inbox.channel == channel
    assert inbox.payload == {"device": "Berry sensor", "interval": 120}


def test_queued_push_retry_honors_revoked_consent_and_produces_no_inbox_record(delivery, monkeypatch):
    row = MissingReadingNotification.objects.create(
        device=delivery.device, baseline_at=delivery.device.last_read_at, channel="push", next_attempt_at=delivery.now,
    )
    delivery.fcm.side_effect = RuntimeError("synthetic outage")
    tasks.deliver_missing_reading_notifications([row.pk])
    ReadingDevice.objects.filter(pk=delivery.device.pk).update(send_push_missing_readings=False)
    monkeypatch.setattr(timezone, "now", lambda: delivery.now + timedelta(minutes=1))
    tasks.deliver_missing_reading_notifications([row.pk])
    row.refresh_from_db()
    assert row.status == "skipped" and delivery.fcm.call_count == 1
    assert not InboxNotification.objects.exists()
