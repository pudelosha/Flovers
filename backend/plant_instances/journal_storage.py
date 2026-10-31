"""Owner-only journal admission and mutations using the private photo store."""
from datetime import timedelta
import logging
import shutil
import uuid

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.http import Http404
from django.utils import timezone

from .models import JournalPhotoEntry, JournalPhotoUpload, PlantImage
from .photo_errors import PhotoError
from .photo_storage import (
    _check_capacity, _lock_owner_plant, _normalize_upload, directory_path,
    image_framing, normalize_framing,
)

logger = logging.getLogger(__name__)
JOURNAL_PHOTO_INTERVAL = timedelta(hours=168)
DEFAULT_FRAMING = {"focal_x": 0.5, "focal_y": 0.5, "zoom": 1}


def next_photo_at(plant):
    return plant.last_journal_photo_at + JOURNAL_PHOTO_INTERVAL if plant.last_journal_photo_at else None


def _conflict(message="The journal photo changed. Reload before saving."):
    return PhotoError("photo_conflict", message, 409)


def _receipt(user, upload_key, plant_id, operation, entry_id=None):
    receipt = JournalPhotoUpload.objects.filter(user=user, upload_key=upload_key).first()
    if receipt is None:
        return None
    if (receipt.plant_id_snapshot != int(plant_id) or receipt.operation != operation or
            (entry_id is not None and receipt.entry_id is not None and str(receipt.entry_id) != str(entry_id))):
        raise _conflict("This upload key belongs to another journal operation.")
    if receipt.entry_id is None:
        raise PhotoError("journal_photo_deleted", "This journal photo was deleted. Start a new upload.", 410)
    entry = JournalPhotoEntry.objects.select_related("plant__user", "plant__location", "plant__plant_definition", "image").filter(pk=receipt.entry_id).first()
    if entry is None:
        # Deletion may commit between reading the receipt and reading its entry.
        raise PhotoError("journal_photo_deleted", "This journal photo was deleted. Start a new upload.", 410)
    return entry


def _discard(directory):
    if directory is None:
        return
    try:
        shutil.rmtree(directory_path(directory), ignore_errors=True)
    except (OSError, ValueError, PhotoError, ImproperlyConfigured):
        logger.exception("Failed to remove aborted journal photo upload")


def _write(plant, entry, processed, upload_key, framing):
    image_id = uuid.uuid4()
    directory = f"plants/{plant.pk}/{image_id.hex}"
    try:
        folder = directory_path(directory)
        folder.mkdir(parents=True, mode=0o700)
        for name in ("display", "thumbnail"):
            path = folder / (name + ".jpg")
            with path.open("xb") as stream:
                stream.write(processed[name])
            path.chmod(0o600)
        image = PlantImage.objects.create(id=image_id, plant=plant, journal_entry=entry, purpose="journal",
            upload_key=upload_key, directory=directory, width=processed["width"], height=processed["height"],
            byte_size=len(processed["display"]) + len(processed["thumbnail"]), **framing)
        return image
    except Exception:
        _discard(directory)
        raise


def create_entry(*, user, plant_id, upload, upload_key, notes="", taken_on=None, framing=None):
    framing = normalize_framing(framing if framing is not None else DEFAULT_FRAMING)
    replay = _receipt(user, upload_key, plant_id, "create")
    if replay is not None:
        return replay, False
    # Decode outside locks, then repeat every authorization/admission check under locks.
    processed = _normalize_upload(upload)
    written = None
    try:
        with transaction.atomic():
            plant = _lock_owner_plant(user, plant_id)
            replay = _receipt(user, upload_key, plant_id, "create")
            if replay is not None:
                return replay, False
            now = timezone.now()
            next_at = next_photo_at(plant)
            if next_at is not None and now < next_at:
                error = PhotoError("journal_photo_cooldown", "You can add one journal photo per plant every 7 days.", 429)
                error.detail["next_photo_at"] = next_at.isoformat()
                raise error
            _check_capacity(plant, None, len(processed["display"]) + len(processed["thumbnail"]))
            entry = JournalPhotoEntry.objects.create(plant=plant, notes=notes, taken_on=taken_on, created_at=now)
            image = _write(plant, entry, processed, upload_key, framing)
            written = image.directory
            JournalPhotoUpload.objects.create(user=user, upload_key=upload_key, entry=entry,
                plant_id_snapshot=plant.pk, operation="create")
            plant.last_journal_photo_at = now
            plant.save(update_fields=["last_journal_photo_at", "updated_at"])
        return entry, True
    except Exception:
        _discard(written)
        raise


def _locked_entry(user, entry_id, plant_id):
    plant = _lock_owner_plant(user, plant_id)
    entry = JournalPhotoEntry.objects.select_for_update().filter(pk=entry_id, plant=plant).first()
    if entry is None:
        raise Http404
    return plant, entry


def _check_revision(entry, expected_revision):
    if entry.revision != expected_revision:
        error = _conflict()
        error.detail["current_revision"] = entry.revision
        raise error


def _metadata(entry, metadata):
    for field in ("notes", "taken_on"):
        if field in metadata:
            setattr(entry, field, metadata[field])


def edit_entry(*, user, entry_id, plant_id, expected_revision, metadata, framing=None):
    with transaction.atomic():
        plant, entry = _locked_entry(user, entry_id, plant_id)
        _check_revision(entry, expected_revision)
        _metadata(entry, metadata)
        if framing is not None:
            framing = normalize_framing(framing)
            image = entry.image
            if image_framing(image) != framing:
                image.focal_x, image.focal_y, image.zoom = (framing[name] for name in ("focal_x", "focal_y", "zoom"))
                image.framing_revision += 1
                image.save(update_fields=["focal_x", "focal_y", "zoom", "framing_revision"])
        entry.revision += 1
        entry.save(update_fields=["notes", "taken_on", "revision", "updated_at"])
        plant.save(update_fields=["updated_at"])
        return entry


def replace_entry_photo(*, user, entry_id, plant_id, upload, upload_key, expected_revision, metadata, framing=None):
    replay = _receipt(user, upload_key, plant_id, "replace", entry_id)
    if replay is not None:
        return replay
    framing = normalize_framing(framing if framing is not None else DEFAULT_FRAMING)
    processed = _normalize_upload(upload)
    written = None
    try:
        with transaction.atomic():
            plant, entry = _locked_entry(user, entry_id, plant_id)
            replay = _receipt(user, upload_key, plant_id, "replace", entry_id)
            if replay is not None:
                return replay
            _check_revision(entry, expected_revision)
            current = entry.image
            _check_capacity(plant, current, len(processed["display"]) + len(processed["thumbnail"]))
            # The deletion signal queues old bytes, but only removes them after commit.
            current.delete()
            image = _write(plant, entry, processed, upload_key, framing)
            written = image.directory
            _metadata(entry, metadata)
            entry.revision += 1
            entry.save(update_fields=["notes", "taken_on", "revision", "updated_at"])
            JournalPhotoUpload.objects.create(user=user, upload_key=upload_key, entry=entry,
                plant_id_snapshot=plant.pk, operation="replace")
            plant.save(update_fields=["updated_at"])
        # The old reverse one-to-one may have been cached during replacement.
        entry._state.fields_cache.pop("image", None)
        return entry
    except Exception:
        _discard(written)
        raise


def delete_entry(*, user, entry_id, plant_id, expected_revision):
    with transaction.atomic():
        plant, entry = _locked_entry(user, entry_id, plant_id)
        _check_revision(entry, expected_revision)
        entry.delete()
        plant.save(update_fields=["updated_at"])
