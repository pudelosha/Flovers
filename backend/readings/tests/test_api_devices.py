import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from unittest.mock import patch

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import AccountSecret, PumpTask, ReadingDevice

User = get_user_model()


def _plant(user, name="Monstera"):
    location = Location.objects.create(user=user, name=f"{name} location", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name=name)


def test_reading_device_list_requires_authentication():
    response = APIClient().get(reverse("reading-device-list"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_create_reading_device_with_canonical_payload():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reading-device-list"),
        data={
            "plant": plant.id,
            "device_name": "Soil sensor",
            "is_active": True,
            "interval_hours": 3,
            "sensors": {"temperature": True, "moisture": True},
            "pump_included": True,
            "pump_threshold_pct": 25,
        },
        format="json",
    )

    data = response.json()
    device = ReadingDevice.objects.get(user=user)

    assert response.status_code == 201
    assert data["id"] == device.id
    assert data["device_name"] == "Soil sensor"
    assert data["plant"] == plant.id
    assert data["plant_name"] == "Monstera"
    assert data["plant_location"] == "Monstera location"
    assert data["interval_hours"] == 3
    assert data["device_key"] == device.device_key


@pytest.mark.django_db
def test_list_reading_devices_returns_only_current_users_devices():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    ReadingDevice.objects.create(user=other_user, plant=_plant(other_user, "Other"), device_name="Other")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reading-device-list"))

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == device.id


@pytest.mark.django_db
def test_retrieve_reading_device_returns_404_for_other_users_device():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    other_user = User.objects.create_user(email="other@example.com", password="strong-password-123")
    other_device = ReadingDevice.objects.create(
        user=other_user,
        plant=_plant(other_user, "Other"),
        device_name="Other",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reading-device-detail", args=[other_device.id]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_patch_reading_device_updates_alias_fields():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reading-device-detail", args=[device.id]),
        data={"name": "Updated sensor", "enabled": False, "intervalHours": 6},
        format="json",
    )

    data = response.json()
    device.refresh_from_db()

    assert response.status_code == 200
    assert data["device_name"] == "Updated sensor"
    assert data["is_active"] is False
    assert data["interval_hours"] == 6
    assert device.device_name == "Updated sensor"


@pytest.mark.django_db
def test_auto_pump_action_rejects_device_without_pump():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=False,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reading-device-auto-pump", args=[device.id]),
        data={"automatic_pump_launch": True},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert data["detail"] == "Pump must be included to enable automatic pump launch."


@pytest.mark.django_db
def test_auto_pump_action_enables_auto_pump_when_device_is_ready():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        sensors={"moisture": True},
        pump_included=True,
        pump_threshold_pct=30,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reading-device-auto-pump", args=[device.id]),
        data={"automatic_pump_launch": True},
        format="json",
    )

    data = response.json()
    device.refresh_from_db()
    assert response.status_code == 200
    assert data["automatic_pump_launch"] is True
    assert device.automatic_pump_launch is True


@pytest.mark.django_db
def test_auto_pump_action_accepts_threshold_when_existing_threshold_is_missing():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        sensors={"moisture": True},
        pump_included=True,
        pump_threshold_pct=None,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("reading-device-auto-pump", args=[device.id]),
        data={"automatic_pump_launch": True, "pump_threshold_pct": 30},
        format="json",
    )

    data = response.json()
    device.refresh_from_db()
    assert response.status_code == 200
    assert data["automatic_pump_launch"] is True
    assert data["pump_threshold_pct"] == 30
    assert device.automatic_pump_launch is True
    assert device.pump_threshold_pct == 30


@pytest.mark.django_db
def test_pump_status_returns_pending_manual_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=True,
    )
    task = PumpTask.objects.create(device=device, status=PumpTask.STATUS_PENDING)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reading-device-pump-status", args=[device.id]))

    data = response.json()
    assert response.status_code == 200
    assert data["pump_included"] is True
    assert data["pending_pump_task"]["id"] == task.id
    assert "expires_at" not in data["pending_pump_task"]


@pytest.mark.django_db
def test_pump_schedule_creates_manual_pending_task_and_is_idempotent():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=True,
    )
    client = APIClient()
    client.force_authenticate(user=user)

    first = client.post(reverse("reading-device-pump-schedule", args=[device.id]), format="json")
    second = client.post(reverse("reading-device-pump-schedule", args=[device.id]), format="json")

    first_data = first.json()
    second_data = second.json()
    assert first.status_code == 201
    assert first_data["detail"] == "Watering scheduled."
    assert second.status_code == 200
    assert second_data["detail"] == "Watering is already scheduled."
    assert PumpTask.objects.filter(device=device, status=PumpTask.STATUS_PENDING).count() == 1


@pytest.mark.django_db
def test_pump_recall_cancels_pending_manual_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        pump_included=True,
    )
    task = PumpTask.objects.create(device=device, status=PumpTask.STATUS_PENDING)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("reading-device-pump-recall", args=[device.id]), format="json")

    data = response.json()
    task.refresh_from_db()
    assert response.status_code == 200
    assert data["detail"] == "Scheduled watering recalled."
    assert data["pending_pump_task"] is None
    assert task.status == PumpTask.STATUS_CANCELLED


@pytest.mark.django_db
@override_settings(SITE_URL="https://api.example.com")
def test_code_text_returns_generated_arduino_code():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(
        user=user,
        plant=_plant(user),
        device_name="Sensor",
        sensors={"temperature": True, "moisture": True},
        pump_included=True,
    )
    AccountSecret.objects.create(user=user, secret="secret-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("reading-device-code-text", args=[device.id]), format="json")

    content = response.content.decode()
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/plain")
    assert "https://api.example.com/api/readings/ingest/" in content
    assert f'const char* deviceKey = "{device.device_key}";' in content
    assert 'const char* secret = "secret-123";' in content


@pytest.mark.django_db
@patch("readings.views.send_device_code_email")
def test_send_code_email_sends_generated_device_code(mock_send):
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    AccountSecret.objects.create(user=user, secret="secret-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("reading-device-send-code-email", args=[device.id]), format="json")

    data = response.json()
    assert response.status_code == 200
    assert data["detail"] == "Device code was sent to test@example.com."
    mock_send.assert_called_once()
    assert mock_send.call_args.kwargs["user"] == user
    assert mock_send.call_args.kwargs["device"] == device
    assert "secret-123" in mock_send.call_args.kwargs["code_text"]


@pytest.mark.django_db
@override_settings(SITE_URL="https://api.example.com")
def test_doc_pdf_returns_pdf_response():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = ReadingDevice.objects.create(user=user, plant=_plant(user), device_name="Sensor")
    AccountSecret.objects.create(user=user, secret="secret-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("reading-device-doc-pdf", args=[device.id]))

    assert response.status_code == 200
    assert response["Content-Type"] == "application/pdf"
    assert response["Content-Disposition"] == f'attachment; filename="device-{device.id}-setup.pdf"'
    assert response.content.startswith(b"%PDF")
