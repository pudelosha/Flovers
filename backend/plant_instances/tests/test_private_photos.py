from datetime import timedelta
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import os
import subprocess
import uuid

import pytest
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from plant_instances.models import PlantImage, PlantInstance, PhotoFileDeletion
from plant_instances.photo_errors import PhotoError
from plant_instances.photo_processing import normalize
from plant_instances.photo_storage import (
    cleanup_deleted_files, directory_path, photo_metadata, private_root,
    queue_orphaned_files, replace_photo,
)
from sharing.models import PlantShare

pytestmark = pytest.mark.django_db


def image_bytes(size=(96, 64), color="green", fmt="JPEG", exif=None):
    output = BytesIO()
    options = {"exif": exif} if exif is not None else {}
    Image.new("RGB", size, color).save(output, format=fmt, **options)
    return output.getvalue()


def file(data=None, name="untrusted-name.jpg", content_type="image/jpeg"):
    return SimpleUploadedFile(name, data if data is not None else image_bytes(), content_type=content_type)


@pytest.fixture
def scene(settings, tmp_path, django_capture_on_commit_callbacks):
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private"
    settings.MEDIA_ROOT = tmp_path / "public"
    settings.PRIVATE_MEDIA_REQUIRE_MOUNT = False
    settings.PLANT_PHOTO_MIN_FREE_BYTES = 0
    settings.PLANT_PHOTO_ACCOUNT_QUOTA_BYTES = 100 * 1024 * 1024
    settings.PLANT_PHOTO_GLOBAL_QUOTA_BYTES = 2 * 1024 * 1024 * 1024
    user = get_user_model()
    owner = user.objects.create_user(email="photos-owner@example.test", password="photo-password", is_active=True)
    recipient = user.objects.create_user(email="photos-reader@example.test", password="photo-password", is_active=True)
    stranger = user.objects.create_user(email="photos-stranger@example.test", password="photo-password", is_active=True)
    location = Location.objects.create(user=owner, name="Kitchen", category="indoor")
    plant = PlantInstance.objects.create(user=owner, location=location, display_name="Fern")
    low, high = sorted((owner.pk, recipient.pk))
    connection = Connection.objects.create(user_low_id=low, user_high_id=high, initiator=owner, status="accepted")
    share = PlantShare.objects.create(plant=plant, recipient=recipient, connection=connection, can_complete_tasks=False)
    client = APIClient()
    client.force_authenticate(owner)
    context = SimpleNamespace(owner=owner, recipient=recipient, stranger=stranger, plant=plant,
        share=share, connection=connection, client=client, root=Path(settings.PRIVATE_MEDIA_ROOT),
        endpoint=reverse("plant-photo", kwargs={"plant_id": plant.pk}), capture=django_capture_on_commit_callbacks)

    def upload(data=None, key=None, expected="none", **extra):
        payload = {"photo": file(data), "upload_key": str(key or uuid.uuid4()), "expected_photo_id": expected, **extra}
        with django_capture_on_commit_callbacks(execute=True):
            return client.put(context.endpoint, payload, format="multipart")
    context.upload = upload
    return context


def body(response):
    return b"".join(response.streaming_content) if response.streaming else response.content


def test_private_upload_generates_metadata_and_authenticated_variants(scene):
    result = scene.upload(image_bytes((1800, 1200)))
    assert result.status_code == 200, result.data
    data = result.data
    assert data["width"] == 1280 and data["height"] <= 1280
    assert data["url"].startswith(f"/plant-instances/{scene.plant.pk}/photo/")
    assert data["thumbnail_url"] == data["url"] + "?variant=thumbnail"
    assert "secret" not in data["url"] and "token" not in data["url"]
    stored = PlantImage.objects.get(pk=data["id"])
    folder = directory_path(stored.directory)
    assert sorted(path.name for path in folder.iterdir()) == ["display.jpg", "thumbnail.jpg"]
    assert data["byte_size"] == sum(path.stat().st_size for path in folder.iterdir())
    assert data["byte_size"] <= (300 + 40) * 1024
    for url, maximum in ((data["url"], 1280), (data["thumbnail_url"], 320)):
        fetched = scene.client.get(url)
        assert fetched.status_code == 200
        assert fetched["Content-Type"] == "image/jpeg"
        assert fetched["Cache-Control"] == "private, no-store"
        assert fetched["X-Content-Type-Options"] == "nosniff"
        assert "Authorization" in fetched["Vary"]
        raw = body(fetched)
        with Image.open(BytesIO(raw)) as image:
            assert max(image.size) <= maximum and not image.getexif()
        head = scene.client.head(url)
        assert head.status_code == 200 and body(head) == b""
        assert int(head["Content-Length"]) == len(raw)
    scene.plant.refresh_from_db()
    assert photo_metadata(scene.plant)["id"] == data["id"]
    assert scene.client.get(reverse("plant-instance-detail", kwargs={"pk": scene.plant.pk})).data["photo"]["id"] == data["id"]
    assert scene.client.get(reverse("plant-instance-list-create")).data[0]["photo"]["id"] == data["id"]
    from sharing.services import sharing_snapshot
    assert sharing_snapshot(scene.recipient)["shares"][0]["plant"]["photo"]["id"] == data["id"]


