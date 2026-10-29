from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.models import ProfileNotifications
from sharing.models import PlantShare, PlantSharingVersion

from .conftest import put, recipient, snapshot, update

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("method,path,payload", [("get", "/sharing/", None), ("put", "/sharing/", {"updates": []}), ("delete", "/sharing/1/", None)])
def test_sharing_endpoints_require_authentication(method, path, payload):
    assert getattr(APIClient(), method)(path, payload, format="json").status_code == 401


def test_empty_snapshot_has_real_contacts_and_no_demo_grants(scene):
    data = snapshot(scene.a.get("/sharing/"))
    assert data["current_user"]["id"] == str(scene.owner.pk)
    assert data["current_user"]["flovers_id"].startswith("FL-")
    assert {item["id"] for item in data["contacts"]} == {str(scene.viewer.pk), str(scene.second.pk)}
    assert data["shares"] == []
    assert snapshot(scene.a.get("/api/sharing/")) == data


def test_batch_share_multiple_plants_and_recipients_is_directional(scene, mailoutbox):
    data = snapshot(put(scene.a,
        update(scene.plant, [recipient(scene.viewer), recipient(scene.second, True)]),
        update(scene.second_plant, [recipient(scene.viewer, True)])))
    assert len(data["shares"]) == PlantShare.objects.count() == 3
    assert all(item["direction"] == "outgoing" for item in data["shares"])
    assert data["versions"][str(scene.plant.pk)] == data["versions"][str(scene.second_plant.pk)] == 1
    viewer = snapshot(scene.b.get("/sharing/"))
    assert len(viewer["shares"]) == 2
    assert all(item["direction"] == "incoming" and item["contact_id"] == str(scene.owner.pk) for item in viewer["shares"])
    fern = next(item for item in viewer["shares"] if item["plant"]["id"] == str(scene.plant.pk))
    assert fern["plant"]["name"] == "Family fern"
    assert fern["plant"]["latin"] == "Sharing Fernus"
    assert fern["plant"]["location"] == "Living room"
    assert fern["plant"]["image_url"].endswith("plants/thumb/sharing-fern.jpg")
    assert not fern["can_complete_tasks"]
    assert len(snapshot(scene.c.get("/sharing/"))["shares"]) == 1
    assert snapshot(scene.d.get("/sharing/"))["shares"] == []
    assert mailoutbox == []


def test_saving_one_plant_does_not_replace_unselected_plants(scene):
    snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer)]), update(scene.second_plant, [recipient(scene.second)])))
    data = snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer, True)], revision=1)))
    assert len(data["shares"]) == 2
    assert PlantShare.objects.get(plant=scene.second_plant).recipient_id == scene.second.pk
    assert PlantSharingVersion.objects.get(plant=scene.second_plant).revision == 1


def test_owner_can_replace_contacts_remove_one_and_remove_all(scene):
    snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer), recipient(scene.second)])))
    data = snapshot(put(scene.a, update(scene.plant, [recipient(scene.second, True)], revision=1)))
    assert len(data["shares"]) == 1
    assert data["shares"][0]["contact_id"] == str(scene.second.pk)
    assert data["shares"][0]["can_complete_tasks"] is True
    assert snapshot(put(scene.a, update(scene.plant, [], revision=2)))["shares"] == []
    assert not PlantShare.objects.exists()


@pytest.mark.parametrize("kind", ["self", "unrelated", "pending", "inactive", "missing"])
def test_only_accepted_active_contacts_can_receive_access(scene, kind):
    target = {"self": scene.owner.pk, "unrelated": scene.outsider.pk, "pending": scene.pending.pk,
              "inactive": scene.inactive.pk, "missing": 999999999}[kind]
    response = put(scene.a, update(scene.plant, [{"contact_id": target}]))
    assert response.status_code == 400
    assert response.data["code"] in {"invalid", "notContact"}
    assert not PlantShare.objects.exists()
    assert not PlantSharingVersion.objects.exists()


@pytest.mark.parametrize("bad", ["unknown_plant", "other_owner_plant", "duplicate_plants", "duplicate_contacts", "missing_revision", "empty_batch", "invalid_date", "past_date", "date_overflow"])
def test_invalid_batches_make_no_changes(scene, bad):
    item = update(scene.plant, [recipient(scene.viewer)])
    updates = [item]
    expected = 400
    if bad == "unknown_plant":
        item["plant_id"] = 999999999; expected = 404
    elif bad == "other_owner_plant":
        item["plant_id"] = scene.private_plant.pk; expected = 404
    elif bad == "duplicate_plants":
        updates.append(dict(item))
    elif bad == "duplicate_contacts":
        item["recipients"].append(recipient(scene.viewer))
    elif bad == "missing_revision":
        item.pop("expected_revision")
    elif bad == "empty_batch":
        updates = []
    elif bad == "invalid_date":
        item["recipients"][0]["ends_on"] = "not-a-date"
    elif bad == "past_date":
        item["recipients"][0]["ends_on"] = (timezone.now().date() - timedelta(days=10)).isoformat()
    else:
        item["recipients"][0]["ends_on"] = "9999-12-31"
    response = scene.a.put("/sharing/", {"updates": updates}, format="json")
    assert response.status_code == expected, response.data
    assert not PlantShare.objects.exists()
    assert not PlantSharingVersion.objects.exists()


def test_atomic_batch_rolls_back_earlier_changes_when_later_revision_is_stale(scene):
    snapshot(put(scene.a, update(scene.second_plant, [recipient(scene.second)])))
    response = put(scene.a, update(scene.plant, [recipient(scene.viewer)]), update(scene.second_plant, [], revision=0))
    assert response.status_code == 409
    assert response.data["code"] == "conflict"
    assert not PlantShare.objects.filter(plant=scene.plant).exists()
    assert not PlantSharingVersion.objects.filter(plant=scene.plant).exists()
    assert PlantShare.objects.get(plant=scene.second_plant).recipient_id == scene.second.pk
    assert PlantSharingVersion.objects.get(plant=scene.second_plant).revision == 1


