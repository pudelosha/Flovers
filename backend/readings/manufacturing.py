"""Public-only inventory operations shared by operator commands and Django Admin.

Private seeds and printable PoPs belong exclusively to the offline factory station.
"""
import base64
import csv
import hashlib
import io
import json
import re
import secrets
import uuid

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from .models import ManufacturingBatch, ManufacturingEvent, PhysicalDevice

PROFILE = "esp32-c3-flovers-v1"
PUBLIC_FIELDS = {"hardware_id", "bootstrap_public_key", "provisioning_pop_digest", "hardware_profile", "hardware_revision"}


def authorize(actor):
    # None denotes a trusted operating-system management command, not an HTTP caller.
    if actor is not None and not (actor.is_active and actor.is_staff and
            (actor.is_superuser or actor.has_perm("readings.operate_manufacturing"))):
        raise PermissionDenied("Manufacturing permission required.")


def validate_public_record(record):
    try:
        if not isinstance(record, dict) or set(record) != PUBLIC_FIELDS or not all(isinstance(v, str) for v in record.values()):
            raise ValueError()
        for key, limit in (("hardware_id", 64), ("hardware_profile", 64), ("hardware_revision", 32)):
            if not re.fullmatch(r"[A-Za-z0-9._-]{1," + str(limit) + r"}", record[key]):
                raise ValueError()
        if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", record["hardware_id"]):
            raise ValueError()
        if not re.fullmatch(r"[0-9a-f]{64}", record["provisioning_pop_digest"]):
            raise ValueError()
        raw = base64.b64decode(record["bootstrap_public_key"], validate=True)
        Ed25519PublicKey.from_public_bytes(raw)
        return {**record, "bootstrap_public_key": base64.b64encode(raw).decode("ascii")}
    except (ValueError, TypeError):
        raise ValidationError("Invalid public enrollment record.") from None