@pytest.mark.parametrize("kind", ["anonymous", "stranger", "expired", "revoked", "unaccepted", "inactive"])
@pytest.mark.parametrize("method", ["get", "head"])
def test_download_permissions_apply_to_display_and_thumbnail(scene, kind, method):
    photo = scene.upload().data
    client = APIClient()
    if kind == "stranger":
        client.force_authenticate(scene.stranger)
    elif kind != "anonymous":
        client.force_authenticate(scene.recipient)
        if kind == "expired":
            scene.share.expires_at = timezone.now() - timedelta(seconds=1)
            scene.share.save(update_fields=["expires_at"])
        elif kind == "revoked":
            scene.share.delete()
        elif kind == "unaccepted":
            scene.connection.status = "pending"
            scene.connection.save(update_fields=["status"])
        else:
            scene.owner.is_active = False
            scene.owner.save(update_fields=["is_active"])
    expected = 401 if kind == "anonymous" else 404
    for url in (photo["url"], photo["thumbnail_url"]):
        response = getattr(client, method)(url)
        assert response.status_code == expected


def test_active_view_only_recipient_can_read_but_never_upload_or_delete(scene):
    photo = scene.upload().data
    scene.client.force_authenticate(scene.recipient)
    for url in (photo["url"], photo["thumbnail_url"]):
        response = scene.client.get(url)
        assert response.status_code == 200
        body(response)
    assert scene.upload(expected=photo["id"]).status_code == 404
    assert scene.client.delete(scene.endpoint, {"expected_photo_id": photo["id"]}, format="json").status_code == 404
    assert PlantImage.objects.count() == 1


def test_anonymous_upload_is_denied_before_image_processing(scene):
    scene.client.force_authenticate(None)
    with patch("plant_instances.photo_storage._normalize_upload") as process:
        assert scene.upload().status_code == 401
        process.assert_not_called()


def test_upload_retry_returns_current_photo_without_processing_or_new_files(scene):
    key = uuid.uuid4()
    first = scene.upload(key=key)
    with patch("plant_instances.photo_storage._normalize_upload") as process:
        retry = scene.upload(data=b"not-another-image", key=key)
    assert first.status_code == retry.status_code == 200
    assert first.data == retry.data
    assert PlantImage.objects.count() == 1
    process.assert_not_called()


def test_replace_cleans_old_files_and_conflicting_stale_retries_cannot_overwrite(scene):
    first_key = uuid.uuid4()
    first = scene.upload(key=first_key).data
    old = PlantImage.objects.get(pk=first["id"])
    old_folder = directory_path(old.directory)
    second = scene.upload(image_bytes(color="blue"), expected=first["id"])
    assert second.status_code == 200
    assert second.data["id"] != first["id"]
    assert not old_folder.exists()
    assert not PhotoFileDeletion.objects.exists()
    assert PlantImage.objects.count() == 1
    assert scene.client.get(first["url"]).status_code == 404
    stale = scene.upload(key=first_key, expected="none")
    assert stale.status_code == 409 and stale.data["code"] == "photo_conflict"
    assert scene.client.delete(scene.endpoint, {"expected_photo_id": first["id"]}, format="json").status_code == 409
    assert str(PlantImage.objects.get().pk) == second.data["id"]


