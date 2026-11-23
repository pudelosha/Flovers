"""Device identity, atomic claims and versioned configuration; no pump execution."""
import base64
import hashlib
import json
import secrets
from datetime import timedelta

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError

from .models import DeviceCredential, DevicePairingSession, PhysicalDevice, PumpTask, ReadingDevice


class Conflict(APIException):
    status_code = 409
    default_detail = "Device state changed. Start a new pairing session."


RUNTIME_FIELDS = frozenset({
    "interval_minutes", "interval_hours", "pump_duration_seconds", "pump_cooldown_minutes",
    "pump_threshold_pct", "automatic_pump_launch", "pump_included", "sensors", "is_active", "plant",
})


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def runtime_config(device):
    return {
        "version": device.desired_config_version,
        "reading_interval_minutes": device.effective_interval_minutes,
        "pump_duration_seconds": device.pump_duration_seconds,
        "pump_cooldown_minutes": device.pump_cooldown_minutes,
        "pump_threshold_pct": device.pump_threshold_pct,
        "automatic_watering": device.automatic_pump_launch,
        "pump_included": device.pump_included,
        "sensors": device.sensors,
        "enabled": device.is_active,
        "plant_id": device.plant_id,
        "backend_pump_authorization_required": True,
        "offline_automatic_watering_allowed": False,
    }


def config_digest(device):
    return digest(json.dumps(runtime_config(device), sort_keys=True, separators=(",", ":")))


def owned_device(user, pk, *, lock=False):
    qs = ReadingDevice.objects
    if lock:
        qs = qs.select_for_update()
    try:
        return qs.get(pk=pk, user=user, plant__user=user)
    except ReadingDevice.DoesNotExist:
        raise NotFound()


def physical_status(device):
    physical = PhysicalDevice.objects.filter(logical_device=device).first()
    if physical is None:
        # Absence of factory identity is not evidence that an existing DIY board is unpaired.
        return {"pairing": "legacy-or-not-paired", "synchronization": "unknown"}
    active = physical.credentials.filter(revoked_at__isnull=True).exists() and not physical.disabled
    return {
        "pairing": "paired" if active else "revoked",
        "hardware_id": physical.hardware_id,
        "hardware_profile": physical.hardware_profile,
        "hardware_revision": physical.hardware_revision,
        "firmware_version": physical.firmware_version or None,
        "last_seen_at": physical.last_seen_at,
        "online": bool(physical.last_seen_at and physical.last_seen_at >= timezone.now() - timedelta(minutes=5)),
        "desired_config_version": device.desired_config_version,
        "applied_config_version": physical.applied_config_version,
        "synchronization": "rejected" if physical.config_error and physical.config_error_version == device.desired_config_version else (
            "applied" if physical.applied_config_version == device.desired_config_version else "pending"
        ),
        "config_error": physical.config_error if physical.config_error_version == device.desired_config_version else None,
        "last_config_sync_at": physical.last_config_sync_at,
    }


@transaction.atomic
def start_pairing(user, device_id, hardware_id, replaces_hardware_id=""):
    device = owned_device(user, device_id, lock=True)
    try:
        physical = PhysicalDevice.objects.select_for_update().get(hardware_id=hardware_id, disabled=False)
    except PhysicalDevice.DoesNotExist:
        raise NotFound()
    if physical.logical_device_id is not None:
        raise Conflict("Hardware is already bound; use Wi-Fi reconfiguration for network changes.")
    current = PhysicalDevice.objects.filter(logical_device=device).first()
    if (current.hardware_id if current else "") != replaces_hardware_id:
        raise Conflict("Explicit current hardware confirmation is required for replacement.")
    DevicePairingSession.objects.filter(device=device, status="pending").update(status="cancelled")
    claim = secrets.token_urlsafe(32)
    session = DevicePairingSession.objects.create(
        user=user, device=device, physical_device=physical, challenge=secrets.token_urlsafe(32),
        claim_digest=digest(claim), binding_generation=physical.binding_generation,
        replaces_hardware_id=replaces_hardware_id, expires_at=timezone.now() + timedelta(minutes=10),
    )
    # Short-lived local claim only, never an account secret or long-term device credential.
    return session, claim


def proof_message(session, claim):
    return json.dumps({
        "protocol": "flovers-pair-v1", "session_id": str(session.pk),
        "hardware_id": session.physical_device.hardware_id, "device_id": session.device_id,
        "generation": session.binding_generation, "challenge": session.challenge,
        "claim_digest": digest(claim),
    }, sort_keys=True, separators=(",", ":")).encode("utf-8")