@transaction.atomic
def allocate_batch(*, code, operation_id, count, hardware_profile=PROFILE, hardware_revision="1", firmware_variant="sensors", notes="", actor=None):
    authorize(actor)
    if not isinstance(code, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", code):
        raise ValidationError("Batch code must contain 1–32 letters, digits, hyphens or underscores.")
    if hardware_profile != PROFILE or hardware_revision != "1" or firmware_variant not in {"sensors", "pump"}:
        raise ValidationError("Unsupported hardware profile, revision or firmware variant.")
    if not isinstance(count, int) or isinstance(count, bool) or not 1 <= count <= 1000 or len(notes) > 4000:
        raise ValidationError("Quantity must be 1–1000; notes must not exceed 4000 characters.")
    try:
        operation_id = uuid.UUID(str(operation_id))
    except ValueError:
        raise ValidationError("An explicit UUID operation ID is required.") from None
    values = dict(code=code, requested_quantity=count, hardware_profile=hardware_profile,
        hardware_revision=hardware_revision, firmware_variant=firmware_variant, notes=notes)
    try:
        with transaction.atomic():
            batch = ManufacturingBatch.objects.create(operation_id=operation_id, created_by=actor, **values)
    except IntegrityError:
        batch = ManufacturingBatch.objects.select_for_update().filter(operation_id=operation_id).first()
        if batch is None or any(getattr(batch, key) != value for key, value in values.items()):
            raise ValidationError("Batch or operation ID already used for a different request.") from None
        return batch
    PhysicalDevice.objects.bulk_create([
        PhysicalDevice(hardware_id="FL-" + secrets.token_hex(16).upper(), serial_number=f"{code}-{i:04d}",
            manufacturing_batch=batch, hardware_profile=hardware_profile, hardware_revision=hardware_revision)
        for i in range(1, count + 1)
    ])
    ManufacturingEvent.objects.create(batch=batch, action="batch_registered", actor=actor)
    return batch


def batch_manifest(batch):
    """This manifest is safe to transfer to a disconnected factory station."""
    return {"version": 1, "batch": batch.code, "hardware_profile": batch.hardware_profile,
        "hardware_revision": batch.hardware_revision, "firmware_variant": batch.firmware_variant,
        "devices": [{"hardware_id": d.hardware_id, "serial_number": d.serial_number}
                    for d in batch.devices.order_by("serial_number")]}


@transaction.atomic
def enroll_batch(manifest, *, actor=None):
    authorize(actor)
    if not isinstance(manifest, dict) or set(manifest) != {"version", "batch", "devices"} or manifest["version"] != 1:
        raise ValidationError("Invalid public batch enrollment manifest.")
    try:
        batch = ManufacturingBatch.objects.select_for_update(no_key=True).get(code=manifest["batch"])
    except ManufacturingBatch.DoesNotExist:
        raise ValidationError("Unknown manufacturing batch.") from None
    records = manifest["devices"]
    if not isinstance(records, list) or len(records) != batch.requested_quantity:
        raise ValidationError("Enrollment must contain the complete batch exactly once.")
    slots = {d.hardware_id: d for d in batch.devices.select_for_update()}
    seen = set()
    try:
        for item in records:
            if not isinstance(item, dict) or set(item) != PUBLIC_FIELDS | {"serial_number"}:
                raise ValidationError("Only public enrollment fields are accepted.")
            public = validate_public_record({k: v for k, v in item.items() if k != "serial_number"})
            d = slots.get(public["hardware_id"])
            if not d or d.hardware_id in seen or d.serial_number != item["serial_number"]:
                raise ValidationError("Enrollment does not match batch inventory.")
            seen.add(d.hardware_id)
            if public["hardware_profile"] != batch.hardware_profile or public["hardware_revision"] != batch.hardware_revision:
                raise ValidationError("Hardware profile mismatch.")
            if d.bootstrap_public_key:
                if any(getattr(d, k) != value for k, value in public.items()):
                    raise ValidationError("Enrolled identities cannot be replaced.")
                continue
            if d.manufacturing_status != "registered" or d.logical_device_id:
                raise ValidationError("Device is no longer available for enrollment.")
            for key, value in public.items():
                setattr(d, key, value)
            d.save(update_fields=list(PUBLIC_FIELDS))
            ManufacturingEvent.objects.create(batch=batch, device=d, action="identity_enrolled", actor=actor)
    except IntegrityError:
        raise ValidationError("Duplicate public key or provisioning identity; batch rejected.") from None
    return batch


def receipt_bytes(receipt):
    return json.dumps(receipt, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")


@transaction.atomic
def record_verification(receipt, *, actor=None):
    authorize(actor)
    required = {"version", "hardware_id", "serial_number", "firmware_variant", "firmware_sha256",
        "factory_nvs_sha256", "readback_verified", "verified_at", "receipt_id", "signature"}
    if not isinstance(receipt, dict) or set(receipt) != required:
        raise ValidationError("Invalid factory verification receipt.")
    try:
        d = PhysicalDevice.objects.select_for_update().select_related("manufacturing_batch").get(hardware_id=receipt["hardware_id"])
        unsigned = {k: v for k, v in receipt.items() if k != "signature"}
        if (receipt["version"] != 1 or receipt["readback_verified"] is not True or
                not d.manufacturing_batch or d.serial_number != receipt["serial_number"] or
                d.manufacturing_batch.firmware_variant != receipt["firmware_variant"]):
            raise ValueError()
        for key in ("firmware_sha256", "factory_nvs_sha256"):
            if not isinstance(receipt[key], str) or not re.fullmatch(r"[0-9a-f]{64}", receipt[key]):
                raise ValueError()
        uuid.UUID(receipt["receipt_id"])
        stamp = timezone.datetime.fromisoformat(receipt["verified_at"])
        if timezone.is_naive(stamp) or stamp > timezone.now() + timezone.timedelta(minutes=5):
            raise ValueError()
        Ed25519PublicKey.from_public_bytes(base64.b64decode(d.bootstrap_public_key, validate=True)).verify(
            base64.b64decode(receipt["signature"], validate=True), receipt_bytes(unsigned))
    except (PhysicalDevice.DoesNotExist, ValueError, TypeError, InvalidSignature):
        raise ValidationError("Factory receipt identity, signature or verification is invalid.") from None
    if d.factory_receipt == receipt:
        return d
    if d.manufacturing_status != "registered" or d.logical_device_id:
        raise ValidationError("Factory identity is already verified or in use.")
    d.programmed_at = stamp
    d.verified_at = stamp
    d.manufacturing_status = "verified"
    d.factory_receipt = receipt
    d.save(update_fields=["programmed_at", "verified_at", "manufacturing_status", "factory_receipt"])
    for action in ("programmed", "verified"):
        ManufacturingEvent.objects.create(batch=d.manufacturing_batch, device=d, action=action, actor=actor,
            detail=receipt["receipt_id"])
    return d


@transaction.atomic
def set_status(hardware_id, target, *, actor=None):
    authorize(actor)
    d = PhysicalDevice.objects.select_for_update().get(hardware_id=hardware_id)
    if not d.manufacturing_batch:
        raise ValidationError("Legacy enrollment is not managed by manufacturing.")
    if d.manufacturing_status == target:
        return d
    if target == "ready" and d.manufacturing_status == "verified" and d.factory_receipt:
        d.ready_at = timezone.now()
    elif target == "retired" and d.logical_device_id is None:
        d.disabled = True
    else:
        raise ValidationError("Invalid manufacturing transition; a bound device cannot be retired here.")
    d.manufacturing_status = target
    d.save(update_fields=["manufacturing_status", "disabled", "ready_at"])
    ManufacturingEvent.objects.create(batch=d.manufacturing_batch, device=d, action=target, actor=actor)
    return d


def inventory_rows(devices):
    for d in devices.select_related("manufacturing_batch", "logical_device").order_by("hardware_id"):
        active = d.credentials.filter(revoked_at__isnull=True).exists()
        sessions = d.devicepairingsession_set.filter(binding_generation=d.binding_generation)
        pending = sessions.filter(status="pending", expires_at__gt=timezone.now()).exists()
        confirmed = sessions.filter(status="confirmed").exists()
        if d.disabled:
            pairing = "revoked"
        elif d.logical_device_id and active:
            pairing = "paired" if confirmed else "pairing_in_progress"
        elif pending:
            pairing = "pairing_in_progress"
        elif d.logical_device_id:
            pairing = "revoked"
        else:
            pairing = "released" if d.credentials.exists() else "unclaimed"
        yield {"hardware_id": d.hardware_id, "serial_number": d.serial_number or "",
            "batch": d.manufacturing_batch.code if d.manufacturing_batch else "",
            "hardware_profile": d.hardware_profile, "hardware_revision": d.hardware_revision,
            "manufacturing_status": d.manufacturing_status,
            "pairing_status": pairing,
            "logical_device_id": d.logical_device_id, "firmware_version": d.firmware_version,
            "created_at": d.created_at.isoformat(),
            "programmed_at": d.programmed_at.isoformat() if d.programmed_at else "",
            "verified_at": d.verified_at.isoformat() if d.verified_at else "",
            "ready_at": d.ready_at.isoformat() if d.ready_at else "",
            "activated_at": d.activated_at.isoformat() if d.activated_at else "",
            "last_seen_at": d.last_seen_at.isoformat() if d.last_seen_at else ""}


def inventory_csv(devices):
    rows = list(inventory_rows(devices))
    output = io.StringIO(newline="")
    fields = list(rows[0]) if rows else ["hardware_id", "serial_number", "batch"]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for row in rows:
        # CSV is opened in spreadsheets; protect even legacy operator-provided metadata.
        writer.writerow({k: "'" + v if isinstance(v, str) and v.startswith(("=", "+", "-", "@", "\t", "\r")) else v for k, v in row.items()})
    return output.getvalue()
