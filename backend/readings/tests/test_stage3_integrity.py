from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import AccountSecret, PumpTask, Reading, ReadingDevice
from readings.serializers import ReadingDeviceSerializer

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def device():
    user = get_user_model().objects.create_user(email="stage3@example.test", password="test-password-123")
    location = Location.objects.create(user=user, name="Room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Fern")
    obj = ReadingDevice.objects.create(
        user=user, plant=plant, device_name="Sensor", pump_included=True,
        automatic_pump_launch=True, pump_threshold_pct=30, sensors={"moisture": True},
        moisture_alert_enabled=True, moisture_alert_threshold=30,
    )
    AccountSecret.objects.create(user=user, secret="stage3-test-secret")
    return obj


def credentials(device, include_id=True):
    data = {"secret": "stage3-test-secret", "device_key": device.device_key}
    if include_id:
        data["device_id"] = device.pk
    return data


def ingest(device, timestamp, metrics):
    return APIClient().post(reverse("ingest"), {
        **credentials(device), "timestamp": timestamp, "metrics": metrics,
    }, format="json")


@pytest.mark.parametrize("endpoint", ["ingest", "pump-next-task"])
def test_unauthenticated_device_id_does_not_consume_real_device_quota(device, endpoint):
    now = [2000000000.0]
    client = APIClient()
    with patch.object(SimpleRateThrottle, "timer", side_effect=lambda: now[0]):
        for i in range(60):
            now[0] = 2000000000.0 + (0 if i < 50 else 61)
            assert client.post(reverse(endpoint), {"device_id": device.pk}, format="json").status_code == 400
        now[0] += 1
        body = {**credentials(device), "metrics": {"moisture": 15}}
        assert client.post(reverse(endpoint), body, format="json").status_code == (202 if endpoint == "ingest" else 200)


def test_polling_cannot_starve_completion_and_feed_budgets(device):
    # Accelerate one hour without exceeding the unrelated anonymous/IP limit.
    now = [2000000000.0]
    client = APIClient()
    with patch.object(SimpleRateThrottle, "timer", side_effect=lambda: now[0]):
        for i in range(60):
            now[0] = 2000000000.0 + i * 60
            assert client.post(reverse("pump-next-task"), credentials(device), format="json").status_code == 200
        assert client.post(reverse("pump-complete"), {**credentials(device), "source": "automatic", "success": True}, format="json").status_code == 200
        assert client.get(reverse("feed"), credentials(device)).status_code == 200


def test_device_id_and_key_forms_share_authenticated_identity(device):
    with patch.dict(SimpleRateThrottle.THROTTLE_RATES, {"pump_poll_per_device": "2/hour"}):
        client = APIClient()
        assert client.post(reverse("pump-next-task"), credentials(device, True), format="json").status_code == 200
        assert client.post(reverse("pump-next-task"), credentials(device, False), format="json").status_code == 200
        assert client.post(reverse("pump-next-task"), credentials(device, True), format="json").status_code == 429


def test_late_reading_does_not_rewind_snapshot_or_clear_current_alert(device):
    assert ingest(device, "2026-05-05T12:20:00Z", {"moisture": 10}).status_code == 202
    assert ingest(device, "2026-05-05T10:20:00Z", {"moisture": 90}).status_code == 202
    device.refresh_from_db()
    assert device.last_read_at.hour == 12
    assert device.latest_snapshot["moisture"] == 10
    assert device.moisture_alert_active
    assert device.readings.count() == 2


def test_older_same_hour_observation_does_not_replace_newer_metrics(device):
    assert ingest(device, "2026-05-05T12:40:00Z", {"moisture": 10}).status_code == 202
    assert ingest(device, "2026-05-05T12:20:00Z", {"moisture": 90}).status_code == 202
    row = device.readings.get()
    assert row.moisture == 10
    assert row.observed_at.minute == 40


