from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _task(user, status="completed", suffix=""):
    location_name = f"Living room{suffix}"
    plant_name = f"Monstera{suffix}"
    location = Location.objects.create(user=user, name=location_name, category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location, display_name=plant_name)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
    )
    return ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status=status,
        completed_at=timezone.now() - timedelta(days=1) if status == "completed" else None,
    )


@pytest.mark.django_db
@patch("reminders.views.send_templated_email")
def test_export_email_sends_xlsx_attachment(mock_send):
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    _task(user, status="completed", suffix=" A")
    _task(user, status="pending", suffix=" B")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-export-email"),
        data={
            "types": ["watering"],
            "includePending": True,
            "sortKey": "completedAt",
            "sortDir": "desc",
            "lang": "pl",
        },
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["detail"] == "Task history export email sent."
    mock_send.assert_called_once()
    kwargs = mock_send.call_args.kwargs
    assert kwargs["to_email"] == "test@example.com"
    assert kwargs["template_name"] == "reminders/task_history_export"
    assert kwargs["lang"] == "pl"
    assert kwargs["attachments"][0]["filename"].endswith(".xlsx")
    assert kwargs["attachments"][0]["mimetype"] == (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    assert kwargs["context"]["completed_count"] == 1
    assert kwargs["context"]["pending_count"] == 1


@pytest.mark.django_db
def test_export_email_rejects_invalid_date_range():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("reminder-task-export-email"),
        data={
            "completedFrom": "2026-05-05",
            "completedTo": "2026-05-01",
        },
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert "completedTo" in data


@pytest.mark.django_db
@patch("reminders.views.send_templated_email")
def test_export_email_returns_500_when_send_fails(mock_send):
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    _task(user, status="completed")
    mock_send.side_effect = Exception("SMTP unavailable")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("reminder-task-export-email"), data={}, format="json")

    data = response.json()
    assert response.status_code == 500
    assert data["detail"] == "Failed to send export email."
