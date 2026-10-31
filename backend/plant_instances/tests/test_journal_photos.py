from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from io import BytesIO
import json
import os
from types import SimpleNamespace
from threading import Barrier
from unittest.mock import patch
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, close_old_connections, connection, transaction
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_instances.models import JournalPhotoEntry, JournalPhotoUpload, PlantImage, PlantInstance, PhotoFileDeletion
from plant_instances.photo_storage import directory_path, photo_metadata, queue_orphaned_files
from sharing.models import PlantShare

pytestmark = pytest.mark.django_db


def photo(color="green"):
    output = BytesIO()
    Image.new("RGB", (120, 80), color).save(output, format="JPEG")
    return SimpleUploadedFile("photo.jpg", output.getvalue(), content_type="image/jpeg")


@pytest.fixture
def scene(settings, tmp_path, django_capture_on_commit_callbacks):
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private"
    settings.MEDIA_ROOT = tmp_path / "public"
    settings.PRIVATE_MEDIA_REQUIRE_MOUNT = False
    settings.PLANT_PHOTO_MIN_FREE_BYTES = 0
    settings.PLANT_PHOTO_ACCOUNT_QUOTA_BYTES = 100 * 1024 * 1024
    settings.PLANT_PHOTO_GLOBAL_QUOTA_BYTES = 2 * 1024 * 1024 * 1024
    user = get_user_model()
    owner = user.objects.create_user(email="journal-owner@example.test", password="password", is_active=True)
    reader = user.objects.create_user(email="journal-reader@example.test", password="password", is_active=True)
    other = user.objects.create_user(email="journal-other@example.test", password="password", is_active=True)
    location = Location.objects.create(user=owner, name="Kitchen")
    plant = PlantInstance.objects.create(user=owner, location=location, display_name="Fern")
    second = PlantInstance.objects.create(user=owner, location=location, display_name="Orchid")
    low, high = sorted((owner.pk, reader.pk))
    contact = Connection.objects.create(user_low_id=low, user_high_id=high, initiator=owner, status="accepted")
    share = PlantShare.objects.create(plant=plant, recipient=reader, connection=contact, can_complete_tasks=True)
    client = APIClient()
    client.force_authenticate(owner)
    context = SimpleNamespace(owner=owner, reader=reader, other=other, plant=plant, second=second,
        share=share, contact=contact, client=client, capture=django_capture_on_commit_callbacks,
        url=reverse("journal-photo-list"), root=tmp_path / "private")

    def create(plant_id=None, key=None, **extra):
        payload = {"plant_id": str(plant_id or plant.pk), "upload_key": str(key or uuid.uuid4()), "photo": photo(), **extra}
        with django_capture_on_commit_callbacks(execute=True):
            return client.post(context.url, payload, format="multipart")
    context.create = create
    return context


def detail(entry):
    return reverse("journal-photo-detail", kwargs={"entry_id": entry["id"]})


def test_create_list_private_image_and_availability_without_changing_cover(scene):
    before = scene.client.get(scene.url).data
    assert before["results"] == []
    assert {row["plant_id"]: row["next_photo_at"] for row in before["availability"]} == {
        str(scene.plant.pk): None, str(scene.second.pk): None}
    result = scene.create(notes="New leaf", taken_on="2026-01-02", framing=json.dumps({"focal_x": .3, "focal_y": .6, "zoom": 2}))
    assert result.status_code == 201, result.data
    data = result.data
    assert data["notes"] == "New leaf" and data["taken_on"] == "2026-01-02"
    assert data["plant_name"] == "Fern" and data["location_name"] == "Kitchen"
    assert data["plant_id"] == str(scene.plant.pk) and data["revision"] == 0
    assert data["photo"]["framing"] == {"focal_x": .3, "focal_y": .6, "zoom": 2}
    assert data["access"]["is_owner"] and data["next_photo_at"]
    assert photo_metadata(scene.plant) is None
    image = PlantImage.objects.get(pk=data["photo"]["id"])
    assert image.purpose == "journal" and str(image.journal_entry_id) == data["id"]
    assert scene.client.get(data["photo"]["url"]).status_code == 200
    fetched = scene.client.get(scene.url).data
    assert len(fetched["results"]) == 1 and fetched["results"][0]["id"] == data["id"]
    filtered = scene.client.get(scene.url, {"plant_id": scene.second.pk}).data
    assert filtered["results"] == [] and len(filtered["availability"]) == 1


