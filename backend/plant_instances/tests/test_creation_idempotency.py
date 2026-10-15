from uuid import uuid4
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework.test import APIClient

from locations.models import Location
from plant_definitions.models import PlantDefinition
from plant_instances.models import PlantInstance, PlantCreationRequest
from reminders.models import Reminder, ReminderTask

pytestmark = pytest.mark.django_db


def fixture():
    user = get_user_model().objects.create_user(email="create@example.com", password="safe-password-123")
    location = Location.objects.create(user=user, name="Room")
    client = APIClient()
    client.force_authenticate(user)
    payload = {"creation_key": str(uuid4()), "location_id": location.pk, "display_name": "Aloe", "create_auto_tasks": True, "water_task_enabled": True, "water_interval_days": 7}
    return user, client, payload


def test_identical_retry_returns_original_result_without_duplicate_plant_or_reminders():
    user, client, payload = fixture()
    first = client.post(reverse("plant-instance-list-create"), payload, format="json")
    retry = client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert first.status_code == 201, first.data
    assert retry.status_code == 200, retry.data
    assert retry.data == first.data
    assert PlantInstance.objects.filter(user=user).count() == 1
    assert Reminder.objects.filter(user=user).count() == 1
    assert ReminderTask.objects.filter(user=user).count() == 1
    assert "creation_key" not in first.data


def test_omitted_defaults_and_explicit_defaults_have_identical_create_identity():
    _, client, payload = fixture()
    first = client.post(reverse("plant-instance-list-create"), payload, format="json")
    payload.update({"notes": "", "light_level": "medium", "orientation": "S", "distance_cm": 0, "plant_definition_id": None})
    second = client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert second.status_code == 200, second.data
    assert second.data == first.data


def test_changed_payload_cannot_reuse_creation_key():
    _, client, payload = fixture()
    assert client.post(reverse("plant-instance-list-create"), payload, format="json").status_code == 201
    payload["display_name"] = "A different plant"
    response = client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert response.status_code == 400
    assert "creation_key" in response.data
    assert PlantInstance.objects.count() == 1


def test_creation_key_is_scoped_to_owner_and_has_a_database_unique_constraint():
    user, client, payload = fixture()
    assert client.post(reverse("plant-instance-list-create"), payload, format="json").status_code == 201
    other = get_user_model().objects.create_user(email="other-create@example.com", password="safe-password-123")
    location = Location.objects.create(user=other, name="Other room")
    client.force_authenticate(other)
    response = client.post(reverse("plant-instance-list-create"), {**payload, "location_id": location.pk}, format="json")
    assert response.status_code == 201
    assert PlantInstance.objects.count() == 2
    with pytest.raises(IntegrityError), transaction.atomic():
        PlantCreationRequest.objects.create(user=user, creation_key=payload["creation_key"], request_hash="duplicate")


def test_failed_reminder_creation_rolls_back_plant_and_receipt_then_retry_can_succeed():
    _, client, payload = fixture()
    with patch.object(Reminder, "ensure_one_pending_task", side_effect=RuntimeError("Fixture failure")), pytest.raises(RuntimeError, match="Fixture failure"):
        client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert PlantInstance.objects.count() == 0
    assert Reminder.objects.count() == 0
    assert PlantCreationRequest.objects.count() == 0
    assert client.post(reverse("plant-instance-list-create"), payload, format="json").status_code == 201


def test_deleting_created_plant_preserves_receipt_and_does_not_resurrect_it_on_retry():
    _, client, payload = fixture()
    first = client.post(reverse("plant-instance-list-create"), payload, format="json")
    PlantInstance.objects.get(pk=first.data["id"]).delete()
    response = client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert response.status_code == 400
    assert "deleted" in str(response.data)
    assert PlantInstance.objects.count() == 0
    assert PlantCreationRequest.objects.count() == 1


def test_legacy_create_remains_supported_but_creation_keys_cannot_be_patched():
    _, client, payload = fixture()
    payload.pop("creation_key")
    response = client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert response.status_code == 201
    patch_response = client.patch(reverse("plant-instance-detail", args=[response.data["id"]]), {"creation_key": str(uuid4())}, format="json")
    assert patch_response.status_code == 400
    assert PlantCreationRequest.objects.count() == 0


def test_committed_draft_replays_after_catalog_deletion_without_weakening_new_create_validation():
    user, client, payload = fixture()
    definition = PlantDefinition.objects.create(
        external_id="receipt-aloe", name="Aloe", latin="Aloe vera",
        sun="medium", water="low", difficulty="easy",
    )
    payload["plant_definition_id"] = definition.pk
    first = client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert first.status_code == 201, first.data
    definition.delete()
    assert PlantInstance.objects.get(pk=first.data["id"]).plant_definition_id is None

    replay = client.post(reverse("plant-instance-list-create"), payload, format="json")
    assert replay.status_code == 200, replay.data
    assert replay.data == first.data
    assert PlantInstance.objects.count() == Reminder.objects.count() == ReminderTask.objects.count() == 1

    changed = client.post(reverse("plant-instance-list-create"), {**payload, "notes": "Changed after commit"}, format="json")
    assert changed.status_code == 400 and "creation_key" in changed.data
    new_draft = client.post(reverse("plant-instance-list-create"), {**payload, "creation_key": str(uuid4())}, format="json")
    assert new_draft.status_code == 400 and "plant_definition_id" in new_draft.data
    legacy_payload = {name: value for name, value in payload.items() if name != "creation_key"}
    assert client.post(reverse("plant-instance-list-create"), legacy_payload, format="json").status_code == 400

    other = get_user_model().objects.create_user(email="foreign-receipt@example.com", password="safe-password-123")
    other_location = Location.objects.create(user=other, name="Other room")
    client.force_authenticate(other)
    foreign = client.post(reverse("plant-instance-list-create"), {**payload, "location_id": other_location.pk}, format="json")
    assert foreign.status_code == 400 and "plant_definition_id" in foreign.data
    client.force_authenticate(user)
    foreign_location = client.post(reverse("plant-instance-list-create"), {**payload, "location_id": other_location.pk}, format="json")
    assert foreign_location.status_code == 400 and "location_id" in foreign_location.data
    assert PlantInstance.objects.count() == PlantCreationRequest.objects.count() == 1
