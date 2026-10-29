from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone

from contacts.models import Connection
from plant_instances.models import PlantInstance
from profiles.models import AccountProgression, TaskXPAward
from readings.models import Reading, ReadingDevice
from reminders.models import ReminderTask
from sharing.models import PlantShare

from .conftest import put, recipient, snapshot, update

pytestmark = pytest.mark.django_db


def share(scene, complete=False):
    return snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer, complete)])))["shares"][0]["id"]


def test_shared_plant_list_detail_and_existing_qr_code_work_for_recipient(scene):
    share(scene)
    own = scene.a.get(reverse("plant-instance-detail", args=[scene.plant.pk]))
    assert own.status_code == 200
    plants = scene.b.get(reverse("plant-instance-list-create"))
    assert plants.status_code == 200
    assert [item["id"] for item in plants.data] == [scene.plant.pk]
    assert plants.data[0]["photo_uri"] is None
    detail = scene.b.get(reverse("plant-instance-detail", args=[scene.plant.pk]))
    scanned = scene.b.get(reverse("plant-instance-by-qr"), {"code": scene.plant.qr_code})
    assert detail.status_code == scanned.status_code == 200
    assert detail.data["notes"] == "Plant care note"
    for response in (plants.data[0], detail.data, scanned.data):
        assert response["access"]["is_owner"] is False
        assert response["access"]["is_shared"] is True
        assert response["access"]["can_edit"] is False
        assert response["access"]["can_complete_tasks"] is False
        assert response["access"]["owner"]["id"] == str(scene.owner.pk)
    assert scene.d.get(reverse("plant-instance-detail", args=[scene.plant.pk])).status_code == 404
    assert scene.d.get(reverse("plant-instance-by-qr"), {"code": scene.plant.qr_code}).status_code == 404


@pytest.mark.parametrize("complete", [False, True])
def test_recipients_cannot_edit_delete_reshare_or_send_owner_qr_email(scene, complete, mailoutbox):
    share(scene, complete)
    detail = reverse("plant-instance-detail", args=[scene.plant.pk])
    assert scene.b.patch(detail, {"display_name": "Changed by caregiver"}, format="json").status_code == 404
    assert scene.b.delete(detail).status_code == 404
    assert scene.b.post(reverse("plant-instance-send-qr-email", args=[scene.plant.pk]), {}, format="json").status_code == 404
    assert put(scene.b, update(scene.plant, [recipient(scene.second)])).status_code == 404
    scene.plant.refresh_from_db()
    assert scene.plant.display_name == "Family fern"
    assert mailoutbox == []


@pytest.mark.parametrize("complete", [False, True])
def test_shared_reading_device_and_history_are_sanitized_read_only(scene, complete):
    share(scene, complete)
    listing = scene.b.get(reverse("reading-device-list"))
    detail = scene.b.get(reverse("reading-device-detail", args=[scene.device.pk]))
    history = scene.b.get(reverse("history"), {"device_id": scene.device.pk})
    assert listing.status_code == detail.status_code == history.status_code == 200
    assert len(listing.data) == 1
    assert detail.data["latest"]["temperature"] == 22
    assert history.data["device"]["id"] == scene.device.pk
    assert any(point["value"] == 22 for point in history.data["points"])
    for data in (listing.data[0], detail.data, history.data["device"]):
        assert data["access"]["is_shared"] is True
        assert data["access"]["can_edit"] is False
        assert "device_key" not in data
        assert "notes" not in data
        assert "secret" not in data
        assert "pending_pump_task" not in data
        assert "pump_threshold_pct" not in data
    output = str([listing.data, detail.data, history.data])
    assert scene.device.device_key not in output
    assert scene.secret.secret not in output
    assert scene.device.notes not in output
    assert scene.a.get(reverse("reading-device-detail", args=[scene.device.pk])).data["device_key"] == scene.device.device_key


def test_missing_access_metadata_never_falls_back_to_owner_device_fields(scene):
    share(scene)
    # A grant can disappear between the visible-device query and serialization.
    with patch("readings.serializers.plant_access", return_value=None):
        response = scene.b.get(reverse("reading-device-detail", args=[scene.device.pk]))
    assert response.status_code == 200
    assert "device_key" not in response.data
    assert "notes" not in response.data
    assert "pending_pump_task" not in response.data


def test_missing_access_metadata_never_exposes_an_owner_local_photo_path(scene):
    share(scene)
    with patch("plant_instances.serializers.plant_access", return_value=None):
        response = scene.b.get(reverse("plant-instance-list-create"))
    assert response.status_code == 200
    assert response.data[0]["photo_uri"] is None


@pytest.mark.parametrize("action,method,payload", [
    ("auto-pump", "patch", {"automatic_pump_launch": True}),
    ("pump-status", "get", None),
    ("pump-schedule", "post", {"duration_seconds": 20}),
    ("pump-recall", "post", {}),
    ("code.txt", "post", {}),
    ("send-code-email", "post", {}),
    ("doc.pdf", "get", None),
])
def test_extra_device_actions_and_pump_controls_remain_owner_only(scene, action, method, payload, mailoutbox):
    share(scene, complete=True)
    response = getattr(scene.b, method)(f"/readings/devices/{scene.device.pk}/{action}/", payload, format="json")
    assert response.status_code == 404, response.data
    scene.device.refresh_from_db()
    assert scene.device.automatic_pump_launch is True
    assert not scene.device.pump_tasks.exists()
    assert mailoutbox == []