def test_rolling_limit_is_per_plant_and_uses_server_time_not_optional_date(scene):
    result = scene.create(taken_on="2001-01-01")
    assert result.status_code == 201
    blocked = scene.create()
    assert blocked.status_code == 429 and blocked.data["code"] == "journal_photo_cooldown"
    assert blocked.data["next_photo_at"] == result.data["next_photo_at"]
    assert scene.create(plant_id=scene.second.pk).status_code == 201
    now = timezone.now()
    PlantInstance.objects.filter(pk=scene.plant.pk).update(last_journal_photo_at=now - timedelta(hours=168) + timedelta(seconds=1))
    assert scene.create().status_code == 429
    PlantInstance.objects.filter(pk=scene.plant.pk).update(last_journal_photo_at=now - timedelta(hours=168))
    assert scene.create().status_code == 201


def test_create_retry_is_idempotent_but_deleted_entry_cannot_reappear_or_reset_cooldown(scene):
    key = uuid.uuid4()
    first = scene.create(key=key).data
    again = scene.create(key=key)
    assert again.status_code == 200 and again.data["id"] == first["id"]
    assert JournalPhotoEntry.objects.count() == PlantImage.objects.count() == 1
    with scene.capture(execute=True):
        deleted = scene.client.delete(detail(first), {"expected_revision": 0}, format="json")
    assert deleted.status_code == 204
    assert scene.create(key=key).status_code == 410
    assert scene.create().status_code == 429
    assert not JournalPhotoEntry.objects.exists() and not PlantImage.objects.exists()
    assert JournalPhotoUpload.objects.get(upload_key=key).entry_id is None


@pytest.mark.parametrize("method", ["get", "patch", "put", "delete"])
def test_stranger_cannot_read_or_mutate_entry(scene, method):
    entry = scene.create().data
    scene.client.force_authenticate(scene.other)
    response = getattr(scene.client, method)(detail(entry), {"expected_revision": 0}, format="json")
    assert response.status_code == 404
    assert scene.client.get(scene.url).data == {"results": [], "availability": []}
    assert scene.client.get(entry["photo"]["url"]).status_code == 404


def test_shared_viewer_has_private_view_only_and_revocation_applies_immediately(scene):
    entry = scene.create().data
    scene.client.force_authenticate(scene.reader)
    visible = scene.client.get(scene.url).data
    assert len(visible["results"]) == 1 and visible["availability"] == []
    assert visible["results"][0]["access"]["is_shared"]
    assert visible["results"][0]["next_photo_at"] is None
    assert scene.client.get(detail(entry)).status_code == 200
    assert scene.client.get(entry["photo"]["url"]).status_code == 200
    assert scene.create().status_code == 404
    assert scene.client.patch(detail(entry), {"expected_revision": 0, "notes": "No"}, format="json").status_code == 404
    assert scene.client.put(detail(entry), {"expected_revision": 0}, format="json").status_code == 404
    assert scene.client.delete(detail(entry), {"expected_revision": 0}, format="json").status_code == 404
    scene.share.delete()
    assert scene.client.get(scene.url).data["results"] == []
    assert scene.client.get(detail(entry)).status_code == scene.client.get(entry["photo"]["url"]).status_code == 404


@pytest.mark.parametrize("state", ["expired", "unaccepted", "inactive-owner", "inactive-recipient"])
def test_shared_visibility_requires_active_owner_recipient_accepted_unexpired_share(scene, state):
    entry = scene.create().data
    scene.client.force_authenticate(scene.reader)
    if state == "expired":
        scene.share.expires_at = timezone.now() - timedelta(seconds=1)
        scene.share.save(update_fields=["expires_at"])
    elif state == "unaccepted":
        scene.contact.status = "pending"
        scene.contact.save(update_fields=["status"])
    else:
        user = scene.owner if state == "inactive-owner" else scene.reader
        user.is_active = False
        user.save(update_fields=["is_active"])
    assert scene.client.get(scene.url).data["results"] == []
    assert scene.client.get(detail(entry)).status_code == 404
    assert scene.client.get(entry["photo"]["url"]).status_code == 404


def test_patch_preserves_image_and_cooldown_checks_revision_and_crops(scene):
    entry = scene.create().data
    patch_data = {"expected_revision": 0, "notes": "Two new leaves", "taken_on": None,
        "framing": {"focal_x": .2, "focal_y": .8, "zoom": 3}}
    edited = scene.client.patch(detail(entry), patch_data, format="json")
    assert edited.status_code == 200, edited.data
    assert edited.data["revision"] == 1 and edited.data["notes"] == "Two new leaves"
    assert edited.data["photo"]["id"] == entry["photo"]["id"]
    assert edited.data["photo"]["framing_revision"] == 1
    assert edited.data["next_photo_at"] == entry["next_photo_at"]
    stale = scene.client.patch(detail(entry), {"expected_revision": 0, "notes": "Overwrite"}, format="json")
    assert stale.status_code == 409 and stale.data["code"] == "photo_conflict"
    assert scene.client.delete(detail(entry), {"expected_revision": 0}, format="json").status_code == 409
    assert scene.client.patch(detail(entry), {"notes": "Missing revision"}, format="json").status_code == 400


