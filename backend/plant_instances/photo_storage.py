"""Private storage, admission checks and durable cleanup for plant photographs."""
import base64
from datetime import timedelta
import json
import logging
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import F, Sum
from django.http import Http404
from django.utils import timezone

from .models import PlantImage, PlantInstance, PhotoFileDeletion, PhotoStorageLock
from .photo_errors import PhotoError

logger = logging.getLogger(__name__)
DIRECTORY_PATTERN = re.compile(r"plants/[1-9][0-9]*/[0-9a-f]{32}\Z")


def private_root():
    root = Path(settings.PRIVATE_MEDIA_ROOT).resolve()
    public = Path(settings.MEDIA_ROOT).resolve()
    if root == public or root.is_relative_to(public) or public.is_relative_to(root):
        raise ImproperlyConfigured("Private photo storage must be separate from public media.")
    if settings.PRIVATE_MEDIA_REQUIRE_MOUNT:
        mounted = os.path.ismount(root)
        mountinfo = Path("/proc/self/mountinfo")
        if not mounted and mountinfo.is_file():
            mounted = any(line.split()[4].replace("\\040", " ") == str(root)
                          for line in mountinfo.read_text(encoding="utf-8").splitlines() if len(line.split()) > 4)
        if not mounted:
            raise PhotoError("photo_storage_unavailable", "Persistent photo storage is not mounted.", 503)
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    if os.name == "posix":
        root.chmod(0o700)
    return root


def directory_path(directory):
    if not DIRECTORY_PATTERN.fullmatch(directory):
        raise ValueError("Invalid private image storage key.")
    root = private_root()
    path = (root / directory).resolve()
    if path == root or not path.is_relative_to(root):
        raise ValueError("Private image path is outside its storage root.")
    return path


def photo_metadata(plant, request=None):
    image = next((image for image in plant.images.all() if image.purpose == "cover"), None)
    if image is None:
        return None
    return image_metadata(image)


def image_metadata(image):
    """The same authenticated photo contract for covers and journal entries."""
    url = f"/plant-instances/{image.plant_id}/photo/{image.pk}/"
    return {"id": str(image.pk), "url": url, "thumbnail_url": url + "?variant=thumbnail",
            "width": image.width, "height": image.height, "byte_size": image.byte_size,
            "framing": image_framing(image), "framing_revision": image.framing_revision,
            "created_at": image.created_at.isoformat()}


def image_framing(image):
    return {"focal_x": image.focal_x, "focal_y": image.focal_y, "zoom": image.zoom}


def normalize_framing(value):
    """Validate coordinates rather than silently clamping a corrupt crop."""
    if isinstance(value, str):
        try:
            if len(value) > 1024:
                raise ValueError("Framing is too large.")
            value = json.loads(value)
        except (ValueError, TypeError):
            raise PhotoError("invalid_photo", "Invalid photo framing.")
    limits = {"focal_x": (0, 1), "focal_y": (0, 1), "zoom": (1, 4)}
    if not isinstance(value, dict) or set(value) != set(limits):
        raise PhotoError("invalid_photo", "Photo framing requires focal_x, focal_y and zoom.")
    result = {}
    for name, (minimum, maximum) in limits.items():
        number = value[name]
        try:
            valid = type(number) in (int, float) and math.isfinite(number) and minimum <= number <= maximum
        except (OverflowError, TypeError):
            valid = False
        if not valid:
            raise PhotoError("invalid_photo", "Photo framing is outside its allowed range.")
        result[name] = float(number)
    return result