@transaction.atomic
def complete_pairing(session_id, claim, signature):
    try:
        initial = DevicePairingSession.objects.get(pk=session_id)
    except (DevicePairingSession.DoesNotExist, ValueError):
        raise PermissionDenied("Invalid pairing proof.")
    try:
        device = ReadingDevice.objects.select_for_update().get(pk=initial.device_id)
        session = DevicePairingSession.objects.select_for_update().select_related("physical_device", "user").get(pk=initial.pk)
        physical = PhysicalDevice.objects.select_for_update().get(pk=session.physical_device_id)
    except (ReadingDevice.DoesNotExist, DevicePairingSession.DoesNotExist, PhysicalDevice.DoesNotExist):
        raise PermissionDenied("Invalid pairing proof.")
    if (session.status != "pending" or session.expires_at <= timezone.now() or
            not session.user.is_active or device.user_id != session.user_id or
            device.plant.user_id != session.user_id or not device.is_active or physical.disabled or
            physical.logical_device_id is not None or physical.binding_generation != session.binding_generation or
            not secrets.compare_digest(session.claim_digest, digest(claim))):
        raise PermissionDenied("Invalid or expired pairing proof.")
    try:
        Ed25519PublicKey.from_public_bytes(base64.b64decode(physical.bootstrap_public_key, validate=True)).verify(
            base64.b64decode(signature, validate=True), proof_message(session, claim),
        )
    except (InvalidSignature, ValueError, TypeError):
        raise PermissionDenied("Invalid pairing proof.")
    old = PhysicalDevice.objects.select_for_update().filter(logical_device=device).first()
    if (old.hardware_id if old else "") != session.replaces_hardware_id:
        raise Conflict()
    now = timezone.now()
    if old:
        DevicePairingSession.objects.filter(physical_device=old, status__in=["bound", "confirmed"]).update(status="cancelled")
        old.credentials.filter(revoked_at__isnull=True).update(revoked_at=now)
        old.logical_device = None
        old.binding_generation += 1
        old.save(update_fields=["logical_device", "binding_generation"])
    # Old pending/delivered commands cannot transfer to replacement hardware.
    PumpTask.objects.filter(device=device, status__in=["pending", "delivered"]).update(status="cancelled", cancelled_at=now, updated_at=now)
    # Preserve persistent cooldown reservations; pairing never enables automatic watering.
    device.automatic_pump_launch = False
    device.desired_config_version += 1
    device.save(update_fields=["automatic_pump_launch", "desired_config_version", "updated_at"])
    physical.logical_device = device
    physical.binding_generation += 1
    physical.applied_config_version = 0
    physical.config_error = ""
    physical.last_config_sync_at = None
    physical.save()
    token = secrets.token_urlsafe(48)
    physical.credentials.filter(revoked_at__isnull=True).update(revoked_at=now)
    DeviceCredential.objects.create(physical_device=physical, token_digest=digest(token), binding_generation=physical.binding_generation)
    session.status = "bound"
    session.save(update_fields=["status"])
    DevicePairingSession.objects.filter(physical_device=physical, status="pending").update(status="cancelled")
    return {"device_token": token, "device_key": device.device_key, "device_id": device.pk,
            "configuration": runtime_config(device), "config_digest": config_digest(device)}


def authenticate_token(request, token):
    if not isinstance(token, str) or not 32 <= len(token) <= 128:
        raise PermissionDenied("Invalid device credential.")
    # Endpoint transaction retains the logical-device lock through ingestion/pump authorization.
    credential = DeviceCredential.objects.select_related("physical_device").filter(token_digest=digest(token), revoked_at__isnull=True).first()
    if not credential or not credential.physical_device.logical_device_id:
        raise PermissionDenied("Invalid device credential.")
    try:
        device = ReadingDevice.objects.select_for_update().select_related("user", "plant").get(pk=credential.physical_device.logical_device_id)
        physical = PhysicalDevice.objects.select_for_update().get(pk=credential.physical_device_id)
        credential.refresh_from_db()
    except (ReadingDevice.DoesNotExist, PhysicalDevice.DoesNotExist, DeviceCredential.DoesNotExist):
        raise PermissionDenied("Invalid device credential.")
    if (credential.revoked_at or physical.disabled or physical.logical_device_id != device.pk or
            physical.binding_generation != credential.binding_generation or
            (not device.is_active and not getattr(request, "_allow_disabled_device_configuration", False)) or
            not device.user.is_active or device.plant.user_id != device.user_id):
        raise PermissionDenied("Invalid device credential.")
    physical.last_seen_at = timezone.now()
    physical.save(update_fields=["last_seen_at"])
    DevicePairingSession.objects.filter(physical_device=physical, device=device, status="bound").update(status="confirmed")
    request._authenticated_physical_device = physical
    return device