def test_replacement_cleans_old_bytes_is_idempotent_and_never_restores_superseded_photo(scene):
    entry = scene.create().data
    old_folder = directory_path(PlantImage.objects.get(pk=entry["photo"]["id"]).directory)
    key = uuid.uuid4()
    payload = {"expected_revision": 0, "upload_key": str(key), "photo": photo("red"), "notes": "Replaced"}
    with scene.capture(execute=True):
        replaced = scene.client.put(detail(entry), payload, format="multipart")
    assert replaced.status_code == 200, replaced.data
    assert replaced.data["revision"] == 1 and replaced.data["photo"]["id"] != entry["photo"]["id"]
    assert replaced.data["next_photo_at"] == entry["next_photo_at"]
    assert not old_folder.exists() and not PhotoFileDeletion.objects.exists()
    payload["photo"] = photo("red")
    again = scene.client.put(detail(entry), payload, format="multipart")
    assert again.status_code == 200 and again.data == replaced.data
    with scene.capture(execute=True):
        latest = scene.client.put(detail(entry), {"expected_revision": 1, "upload_key": str(uuid.uuid4()), "photo": photo("blue")}, format="multipart")
    assert latest.status_code == 200
    payload["photo"] = photo("red")
    ancient_retry = scene.client.put(detail(entry), payload, format="multipart")
    assert ancient_retry.status_code == 200 and ancient_retry.data["photo"]["id"] == latest.data["photo"]["id"]
    assert PlantImage.objects.count() == 1


@pytest.mark.parametrize("payload", [
    {"taken_on": "2999-01-01"}, {"notes": "x" * 4001},
    {"framing": '{"focal_x": -1,"focal_y":0.5,"zoom":1}'}, {"upload_key": "bad"},
])
def test_invalid_create_does_not_consume_weekly_slot(scene, payload):
    response = scene.create(**payload)
    assert response.status_code == 400
    scene.plant.refresh_from_db()
    assert scene.plant.last_journal_photo_at is None and not PlantImage.objects.exists()


def test_journal_and_cover_share_account_quota_and_failed_upload_keeps_previous_image(scene, settings):
    entry = scene.create().data
    image = PlantImage.objects.get(pk=entry["photo"]["id"])
    settings.PLANT_PHOTO_ACCOUNT_QUOTA_BYTES = image.byte_size
    assert scene.create(plant_id=scene.second.pk).status_code == 413
    cover = scene.client.put(reverse("plant-photo", kwargs={"plant_id": scene.plant.pk}),
        {"photo": photo(), "upload_key": str(uuid.uuid4()), "expected_photo_id": "none"}, format="multipart")
    assert cover.status_code == 413
    assert directory_path(image.directory).is_dir()
    assert JournalPhotoEntry.objects.count() == 1 and PlantImage.objects.count() == 1


def test_failed_replacement_rolls_back_metadata_and_keeps_old_bytes(scene):
    entry = scene.create().data
    original = PlantImage.objects.get(pk=entry["photo"]["id"])
    with patch("plant_instances.journal_storage.JournalPhotoUpload.objects.create", side_effect=OSError("disk unavailable")):
        response = scene.client.put(detail(entry), {"expected_revision": 0, "upload_key": str(uuid.uuid4()), "photo": photo("red")}, format="multipart")
    assert response.status_code == 503
    current = scene.client.get(detail(entry)).data
    assert current["photo"]["id"] == str(original.pk) and current["revision"] == 0
    assert directory_path(original.directory).is_dir()
    folders = list((scene.root / "plants" / str(scene.plant.pk)).iterdir())
    assert folders == [directory_path(original.directory)]


@pytest.mark.parametrize("target", ["entry", "plant", "account"])
def test_cascading_deletion_cleans_private_files(scene, target):
    entry = scene.create().data
    folder = directory_path(PlantImage.objects.get(pk=entry["photo"]["id"]).directory)
    with scene.capture(execute=True):
        if target == "entry":
            scene.client.delete(detail(entry), {"expected_revision": 0}, format="json")
        elif target == "plant":
            scene.plant.delete()
        else:
            response = scene.client.delete(reverse("delete-account"), {"current_password": "password"}, format="json")
            assert response.status_code == 200
    assert not JournalPhotoEntry.objects.exists() and not PlantImage.objects.exists()
    assert not folder.exists() and not PhotoFileDeletion.objects.exists()


def test_database_constraints_prevent_journal_without_entry_and_duplicate_upload_receipts(scene):
    entry = scene.create().data
    image = PlantImage.objects.get(pk=entry["photo"]["id"])
    with pytest.raises(IntegrityError), transaction.atomic():
        PlantImage.objects.filter(pk=image.pk).update(journal_entry=None)
    receipt = JournalPhotoUpload.objects.get()
    with pytest.raises(IntegrityError), transaction.atomic():
        JournalPhotoUpload.objects.create(user=scene.owner, upload_key=receipt.upload_key,
            entry_id=entry["id"], plant_id_snapshot=scene.plant.pk, operation="create")