def _normalize_upload(upload):
    limit = min(settings.PLANT_PHOTO_MAX_UPLOAD_BYTES, 5 * 1024 * 1024)
    if upload.size > limit:
        raise PhotoError("upload_too_large", "Photos must be no larger than 5 MB.", 413)
    pieces, total = [], 0
    for piece in upload.chunks():
        total += len(piece)
        if total > limit:
            raise PhotoError("upload_too_large", "Photos must be no larger than 5 MB.", 413)
        pieces.append(piece)
    try:
        result = subprocess.run([sys.executable, "-m", "plant_instances.photo_processing"],
            input=b"".join(pieces), stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            cwd=str(Path(__file__).resolve().parent.parent), timeout=12, check=False)
        if result.returncode:
            raise ValueError("Invalid image.")
        data = json.loads(result.stdout)
        display = base64.b64decode(data["display"], validate=True)
        thumbnail = base64.b64decode(data["thumbnail"], validate=True)
        if len(display) > 300 * 1024 or len(thumbnail) > 40 * 1024:
            raise ValueError("Invalid output size.")
        return {"display": display, "thumbnail": thumbnail,
                "width": int(data["width"]), "height": int(data["height"])}
    except (ValueError, KeyError, OSError, subprocess.TimeoutExpired) as error:
        raise PhotoError("invalid_photo", "Choose a valid JPEG or PNG photo up to 20 megapixels.") from error


def _expected_matches(current, expected):
    if expected is None:
        return
    actual = str(current.pk) if current else "none"
    if expected != actual:
        raise PhotoError("photo_conflict", "The plant photo changed. Reload before saving.", 409)


def _expected_framing_matches(current, expected):
    if expected is not None and (current is None or current.framing_revision != expected):
        raise PhotoError("photo_conflict", "The photo framing changed. Reload before saving.", 409)


def _lock_owner_plant(user, plant_id):
    # Global quota, then user, then plant is one consistent lock order.
    PhotoStorageLock.objects.get_or_create(pk=1)
    PhotoStorageLock.objects.select_for_update().get(pk=1)
    owner = get_user_model().objects.select_for_update().filter(pk=user.pk, is_active=True).first()
    if owner is None:
        raise Http404
    plant = PlantInstance.objects.select_for_update().filter(pk=plant_id, user=owner).first()
    if plant is None:
        raise Http404
    return plant


def _check_capacity(plant, current, size):
    previous_size = current.byte_size if current else 0
    all_images = PlantImage.objects.all()
    owner_size = all_images.filter(plant__user_id=plant.user_id).aggregate(total=Sum("byte_size"))["total"] or 0
    global_size = all_images.aggregate(total=Sum("byte_size"))["total"] or 0
    if (owner_size - previous_size + size > settings.PLANT_PHOTO_ACCOUNT_QUOTA_BYTES
            or global_size - previous_size + size > settings.PLANT_PHOTO_GLOBAL_QUOTA_BYTES):
        raise PhotoError("photo_quota_exceeded", "Photo storage limit reached.", 413)
    if shutil.disk_usage(private_root()).free - size < settings.PLANT_PHOTO_MIN_FREE_BYTES:
        raise PhotoError("photo_storage_unavailable", "Photo storage is temporarily unavailable.", 503)


def replace_photo(*, user, plant_id, upload, upload_key, expected=None, framing=None, expected_framing_revision=None):
    framing = normalize_framing(framing if framing is not None else {"focal_x": 0.5, "focal_y": 0.5, "zoom": 1})
    # A committed retry does not decode or write a second copy.
    existing = PlantImage.objects.filter(plant_id=plant_id, plant__user=user, purpose="cover").first()
    if existing and existing.upload_key == upload_key:
        return existing
    _expected_matches(existing, expected)
    _expected_framing_matches(existing, expected_framing_revision)
    image = _normalize_upload(upload)
    image_id = uuid.uuid4()
    directory = f"plants/{plant_id}/{image_id.hex}"
    written = None
    try:
        with transaction.atomic():
            plant = _lock_owner_plant(user, plant_id)
            current = PlantImage.objects.filter(plant=plant, purpose="cover").first()
            if current and current.upload_key == upload_key:
                return current
            _expected_matches(current, expected)
            _expected_framing_matches(current, expected_framing_revision)
            size = len(image["display"]) + len(image["thumbnail"])
            _check_capacity(plant, current, size)
            written = directory_path(directory)
            written.mkdir(parents=True, mode=0o700)
            for name in ("display", "thumbnail"):
                path = written / (name + ".jpg")
                with path.open("xb") as stream:
                    stream.write(image[name])
                path.chmod(0o600)
            if current:
                current.delete()
            stored = PlantImage.objects.create(id=image_id, plant=plant, upload_key=upload_key,
                directory=directory, width=image["width"], height=image["height"], byte_size=size, **framing)
            plant.save(update_fields=["updated_at"])
        return stored
    except Exception:
        if written is not None:
            try:
                # This UUID was never committed; no current image can refer to it.
                shutil.rmtree(directory_path(directory), ignore_errors=True)
            except (OSError, ValueError, PhotoError, ImproperlyConfigured):
                logger.exception("Failed to remove aborted private photo upload")
        raise