def test_partial_updates_preserve_other_metrics_and_alert_state(device):
    assert ingest(device, "2026-05-05T12:20:00Z", {"moisture": 10, "humidity": 42, "light": 500, "temperature": 22}).status_code == 202
    assert ingest(device, "2026-05-05T12:30:00Z", {"temperature": 23}).status_code == 202
    row = device.readings.get()
    assert (row.temperature, row.humidity, row.light, row.moisture) == (23, 42, 500, 10)
    device.refresh_from_db()
    assert device.moisture_alert_active


def test_failed_write_returns_retryable_error_without_acknowledging_data(device):
    with patch("readings.views.Reading.objects.get_or_create", side_effect=IntegrityError("simulated storage failure")):
        response = ingest(device, "2026-05-05T12:20:00Z", {"moisture": 10})
    assert response.status_code == 503
    assert not Reading.objects.exists()


@pytest.mark.parametrize("patch_data", [
    {"metrics": [1, 2]}, {"metrics": {"moisture": "invalid"}},
    {"metrics": {"moisture": 101}}, {"metrics": {"temperature": "NaN"}},
    {"metrics": {}}, {"timestamp": "not-a-date"},
])
def test_malformed_sensor_payload_returns_validation_error(device, patch_data):
    body = {**credentials(device), "metrics": {"temperature": 22}, **patch_data}
    assert APIClient().post(reverse("ingest"), body, format="json").status_code == 400
    assert not Reading.objects.exists()


def test_sparse_device_patch_preserves_intervening_readonly_state(device):
    stale = ReadingDevice.objects.get(pk=device.pk)
    serializer = ReadingDeviceSerializer(stale, data={"notes": "Edited"}, partial=True, context={"request": SimpleNamespace(user=device.user)})
    assert serializer.is_valid(), serializer.errors
    assert ingest(device, "2026-05-05T12:20:00Z", {"moisture": 10}).status_code == 202
    serializer.save()
    device.refresh_from_db()
    assert device.notes == "Edited"
    assert device.latest_snapshot["moisture"] == 10
    assert device.last_read_at is not None


def test_current_modal_aliases_can_be_saved_not_only_validated(device):
    client = APIClient()
    client.force_authenticate(device.user)
    response = client.post(reverse("reading-device-list"), {
        "plantId": device.plant_id, "name": "Alias sensor", "intervalHours": 4,
        "enabled": True, "sensors": {"moisture": True}, "pumpIncluded": False,
    }, format="json")
    assert response.status_code == 201, response.data
    obj = ReadingDevice.objects.get(pk=response.data["id"])
    assert obj.device_name == "Alias sensor" and obj.interval_hours == 4
    assert client.patch(reverse("reading-device-detail", args=[obj.pk]), {"name": "Renamed"}, format="json").status_code == 200
    obj.refresh_from_db()
    assert obj.device_name == "Renamed"


def test_disabled_account_cannot_read_or_drive_its_iot_device(device):
    get_user_model().objects.filter(pk=device.user_id).update(is_active=False)
    client = APIClient()
    assert client.get(reverse("feed"), credentials(device)).status_code == 403
    assert client.post(reverse("pump-next-task"), credentials(device), format="json").status_code == 403


def test_legacy_auto_requires_updated_claim_capable_firmware(device):
    client = APIClient()
    legacy = client.post(reverse("pump-next-task"), credentials(device), format="json")
    updated = client.post(reverse("pump-next-task"), {**credentials(device), "supports_auto_claim": True}, format="json")
    assert not legacy.data["auto_pump_enabled"]
    assert updated.data["auto_pump_enabled"] and updated.data["auto_pump_requires_claim"]


