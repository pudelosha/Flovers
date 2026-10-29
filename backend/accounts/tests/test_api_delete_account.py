from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.models import AccountProgression, ProfileNotifications, ProfileSettings, PushDevice, SupportMessage
from readings.models import AccountSecret, Reading, ReadingDevice
from reminders.models import Reminder, ReminderTask
from sharing.models import PlantShare

User = get_user_model()
PASSWORD = "delete-password-123"
pytestmark = pytest.mark.django_db


@pytest.fixture
def account():
    owner = User.objects.create_user(email="delete-owner@example.test", password=PASSWORD, is_active=True)
    contact = User.objects.create_user(email="delete-contact@example.test", password=PASSWORD, is_active=True)
    low, high = sorted((owner.pk, contact.pk))
    connection = Connection.objects.create(user_low_id=low, user_high_id=high, initiator=owner, status="accepted")
    location = Location.objects.create(user=owner, name="Owned room", category="indoor")
    plant = PlantInstance.objects.create(user=owner, location=location, display_name="Owned fern")
    other_room = Location.objects.create(user=contact, name="Other room", category="indoor")
    other_plant = PlantInstance.objects.create(user=contact, location=other_room, display_name="Other fern")
    PlantShare.objects.create(plant=plant, recipient=contact, connection=connection, can_complete_tasks=True)
    PlantShare.objects.create(plant=other_plant, recipient=owner, connection=connection, can_complete_tasks=True)
    reminder = Reminder.objects.create(user=owner, plant=plant, type="water", start_date=timezone.localdate(), interval_value=7)
    task = ReminderTask.objects.create(user=owner, reminder=reminder, due_date=timezone.localdate())
    other_reminder = Reminder.objects.create(user=contact, plant=other_plant, type="water", start_date=timezone.localdate(), interval_value=7)
    other_task = ReminderTask.objects.create(user=contact, reminder=other_reminder, due_date=timezone.localdate(),
        status="completed", completed_at=timezone.now(), completed_by=owner, note="Care history belongs to the plant owner.")
    device = ReadingDevice.objects.create(user=owner, plant=plant, device_key="DELKEY01", device_name="Owned sensor")
    Reading.objects.create(device=device, timestamp=timezone.now(), moisture=42)
    AccountSecret.objects.update_or_create(user=owner, defaults={"secret": "deletion-test-secret"})
    PushDevice.objects.create(user=owner, token="delete-owner-device")
    PushDevice.objects.create(user=contact, token="delete-contact-device")
    SupportMessage.objects.create(user=owner, subject="Test", body="Owned support message", user_email=owner.email)
    AccountProgression.objects.create(user=owner, total_xp=100)
    client = APIClient()
    response = client.post(reverse("login"), {"email": owner.email, "password": PASSWORD}, format="json")
    tokens = response.data["data"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return SimpleNamespace(owner=owner, contact=contact, location=location, plant=plant, task=task,
        other_plant=other_plant, other_task=other_task, device=device, client=client, tokens=tokens)


def test_account_deletion_requires_authentication():
    assert APIClient().delete(reverse("delete-account"), {"current_password": PASSWORD}, format="json").status_code == 401


@pytest.mark.parametrize("payload", [{}, {"current_password": ""}, {"current_password": "wrong-password"}])
def test_invalid_confirmation_does_not_delete_or_invalidate_session(account, payload):
    response = account.client.delete(reverse("delete-account"), payload, format="json")
    assert response.status_code == 400
    assert User.objects.filter(pk=account.owner.pk).exists()
    assert PlantInstance.objects.filter(pk=account.plant.pk).exists()
    assert account.client.get(reverse("profile-settings")).status_code == 200
    if payload.get("current_password"):
        assert response.data["code"] == "incorrect_password"


def test_deletion_removes_owned_records_and_both_share_directions_without_deleting_contact_data(account):
    response = account.client.delete(reverse("delete-account"), {"current_password": PASSWORD, "user_id": account.contact.pk}, format="json")
    assert response.status_code == 200
    assert response.data["data"]["deleted_plant_ids"] == [account.plant.pk]
    owner_id = account.owner.pk
    assert not User.objects.filter(pk=owner_id).exists()
    assert not PlantInstance.objects.filter(pk=account.plant.pk).exists()
    assert not Location.objects.filter(pk=account.location.pk).exists()
    assert not ReminderTask.objects.filter(pk=account.task.pk).exists()
    assert not ReadingDevice.objects.filter(pk=account.device.pk).exists()
    assert not Reading.objects.filter(device_id=account.device.pk).exists()
    assert not AccountSecret.objects.filter(user_id=owner_id).exists()
    for model in (ProfileSettings, ProfileNotifications, PushDevice, SupportMessage, AccountProgression):
        assert not model.objects.filter(user_id=owner_id).exists()
    assert not PlantShare.objects.exists()
    assert not Connection.objects.exists()
    assert User.objects.filter(pk=account.contact.pk).exists()
    assert PlantInstance.objects.filter(pk=account.other_plant.pk).exists()
    assert PushDevice.objects.filter(user=account.contact).exists()
    account.other_task.refresh_from_db()
    assert account.other_task.completed_by is None
    assert account.other_task.note == "Care history belongs to the plant owner."


def test_deleted_accounts_access_and_refresh_tokens_stop_working(account):
    assert account.client.delete(reverse("delete-account"), {"current_password": PASSWORD}, format="json").status_code == 200
    assert account.client.get(reverse("profile-settings")).status_code == 401
    assert account.client.delete(reverse("delete-account"), {"current_password": PASSWORD}, format="json").status_code == 401
    account.client.credentials()
    assert account.client.post(reverse("token-refresh"), {"refresh": account.tokens["refresh"]}, format="json").status_code == 401


def test_unexpected_cross_account_location_dependency_rolls_back_every_owned_deletion(account):
    account.other_plant.location = account.location
    account.other_plant.save(update_fields=["location"])
    response = account.client.delete(reverse("delete-account"), {"current_password": PASSWORD}, format="json")
    assert response.status_code == 409
    assert response.data["code"] == "deletion_blocked"
    assert User.objects.filter(pk=account.owner.pk).exists()
    assert PlantInstance.objects.filter(pk=account.plant.pk).exists()
    assert ReadingDevice.objects.filter(pk=account.device.pk).exists()
    assert ReminderTask.objects.filter(pk=account.task.pk).exists()
    assert PlantShare.objects.count() == 2


def test_database_failure_rolls_back_account_and_plant_deletion(account):
    with patch.object(User, "delete", side_effect=DatabaseError("Test deletion rollback")):
        with pytest.raises(DatabaseError):
            account.client.delete(reverse("delete-account"), {"current_password": PASSWORD}, format="json")
    assert User.objects.filter(pk=account.owner.pk).exists()
    assert PlantInstance.objects.filter(pk=account.plant.pk).exists()
    assert ReminderTask.objects.filter(pk=account.task.pk).exists()


def test_inactive_login_guidance_requires_the_correct_password(client):
    user = User.objects.create_user(email="inactive-guidance@example.test", password=PASSWORD, is_active=False)
    wrong = client.post(reverse("login"), {"email": user.email, "password": "wrong"}, content_type="application/json")
    missing = client.post(reverse("login"), {"email": "missing-guidance@example.test", "password": "wrong"}, content_type="application/json")
    assert wrong.status_code == missing.status_code == 400
    assert wrong.json() == missing.json()
    assert "account_not_activated" not in str(wrong.json())
    correct = client.post(reverse("login"), {"email": user.email, "password": PASSWORD}, content_type="application/json")
    assert correct.status_code == 400
    assert correct.json()["code"] == "account_not_activated"
    assert "access" not in correct.json()