def update_photo_framing(*, user, plant_id, framing, expected, expected_framing_revision):
    framing = normalize_framing(framing)
    with transaction.atomic():
        plant = _lock_owner_plant(user, plant_id)
        current = PlantImage.objects.filter(plant=plant, purpose="cover").first()
        _expected_matches(current, expected)
        if current is None:
            raise Http404
        # A retry after a lost response can acknowledge the exact saved framing,
        # but may never replace a newer, different framing with stale coordinates.
        if image_framing(current) == framing:
            return current
        _expected_framing_matches(current, expected_framing_revision)
        current.focal_x, current.focal_y, current.zoom = (framing[name] for name in ("focal_x", "focal_y", "zoom"))
        current.framing_revision += 1
        current.save(update_fields=["focal_x", "focal_y", "zoom", "framing_revision"])
        plant.save(update_fields=["updated_at"])
        return current


def remove_photo(*, user, plant_id, expected=None, expected_framing_revision=None):
    with transaction.atomic():
        plant = _lock_owner_plant(user, plant_id)
        current = PlantImage.objects.filter(plant=plant, purpose="cover").first()
        _expected_matches(current, expected)
        _expected_framing_matches(current, expected_framing_revision)
        if current:
            current.delete()
            plant.save(update_fields=["updated_at"])


def queue_photo_deletion(directory):
    PhotoFileDeletion.objects.get_or_create(directory=directory)
    transaction.on_commit(lambda: cleanup_deleted_files(directory), robust=True)


def cleanup_deleted_files(directory=None):
    rows = PhotoFileDeletion.objects.filter(next_attempt_at__lte=timezone.now())
    if directory is not None:
        rows = rows.filter(directory=directory)
    deleted = 0
    for row in list(rows.order_by("pk")[:200]):
        try:
            if PlantImage.objects.filter(directory=row.directory).exists():
                # A current reference wins over any stale cleanup receipt.
                row.delete()
                continue
            path = directory_path(row.directory)
            if path.exists():
                shutil.rmtree(path)
            try:
                path.parent.rmdir()
            except OSError:
                pass
            row.delete()
            deleted += 1
        except (OSError, ValueError, PhotoError, ImproperlyConfigured):
            PhotoFileDeletion.objects.filter(pk=row.pk).update(attempts=F("attempts") + 1,
                next_attempt_at=timezone.now() + timedelta(minutes=15), last_error="Filesystem cleanup failed.")
            logger.exception("Private photo cleanup failed: receipt=%s", row.pk)
    return deleted


def queue_orphaned_files():
    parent = private_root() / "plants"
    cutoff = timezone.now().timestamp() - 24 * 60 * 60
    queued = 0
    if not parent.is_dir():
        return 0
    for folder in parent.glob("*/*"):
        try:
            relative = folder.relative_to(private_root()).as_posix()
            if not DIRECTORY_PATTERN.fullmatch(relative) or not folder.is_dir() or folder.stat().st_mtime >= cutoff:
                continue
            if not PlantImage.objects.filter(directory=relative).exists():
                _, created = PhotoFileDeletion.objects.get_or_create(directory=relative)
                queued += int(created)
        except OSError:
            logger.exception("Failed to inspect orphaned private image directory")
    return queued