def test_stale_form_cannot_overwrite_newer_access(scene):
    snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer)])))
    response = put(scene.a, update(scene.plant, [recipient(scene.second)], revision=0))
    assert response.status_code == 409
    assert PlantShare.objects.get(plant=scene.plant).recipient_id == scene.viewer.pk


@pytest.mark.parametrize("actor", ["owner", "recipient"])
def test_owner_revokes_or_recipient_leaves_without_affecting_other_recipient(scene, actor):
    data = snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer), recipient(scene.second)])))
    target = next(item for item in data["shares"] if item["contact_id"] == str(scene.viewer.pk))
    client = scene.a if actor == "owner" else scene.b
    snapshot(client.delete(f'/sharing/{target["id"]}/'))
    assert PlantShare.objects.count() == 1
    assert PlantShare.objects.get().recipient_id == scene.second.pk
    assert PlantSharingVersion.objects.get(plant=scene.plant).revision == 2
    assert snapshot(scene.b.get("/sharing/"))["shares"] == []


def test_nonparticipants_cannot_remove_or_modify_someone_elses_share(scene):
    data = snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer)])))
    share_id = data["shares"][0]["id"]
    assert scene.c.delete(f"/sharing/{share_id}/").status_code == 404
    assert scene.d.delete(f"/sharing/{share_id}/").status_code == 404
    assert scene.b.put("/sharing/", {"updates": [update(scene.plant, [])]}, format="json").status_code == 404
    assert PlantShare.objects.count() == 1


def test_contact_removal_revokes_both_directions_and_invalidates_open_forms(scene):
    snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer)]), update(scene.second_plant, [recipient(scene.second)])))
    viewer_room = Location.objects.create(user=scene.viewer, name="Recipient's room", category="indoor")
    incoming_plant = PlantInstance.objects.create(user=scene.viewer, location=viewer_room, display_name="Recipient's plant")
    snapshot(put(scene.b, update(incoming_plant, [recipient(scene.owner)])))
    stale_revision = PlantSharingVersion.objects.get(plant=scene.plant).revision
    response = scene.a.delete(f"/contacts/{scene.viewer.pk}/")
    assert response.status_code == 200
    assert not PlantShare.objects.filter(plant=scene.plant).exists()
    assert not PlantShare.objects.filter(plant=incoming_plant).exists()
    assert PlantSharingVersion.objects.get(plant=incoming_plant).revision == 2
    assert PlantShare.objects.filter(plant=scene.second_plant, recipient=scene.second).exists()
    assert PlantSharingVersion.objects.get(plant=scene.plant).revision == stale_revision + 1
    low, high = sorted([scene.owner.pk, scene.viewer.pk])
    Connection.objects.create(user_low_id=low, user_high_id=high, initiator=scene.owner, status="accepted")
    response = put(scene.a, update(scene.plant, [recipient(scene.viewer)], revision=stale_revision))
    assert response.status_code == 409
    assert not PlantShare.objects.filter(plant=scene.plant).exists()


def test_expiry_is_inclusive_in_owner_timezone_and_incoming_access_stops_at_instant(scene):
    ProfileNotifications.objects.filter(user=scene.owner).update(timezone="America/Los_Angeles")
    start = datetime(2026, 10, 28, 23, 0, tzinfo=dt_timezone.utc)
    with patch("django.utils.timezone.now", return_value=start):
        snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer, ends_on="2026-10-28")])))
    grant = PlantShare.objects.get()
    expiry = datetime(2026, 10, 29, 7, 0, tzinfo=dt_timezone.utc)
    assert grant.expires_at == expiry
    with patch("django.utils.timezone.now", return_value=expiry - timedelta(microseconds=1)):
        assert len(snapshot(scene.b.get("/sharing/"))["shares"]) == 1
    with patch("django.utils.timezone.now", return_value=expiry):
        assert snapshot(scene.b.get("/sharing/"))["shares"] == []
        outgoing = snapshot(scene.a.get("/sharing/"))["shares"]
        assert outgoing[0]["is_expired"] is True
        assert outgoing[0]["ends_on"] == "2026-10-28"


def test_changing_timezone_or_permissions_does_not_move_an_existing_expiry(scene):
    ProfileNotifications.objects.filter(user=scene.owner).update(timezone="America/Los_Angeles")
    start = datetime(2026, 10, 28, 23, 0, tzinfo=dt_timezone.utc)
    with patch("django.utils.timezone.now", return_value=start):
        snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer, ends_on="2026-10-28")])))
        original = PlantShare.objects.get().expires_at
        ProfileNotifications.objects.filter(user=scene.owner).update(timezone="UTC")
        snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer, True, "2026-10-28")], revision=1)))
    assert PlantShare.objects.get().expires_at == original


def test_database_rejects_duplicate_plant_recipient_grants(scene):
    snapshot(put(scene.a, update(scene.plant, [recipient(scene.viewer)])))
    with pytest.raises(IntegrityError), transaction.atomic():
        PlantShare.objects.create(plant=scene.plant, recipient=scene.viewer, connection=scene.connection)


def test_disabled_user_cannot_read_or_change_sharing_even_with_forced_authentication(scene):
    client = APIClient(); client.force_authenticate(scene.inactive)
    assert client.get("/sharing/").status_code == 403
    assert put(client, update(scene.plant, [])).status_code == 403