def test_receipt_key_cannot_cross_plant_or_change_operation(scene):
    key = uuid.uuid4()
    entry = scene.create(key=key).data
    assert scene.create(plant_id=scene.second.pk, key=key).status_code == 409
    replaced = scene.client.put(detail(entry), {"expected_revision": 0, "upload_key": str(key), "photo": photo()}, format="multipart")
    assert replaced.status_code == 409
    assert JournalPhotoEntry.objects.count() == PlantImage.objects.count() == 1


def test_journal_and_cover_can_coexist_and_orphan_sweep_retains_both(scene):
    cover = scene.client.put(reverse("plant-photo", kwargs={"plant_id": scene.plant.pk}),
        {"photo": photo(), "upload_key": str(uuid.uuid4()), "expected_photo_id": "none"}, format="multipart")
    assert cover.status_code == 200
    entry = scene.create().data
    assert photo_metadata(scene.plant)["id"] == cover.data["id"]
    assert scene.client.get(scene.url).data["results"][0]["photo"]["id"] == entry["photo"]["id"]
    old = timezone.now().timestamp() - 48 * 60 * 60
    for image in PlantImage.objects.all():
        os.utime(directory_path(image.directory), (old, old))
    assert queue_orphaned_files() == 0
    with scene.capture(execute=True):
        response = scene.client.delete(detail(entry), {"expected_revision": 0}, format="json")
    assert response.status_code == 204 and photo_metadata(scene.plant)["id"] == cover.data["id"]


def test_real_submission_rechecks_admission_after_another_upload_commits(scene):
    from plant_instances.journal_storage import create_entry
    from plant_instances.photo_processing import normalize
    processed = normalize(photo().read())
    key = uuid.uuid4()

    def concurrent_upload(upload):
        # Simulate another request committing while the first request decodes.
        with patch("plant_instances.journal_storage._normalize_upload", return_value=processed):
            create_entry(user=scene.owner, plant_id=scene.plant.pk, upload=photo(), upload_key=key)
        return processed

    with patch("plant_instances.journal_storage._normalize_upload", side_effect=concurrent_upload):
        response = scene.create()
    assert response.status_code == 429
    assert JournalPhotoEntry.objects.count() == PlantImage.objects.count() == 1


def test_real_submission_rechecks_idempotence_after_another_retry_commits(scene):
    from plant_instances.journal_storage import create_entry
    from plant_instances.photo_processing import normalize
    processed = normalize(photo().read())
    key = uuid.uuid4()

    def concurrent_upload(upload):
        with patch("plant_instances.journal_storage._normalize_upload", return_value=processed):
            create_entry(user=scene.owner, plant_id=scene.plant.pk, upload=photo(), upload_key=key)
        return processed

    with patch("plant_instances.journal_storage._normalize_upload", side_effect=concurrent_upload):
        response = scene.create(key=key)
    assert response.status_code == 200
    assert JournalPhotoEntry.objects.count() == PlantImage.objects.count() == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(connection.vendor != "postgresql", reason="PostgreSQL row-lock concurrency check")
@pytest.mark.parametrize("same_key", [False, True])
def test_concurrent_admission_has_one_weekly_slot_and_idempotent_retry(scene, same_key):
    from plant_instances.photo_processing import normalize
    normalized = normalize(photo().read())
    ready = Barrier(2)
    key = uuid.uuid4()
    keys = [key, key if same_key else uuid.uuid4()]

    def decode(upload):
        ready.wait(timeout=10)
        return normalized

    def submit(upload_key):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(get_user_model().objects.get(pk=scene.owner.pk))
            response = client.post(scene.url, {"plant_id": str(scene.plant.pk),
                "upload_key": str(upload_key), "photo": photo()}, format="multipart")
            return response.status_code
        finally:
            connection.close()

    with patch("plant_instances.journal_storage._normalize_upload", side_effect=decode):
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(submit, keys))
    assert sorted(statuses) == ([200, 201] if same_key else [201, 429])
    assert JournalPhotoEntry.objects.count() == PlantImage.objects.count() == 1


@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(connection.vendor != "postgresql", reason="PostgreSQL row-lock concurrency check")
def test_concurrent_edits_cannot_overwrite_each_other(scene):
    entry = scene.create().data
    ready = Barrier(2)

    def save(note):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(get_user_model().objects.get(pk=scene.owner.pk))
            ready.wait(timeout=10)
            return client.patch(detail(entry), {"expected_revision": 0, "notes": note}, format="json").status_code
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(save, ["First", "Second"]))
    assert sorted(statuses) == [200, 409]
    assert JournalPhotoEntry.objects.get().revision == 1