def test_failed_database_replacement_keeps_old_photo_and_removes_uncommitted_files(scene):
    old = scene.upload().data
    original = PlantImage.objects.get()
    old_folder = directory_path(original.directory)
    with patch("plant_instances.photo_storage.PlantImage.objects.create", side_effect=RuntimeError("Database failure")):
        with pytest.raises(RuntimeError):
            replace_photo(user=scene.owner, plant_id=scene.plant.pk, upload=file(), upload_key=uuid.uuid4(), expected=old["id"])
    assert PlantImage.objects.get().pk == original.pk
    assert old_folder.is_dir()
    assert len(list((scene.root / "plants" / str(scene.plant.pk)).iterdir())) == 1
    assert not PhotoFileDeletion.objects.exists()


@pytest.mark.parametrize("delete_kind", ["photo", "plant", "account"])
def test_removal_and_cascades_delete_private_files(scene, delete_kind):
    photo = scene.upload().data
    directory = directory_path(PlantImage.objects.get().directory)
    with scene.capture(execute=True):
        if delete_kind == "photo":
            response = scene.client.delete(scene.endpoint, {"expected_photo_id": photo["id"]}, format="json")
        elif delete_kind == "plant":
            response = scene.client.delete(reverse("plant-instance-detail", kwargs={"pk": scene.plant.pk}))
        else:
            response = scene.client.delete(reverse("delete-account"), {"current_password": "photo-password"}, format="json")
    assert response.status_code in (200, 204), getattr(response, "data", None)
    assert not PlantImage.objects.exists() and not directory.exists()
    assert not PhotoFileDeletion.objects.exists()


def test_cleanup_failure_is_durable_and_retried_without_deleting_live_image(scene):
    first = scene.upload().data
    original = PlantImage.objects.get()
    directory = directory_path(original.directory)
    with patch("plant_instances.photo_storage.shutil.rmtree", side_effect=OSError("Filesystem busy")):
        assert scene.upload(image_bytes(color="blue"), expected=first["id"]).status_code == 200
    assert directory.exists()
    row = PhotoFileDeletion.objects.get()
    assert row.attempts == 1
    row.next_attempt_at = timezone.now() - timedelta(seconds=1)
    row.save(update_fields=["next_attempt_at"])
    assert cleanup_deleted_files() == 1 and not directory.exists()
    current = PlantImage.objects.get()
    PhotoFileDeletion.objects.create(directory=current.directory)
    assert cleanup_deleted_files() == 0
    assert directory_path(current.directory).is_dir()


def test_orphan_cleanup_requires_age_and_never_deletes_referenced_or_outside_paths(scene):
    scene.upload()
    base = scene.root / "plants" / str(scene.plant.pk)
    old = base / uuid.uuid4().hex
    fresh = base / uuid.uuid4().hex
    old.mkdir(); fresh.mkdir()
    old_time = timezone.now().timestamp() - 25 * 60 * 60
    os.utime(old, (old_time, old_time))
    assert queue_orphaned_files() == 1
    assert cleanup_deleted_files() == 1
    assert not old.exists() and fresh.exists()
    assert directory_path(PlantImage.objects.get().directory).exists()
    with pytest.raises(ValueError):
        directory_path("../public/anything")


@pytest.mark.parametrize("limit", ["PLANT_PHOTO_ACCOUNT_QUOTA_BYTES", "PLANT_PHOTO_GLOBAL_QUOTA_BYTES"])
def test_quota_rejects_new_files_without_touching_existing_photo(scene, settings, limit):
    photo = scene.upload().data
    setattr(settings, limit, 1)
    response = scene.upload(image_bytes(color="red"), expected=photo["id"])
    assert response.status_code == 413 and response.data["code"] == "photo_quota_exceeded"
    assert str(PlantImage.objects.get().pk) == photo["id"]
    assert len(list((scene.root / "plants" / str(scene.plant.pk)).iterdir())) == 1


def test_low_disk_and_missing_production_mount_reject_upload(scene, settings):
    with patch("plant_instances.photo_storage.shutil.disk_usage", return_value=SimpleNamespace(free=0)):
        assert scene.upload().status_code == 503
    settings.PRIVATE_MEDIA_REQUIRE_MOUNT = True
    with patch("plant_instances.photo_storage.os.path.ismount", return_value=False):
        response = scene.upload()
    assert response.status_code == 503 and response.data["code"] == "photo_storage_unavailable"
    assert not PlantImage.objects.exists()


