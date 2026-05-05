from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from readings.models import AccountSecret, PumpTask, Reading, ReadingDevice

User = get_user_model()


def _device(user, *, is_active=True):
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name="Monstera")
    return ReadingDevice.objects.create(
        user=user,
        plant=plant,
        device_name="Sensor",
        is_active=is_active,
    )


def test_rotate_secret_requires_authentication():
    response = APIClient().post(reverse("rotate-secret"), format="json")

    assert response.status_code == 401


@pytest.mark.django_db
def test_rotate_secret_creates_or_updates_account_secret():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("rotate-secret"), format="json")

    data = response.json()
    assert response.status_code == 200
    assert data["secret"]
    assert AccountSecret.objects.get(user=user).secret == data["secret"]


@pytest.mark.django_db
@override_settings(SITE_URL="https://api.example.com")
def test_device_setup_returns_secret_and_endpoint_samples():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("device-setup"))

    data = response.json()
    assert response.status_code == 200
    assert data["secret"]
    assert data["endpoints"]["ingest"] == "https://api.example.com/api/readings/ingest/"
    assert data["sample_payloads"]["ingest"]["device_key"] == "AB12CD34"


@pytest.mark.django_db
@patch("readings.views.send_templated_email")
def test_readings_export_email_sends_xlsx_attachment(mock_send):
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    device = _device(user)
    Reading.objects.create(
        device=device,
        timestamp=timezone.now(),
        temperature=22,
        humidity=40,
        light=500,
        moisture=30,
    )
    PumpTask.objects.create(device=device, status=PumpTask.STATUS_EXECUTED)
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("readings-export-email"),
        data={
            "location": "Living room",
            "status": "enabled",
            "sortKey": "lastRead",
            "sortDir": "desc",
            "lang": "pl",
        },
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["detail"] == "Readings export email sent."
    mock_send.assert_called_once()
    kwargs = mock_send.call_args.kwargs
    assert kwargs["to_email"] == "test@example.com"
    assert kwargs["template_name"] == "readings/export"
    assert kwargs["lang"] == "pl"
    assert kwargs["attachments"][0]["filename"].endswith(".xlsx")
    assert kwargs["attachments"][0]["mimetype"] == (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert kwargs["context"]["total_count"] == 1
    assert kwargs["context"]["watering_tasks_count"] == 1


@pytest.mark.django_db
def test_readings_export_email_rejects_invalid_status():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("readings-export-email"), data={"status": "active"}, format="json")

    data = response.json()
    assert response.status_code == 400
    assert "status" in data