def test_shared_recipient_cannot_change_remove_or_create_owner_devices(scene):
    share(scene, complete=True)
    detail = reverse("reading-device-detail", args=[scene.device.pk])
    assert scene.b.patch(detail, {"device_name": "Changed"}, format="json").status_code == 404
    assert scene.b.delete(detail).status_code == 404
    response = scene.b.post(reverse("reading-device-list"), {"plant": scene.plant.pk, "device_name": "New device"}, format="json")
    assert response.status_code == 400
    assert ReadingDevice.objects.count() == 1


def test_reading_history_delete_and_export_never_use_shared_data(scene):
    share(scene, complete=True)
    assert scene.b.get(reverse("history-delete-options"), {"device_id": scene.device.pk}).status_code == 404
    assert scene.b.post(reverse("history-bulk-delete"), {"device_id": scene.device.pk, "mode": "olderThan", "days": 1}, format="json").status_code == 404
    with patch("readings.views.send_templated_email") as send:
        exported = scene.b.post(reverse("readings-export-email"), {"plantId": scene.plant.pk}, format="json")
    assert exported.status_code == 200
    assert send.call_args.kwargs["context"]["total_count"] == 0
    assert Reading.objects.filter(pk=scene.reading.pk).exists()


@pytest.mark.parametrize("cause", ["revoked", "expired", "contact_removed", "contact_pending", "owner_disabled"])
def test_access_disappears_from_all_surfaces_immediately(scene, cause):
    share_id = share(scene, complete=True)
    scene.task.mark_complete_and_spawn_next(note="Shared history note")
    if cause == "revoked":
        assert scene.a.delete(f"/sharing/{share_id}/").status_code == 200
    elif cause == "expired":
        PlantShare.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    elif cause == "contact_removed":
        assert scene.a.delete(f"/contacts/{scene.viewer.pk}/").status_code == 200
    elif cause == "contact_pending":
        Connection.objects.filter(pk=scene.connection.pk).update(status="pending")
    else:
        get_user_model().objects.filter(pk=scene.owner.pk).update(is_active=False)
    assert scene.b.get(reverse("plant-instance-list-create")).data == []
    assert scene.b.get(reverse("plant-instance-detail", args=[scene.plant.pk])).status_code == 404
    assert scene.b.get(reverse("plant-instance-by-qr"), {"code": scene.plant.qr_code}).status_code == 404
    assert scene.b.get(reverse("reading-device-list")).data == []
    assert scene.b.get(reverse("reading-device-detail", args=[scene.device.pk])).status_code == 404
    assert scene.b.get(reverse("history"), {"device_id": scene.device.pk}).status_code == 404
    assert scene.b.get(reverse("reminders-list-create")).data == []
    assert scene.b.get(reverse("reminder-tasks-list")).data == []
    assert scene.b.get(reverse("plant-instance-journal", args=[scene.plant.pk])).data == []
    assert snapshot(scene.b.get("/sharing/"))["shares"] == []


def test_a_mismatched_contact_connection_never_grants_read_access(scene):
    PlantShare.objects.create(plant=scene.plant, recipient=scene.viewer, connection=scene.second_connection,
        can_complete_tasks=True)
    assert scene.b.get(reverse("plant-instance-list-create")).data == []
    assert scene.b.get(reverse("reading-device-list")).data == []
    assert scene.b.get(reverse("reminder-tasks-list")).data == []
    assert scene.b.get(reverse("plant-instance-detail", args=[scene.plant.pk])).status_code == 404
    assert snapshot(scene.b.get("/sharing/"))["shares"] == []


def test_mismatched_device_owner_is_never_exposed_by_a_valid_plant_grant(scene):
    share(scene)
    ReadingDevice.objects.filter(pk=scene.device.pk).update(user=scene.outsider)
    assert scene.b.get(reverse("reading-device-list")).data == []
    assert scene.b.get(reverse("reading-device-detail", args=[scene.device.pk])).status_code == 404
    assert scene.b.get(reverse("history"), {"device_id": scene.device.pk}).status_code == 404


def test_completing_an_old_task_cannot_leak_history_after_a_reminder_moves_to_a_shared_plant(scene):
    scene.task.mark_complete_and_spawn_next(note="Private old-plant completion")
    target = PlantInstance.objects.create(user=scene.owner, location=scene.room, display_name="New shared plant")
    type(scene.reminder).objects.filter(pk=scene.reminder.pk).update(plant=target)
    snapshot(put(scene.a, update(target, [recipient(scene.viewer, complete=True)])))
    pending = scene.b.get(reverse("reminder-tasks-list"), {"status": "pending"})
    assert len(pending.data) == 1
    assert pending.data[0]["id"] != scene.task.pk
    response = scene.b.post(reverse("reminder-task-complete", args=[scene.task.pk]), {}, format="json")
    assert response.status_code == 404
    assert "Private old-plant completion" not in str(response.data)
    assert TaskXPAward.objects.count() == 1
    assert not AccountProgression.objects.filter(user=scene.viewer).exists()