def test_auto_claim_persists_boundary_before_run_and_survives_lost_completion(device):
    client = APIClient()
    body = {**credentials(device), "moisture": 10}
    first = client.post(reverse("pump-auto-claim"), body, format="json")
    assert first.status_code == 200 and first.data["run"]
    task = PumpTask.objects.get(pk=first.data["task_id"])
    assert task.source == "automatic" and task.status == "delivered"
    device.refresh_from_db()
    assert device.pump_safety_until > timezone.now() + timedelta(minutes=59)
    # No completion arrives: a reboot/new HTTP session must not grant a second run.
    retry = APIClient().post(reverse("pump-auto-claim"), body, format="json")
    assert not retry.data["run"]
    assert PumpTask.objects.filter(device=device, source="automatic").count() == 1
    config = client.post(reverse("pump-next-task"), {**credentials(device), "supports_auto_claim": True}, format="json")
    assert not config.data["auto_pump_enabled"]


def test_auto_claim_obeys_manual_priority_and_current_moisture(device):
    client = APIClient()
    body = credentials(device)
    wet = client.post(reverse("pump-auto-claim"), {**body, "moisture": 50}, format="json")
    assert not wet.data["run"]
    PumpTask.objects.create(device=device, source="manual", status="pending")
    queued = client.post(reverse("pump-auto-claim"), {**body, "moisture": 10}, format="json")
    assert not queued.data["run"] and queued.data["reason"] == "manual_task_has_priority"


def test_automatic_completion_is_idempotent_with_claim_task_id(device, django_capture_on_commit_callbacks):
    client = APIClient()
    claimed = client.post(reverse("pump-auto-claim"), {**credentials(device), "moisture": 10}, format="json")
    payload = {**credentials(device), "task_id": claimed.data["task_id"], "source": "automatic", "success": True}
    with patch("readings.views.send_watering_completed_notifications") as notify, django_capture_on_commit_callbacks(execute=True):
        assert client.post(reverse("pump-complete"), payload, format="json").status_code == 200
        assert client.post(reverse("pump-complete"), payload, format="json").status_code == 200
    assert notify.call_count == 1
    assert PumpTask.objects.filter(device=device).count() == 1


def test_manual_delivery_reserves_safety_before_physical_acknowledgement(device):
    PumpTask.objects.create(device=device, source="manual", status="pending")
    response = APIClient().post(reverse("pump-next-task"), {**credentials(device), "supports_auto_claim": True}, format="json")
    assert response.data["run"]
    device.refresh_from_db()
    assert device.pump_safety_until is not None


@pytest.mark.parametrize("disabled_field", ["is_active", "pump_included"])
def test_manual_delivery_rechecks_locked_device_state(device, disabled_field):
    task = PumpTask.objects.create(device=device, source="manual", status="pending")
    ReadingDevice.objects.filter(pk=device.pk).update(**{disabled_field: False})
    with patch("readings.views._resolve_device_from_secret_and_key", return_value=(device, None)), patch(
        "readings.throttles.resolve_device", return_value=device,
    ):
        response = APIClient().post(reverse("pump-next-task"), credentials(device), format="json")
    assert not response.data["run"]
    task.refresh_from_db()
    assert task.status == "pending"
    device.refresh_from_db()
    assert device.pump_safety_until is None


def test_upgraded_firmware_does_not_replay_legacy_unreceipted_delivery(device):
    task = PumpTask.objects.create(device=device, source="manual", status="pending")
    client = APIClient()
    assert client.post(reverse("pump-next-task"), credentials(device), format="json").data["run"]
    task.refresh_from_db()
    assert not task.delivery_retry_safe
    upgraded = client.post(reverse("pump-next-task"), {**credentials(device), "supports_task_retry": True}, format="json")
    assert not upgraded.data["run"]


def test_nonfinite_pump_threshold_is_rejected_by_dedicated_action(device):
    client = APIClient()
    client.force_authenticate(device.user)
    response = client.patch(reverse("reading-device-auto-pump", args=[device.pk]), {
        "automatic_pump_launch": True, "pump_threshold_pct": "NaN",
    }, format="json")
    assert response.status_code == 400
