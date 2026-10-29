from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import AccountSecret, PumpTask, ReadingDevice

User = get_user_model()
pytestmark = pytest.mark.django_db


def make_plant(user, name):
    location = Location.objects.create(user=user, name=f"{name} room", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name=name)


def pump_device():
    user = User.objects.create_user(email="pump@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user, plant=make_plant(user, "Fern"), device_name="Pump",
        sensors={"moisture": True}, pump_included=True,
    )
    secret = AccountSecret.objects.create(user=user, secret="test-device-secret")
    return device, {"secret": secret.secret, "device_key": device.device_key}


@pytest.mark.parametrize("method", ["post", "patch"])
@pytest.mark.parametrize("plant_field", ["plant", "plantId"])
def test_device_rejects_foreign_plant_association(method, plant_field):
    user = User.objects.create_user(email="owner@example.com", password="strong-password-123")
    other = User.objects.create_user(email="other@example.com", password="strong-password-123")
    own_plant = make_plant(user, "Owned")
    foreign_plant = make_plant(other, "Private")
    client = APIClient()
    client.force_authenticate(user=user)

    if method == "post":
        response = client.post(reverse("reading-device-list"), {
            plant_field: foreign_plant.pk, "device_name": "Probe", "sensors": {},
        }, format="json")
        assert ReadingDevice.objects.filter(user=user).exists() is False
    else:
        device = ReadingDevice.objects.create(user=user, plant=own_plant, device_name="Probe")
        response = client.patch(
            reverse("reading-device-detail", args=[device.pk]),
            {plant_field: foreign_plant.pk}, format="json",
        )
        device.refresh_from_db()
        assert device.plant_id == own_plant.pk

    assert response.status_code == 400
    assert "plant" in response.data
    assert "Private" not in str(response.data)


def malformed_legacy_device():
    user = User.objects.create_user(email="legacy@example.com", password="strong-password-123")
    victim = User.objects.create_user(email="victim@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user, plant=make_plant(victim, "Private"), device_name="Legacy invalid device",
        sensors={"moisture": True}, pump_included=True,
    )
    AccountSecret.objects.create(user=user, secret="legacy-secret")
    return user, device


def test_legacy_foreign_plant_device_is_hidden_from_owner_api():
    user, device = malformed_legacy_device()
    client = APIClient()
    client.force_authenticate(user=user)
    assert client.get(reverse("reading-device-list")).data == []
    assert client.get(reverse("reading-device-detail", args=[device.pk])).status_code == 404
    assert client.get(reverse("history"), {"device_id": device.pk}).status_code == 404
    assert client.get(reverse("history-delete-options"), {"device_id": device.pk}).status_code == 404
    assert client.post(reverse("history-bulk-delete"), {
        "device_id": device.pk, "mode": "olderThan", "days": 30,
    }, format="json").status_code == 404


@pytest.mark.parametrize("endpoint", ["ingest", "pump-next-task", "pump-complete"])
def test_legacy_foreign_plant_device_cannot_use_hardware_api(endpoint):
    user, device = malformed_legacy_device()
    response = APIClient().post(reverse(endpoint), {
        "secret": "legacy-secret", "device_key": device.device_key,
        "metrics": {"moisture": 20}, "source": "automatic", "success": True,
    }, format="json")
    assert response.status_code == 404


def test_legacy_foreign_plant_device_cannot_read_feed():
    user, device = malformed_legacy_device()
    response = APIClient().get(reverse("feed"), {
        "secret": "legacy-secret", "device_key": device.device_key,
    })
    assert response.status_code == 404


def test_retry_capable_device_recovers_lost_task_response():
    device, credentials = pump_device()
    task = PumpTask.objects.create(
        device=device, source="manual", status="pending",
        expires_at=timezone.now() + timedelta(hours=1),
    )
    client = APIClient()
    payload = {**credentials, "supports_task_retry": True}

    first = client.post(reverse("pump-next-task"), payload, format="json")
    task.refresh_from_db()
    first_delivered_at = task.delivered_at
    # The first response is lost before the device can execute it.
    retry = client.post(reverse("pump-next-task"), payload, format="json")
    task.refresh_from_db()

    assert first.status_code == retry.status_code == 200
    assert first.data["run"] is True
    assert retry.data["run"] is True
    assert first.data["task_id"] == retry.data["task_id"] == task.pk
    assert task.delivered_at == first_delivered_at
    assert task.status == "delivered"


@pytest.mark.parametrize("retry_flag", [None, False, "false"])
def test_legacy_device_is_not_reissued_delivered_task(retry_flag):
    device, credentials = pump_device()
    task = PumpTask.objects.create(device=device, source="manual", status="pending")
    payload = dict(credentials)
    if retry_flag is not None:
        payload["supports_task_retry"] = retry_flag
    client = APIClient()

    first = client.post(reverse("pump-next-task"), payload, format="json")
    second = client.post(reverse("pump-next-task"), payload, format="json")

    assert first.data["task_id"] == task.pk
    assert first.data["run"] is True
    assert second.data["run"] is False


def test_retry_capable_poll_does_not_return_expired_or_cancelled_tasks():
    device, credentials = pump_device()
    expired = PumpTask.objects.create(
        device=device, source="manual", status="delivered",
        expires_at=timezone.now() - timedelta(seconds=1),
    )
    cancelled = PumpTask.objects.create(device=device, source="manual", status="cancelled")
    response = APIClient().post(reverse("pump-next-task"), {
        **credentials, "supports_task_retry": True,
    }, format="json")
    expired.refresh_from_db()
    cancelled.refresh_from_db()

    assert response.data["run"] is False
    assert expired.status == "expired"
    assert cancelled.status == "cancelled"


@pytest.mark.parametrize("success", [True, False])
@patch("readings.views.send_watering_completed_notifications")
def test_replayed_completion_is_idempotent(mock_notify, success, django_capture_on_commit_callbacks):
    device, credentials = pump_device()
    task = PumpTask.objects.create(device=device, source="manual", status="delivered")
    payload = {**credentials, "task_id": task.pk, "source": "manual", "success": success}
    client = APIClient()
    with django_capture_on_commit_callbacks(execute=True):
        first = client.post(reverse("pump-complete"), payload, format="json")
        second = client.post(reverse("pump-complete"), payload, format="json")
    task.refresh_from_db()

    assert first.status_code == second.status_code == 200
    assert task.status == ("executed" if success else "failed")
    assert mock_notify.call_count == (1 if success else 0)


@pytest.mark.parametrize("pump_included", [False, True])
@pytest.mark.parametrize("interval_hours", [1, 6, 24])
def test_device_setup_generates_configured_sampling_interval(pump_included, interval_hours):
    device, _ = pump_device()
    device.pump_included = pump_included
    device.interval_hours = interval_hours
    device.save()
    client = APIClient()
    client.force_authenticate(user=device.user)

    code = client.post(reverse("reading-device-code-text", args=[device.pk]), format="json")
    assert code.status_code == 200
    assert f"SEND_INTERVAL_MS = {interval_hours * 60}UL * 60UL * 1000UL;" in code.content.decode()

    with patch("readings.views.send_device_code_email") as send_email:
        emailed = client.post(reverse("reading-device-send-code-email", args=[device.pk]), format="json")
        assert emailed.status_code == 200
        assert f"SEND_INTERVAL_MS = {interval_hours * 60}UL * 60UL * 1000UL;" in send_email.call_args.kwargs["code_text"]