@pytest.mark.parametrize("data", [b"not-an-image", b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"])
def test_nonimages_and_svg_are_rejected(scene, data):
    response = scene.upload(data)
    assert response.status_code == 400 and response.data["code"] == "invalid_photo"
    assert not PlantImage.objects.exists()


def test_uploaded_type_is_decoded_rather_than_trusting_filename_or_content_type(scene):
    response = scene.client.put(scene.endpoint, {"photo": file(image_bytes(fmt="PNG"), name="payload.txt", content_type="text/plain"),
        "upload_key": str(uuid.uuid4()), "expected_photo_id": "none"}, format="multipart")
    assert response.status_code == 200
    assert not list(scene.root.rglob("*.txt"))


def test_photo_id_cannot_be_rebound_to_another_visible_plant_or_arbitrary_path(scene):
    photo = scene.upload().data
    other = PlantInstance.objects.create(user=scene.owner, location=scene.plant.location, display_name="Other plant")
    wrong_plant_url = reverse("plant-photo-file", kwargs={"plant_id": other.pk, "photo_id": photo["id"]})
    assert scene.client.get(wrong_plant_url).status_code == 404
    assert scene.client.get(photo["url"] + "?variant=../../display").status_code == 400


def test_invalid_or_timed_out_replacement_keeps_the_previous_image(scene):
    photo = scene.upload().data
    first = PlantImage.objects.get()
    original_bytes = (directory_path(first.directory) / "display.jpg").read_bytes()
    assert scene.upload(b"corrupt", expected=photo["id"]).status_code == 400
    with patch("plant_instances.photo_storage.subprocess.run", side_effect=subprocess.TimeoutExpired("image-worker", 12)):
        response = scene.upload(expected=photo["id"])
    assert response.status_code == 400 and response.data["code"] == "invalid_photo"
    assert str(PlantImage.objects.get().pk) == photo["id"]
    assert (directory_path(first.directory) / "display.jpg").read_bytes() == original_bytes


def test_public_media_cannot_be_selected_as_private_storage(scene, settings):
    settings.PRIVATE_MEDIA_ROOT = Path(settings.MEDIA_ROOT) / "private"
    assert scene.upload().status_code == 503
    assert not PlantImage.objects.exists()


def test_rollback_of_removal_does_not_delete_the_files_or_leave_cleanup_work(scene):
    photo = scene.upload().data
    current = PlantImage.objects.get()
    folder = directory_path(current.directory)
    with pytest.raises(RuntimeError):
        with transaction.atomic():
            current.delete()
            raise RuntimeError("Rollback")
    assert PlantImage.objects.filter(pk=photo["id"]).exists()
    assert folder.exists() and not PhotoFileDeletion.objects.exists()


def test_upload_stream_size_limit_rejects_oversized_files(scene, settings):
    settings.PLANT_PHOTO_MAX_UPLOAD_BYTES = 64
    response = scene.upload()
    assert response.status_code == 413 and response.data["code"] == "upload_too_large"
    assert not PlantImage.objects.exists()


def test_orientation_is_applied_before_metadata_is_removed():
    exif = Image.Exif()
    exif[274] = 6
    exif[270] = "Private caption"
    normalized = normalize(image_bytes((120, 80), exif=exif))
    assert (normalized["width"], normalized["height"]) == (80, 120)
    for key in ("display", "thumbnail"):
        with Image.open(BytesIO(normalized[key])) as result:
            assert result.format == "JPEG" and not result.getexif()


def test_oversized_dimensions_are_rejected_before_decoding():
    with patch("plant_instances.photo_processing.MAX_PIXELS", 100):
        with pytest.raises(ValueError):
            normalize(image_bytes((11, 10), fmt="PNG"))


def test_animated_png_is_not_accepted():
    output = BytesIO()
    Image.new("RGB", (10, 10), "red").save(output, format="PNG", save_all=True,
        append_images=[Image.new("RGB", (10, 10), "blue")], duration=100)
    with pytest.raises(ValueError):
        normalize(output.getvalue())
