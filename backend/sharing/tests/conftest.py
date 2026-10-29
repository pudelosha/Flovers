from types import SimpleNamespace

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_definitions.models import PlantDefinition
from plant_instances.models import PlantInstance
from profiles.models import ProfileNotifications
from readings.models import AccountSecret, Reading, ReadingDevice
from reminders.models import Reminder, ReminderTask


def snapshot(response, status=200):
    assert response.status_code == status, response.data
    assert response.data["status"] == "success"
    data = response.data["data"]
    assert set(data) == {"current_user", "contacts", "shares", "versions"}
    return data


def update(plant, recipients=(), revision=0):
    return {"plant_id": plant.pk, "expected_revision": revision, "recipients": list(recipients)}


def recipient(user, complete=False, ends_on=None):
    return {"contact_id": user.pk, "can_complete_tasks": complete, "ends_on": ends_on}


def put(client, *updates):
    return client.put("/sharing/", {"updates": list(updates)}, format="json")


@pytest.fixture(autouse=True)
def reset_throttles():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def scene(db):
    User = get_user_model()
    owner = User.objects.create_user(email="sharing-owner@example.test", first_name="Alice", is_active=True)
    viewer = User.objects.create_user(email="sharing-viewer@example.test", first_name="Cara", is_active=True)
    second = User.objects.create_user(email="sharing-second@example.test", first_name="Luca", is_active=True)
    outsider = User.objects.create_user(email="sharing-outsider@example.test", first_name="Other", is_active=True)
    pending = User.objects.create_user(email="sharing-pending@example.test", is_active=True)
    inactive = User.objects.create_user(email="sharing-inactive@example.test", is_active=False)

    def connect(other, status="accepted"):
        low, high = sorted([owner.pk, other.pk])
        return Connection.objects.create(user_low_id=low, user_high_id=high, initiator=owner, status=status)

    connection = connect(viewer)
    second_connection = connect(second)
    connect(pending, "pending")
    connect(inactive)
    ProfileNotifications.objects.update_or_create(user=owner, defaults={"timezone": "UTC"})
    room = Location.objects.create(user=owner, name="Living room", category="indoor")
    other_room = Location.objects.create(user=outsider, name="Private room", category="indoor")
    definition = PlantDefinition.objects.create(external_id="sharing-fern", name="Fern", latin="Sharing Fernus",
        sun="medium", water="medium", difficulty="easy", image_thumb="plants/thumb/sharing-fern.jpg")
    plant = PlantInstance.objects.create(user=owner, location=room, display_name="Family fern", notes="Plant care note",
        plant_definition=definition, photo_uri="file:///private-owner-photo.jpg")
    second_plant = PlantInstance.objects.create(user=owner, location=room, display_name="Holiday orchid")
    private_plant = PlantInstance.objects.create(user=outsider, location=other_room, display_name="Unshared cactus")
    device = ReadingDevice.objects.create(user=owner, plant=plant, device_name="Family sensor", device_key="SHAREKEY1",
        notes="Private Wi-Fi setup note", pump_included=True, automatic_pump_launch=True, pump_threshold_pct=20,
        sensors={"temperature": True, "moisture": True}, last_read_at=timezone.now(), latest_snapshot={"temperature": 22, "moisture": 31})
    reading = Reading.objects.create(device=device, timestamp=timezone.now(), temperature=22, moisture=31)
    secret = AccountSecret.objects.create(user=owner, secret="owner-secret-for-sharing-tests")
    reminder = Reminder.objects.create(user=owner, plant=plant, type="water", start_date=timezone.localdate(), interval_value=7)
    task = ReminderTask.objects.create(user=owner, reminder=reminder, due_date=timezone.localdate())
    clients = []
    for user in (owner, viewer, second, outsider):
        client = APIClient()
        client.force_authenticate(user)
        clients.append(client)
    return SimpleNamespace(owner=owner, viewer=viewer, second=second, outsider=outsider, pending=pending, inactive=inactive,
        connection=connection, second_connection=second_connection, plant=plant, second_plant=second_plant,
        private_plant=private_plant, room=room, device=device, reading=reading, secret=secret, reminder=reminder, task=task,
        a=clients[0], b=clients[1], c=clients[2], d=clients[3])
