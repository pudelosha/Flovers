"""Owner control plane and authenticated hardware control plane."""
import base64
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from .device_auth import resolve_device
from .models import DevicePairingSession, PhysicalDevice, PumpTask
from .provisioning import (
    Conflict, complete_pairing, config_digest, owned_device, physical_status, proof_message, runtime_config, start_pairing,
)


class PairingOwnerThrottle(UserRateThrottle):
    rate = "30/hour"
    scope = "iot_pair_owner"


class BootstrapThrottle(AnonRateThrottle):
    rate = "60/hour"
    scope = "iot_bootstrap"


class PairingStatusThrottle(UserRateThrottle):
    # Read/cancel polling must not consume the much smaller session-creation budget.
    rate = "120/minute"
    scope = "iot_pair_status"


class DeviceControlThrottle(AnonRateThrottle):
    rate = "120/minute"
    scope = "iot_device_control"


class StartSerializer(serializers.Serializer):
    device_id = serializers.IntegerField(min_value=1)
    hardware_id = serializers.RegexField(r"^[A-Za-z0-9_-]{8,64}$")
    replaces_hardware_id = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")


class CompleteSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    claim = serializers.CharField(min_length=40, max_length=64, trim_whitespace=False)
    signature = serializers.CharField(min_length=80, max_length=100, trim_whitespace=False)


class AcknowledgeSerializer(serializers.Serializer):
    version = serializers.IntegerField(min_value=1)
    config_digest = serializers.RegexField(r"^[0-9a-f]{64}$")
    applied = serializers.BooleanField()
    # Codes only: never persist arbitrary error strings containing Wi-Fi passwords.
    error_code = serializers.ChoiceField(choices=["invalid_config", "storage_failed", "unsupported"], required=False)
    firmware_version = serializers.RegexField(r"^[A-Za-z0-9._+-]{1,64}$", required=False)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([PairingOwnerThrottle])
def pairing_start(request):
    payload = StartSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    session, claim = start_pairing(request.user, **payload.validated_data)
    response = Response({"session_id": session.pk, "claim": claim, "challenge": session.challenge,
                         "proof_payload": base64.b64encode(proof_message(session, claim)).decode("ascii"),
                         "expires_at": session.expires_at, "protocol": "flovers-pair-v1"}, status=201)
    response["Cache-Control"] = "no-store"
    return response


@transaction.atomic
@api_view(["GET", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([PairingStatusThrottle])
def pairing_status(request, session_id):
    session = DevicePairingSession.objects.filter(pk=session_id, user=request.user).first()
    if session is None:
        raise NotFound()
    device = owned_device(request.user, session.device_id, lock=True)
    session.refresh_from_db()
    if request.method == "DELETE":
        if session.status != "pending":
            raise Conflict("Pairing already completed; explicitly revoke the device credential instead.")
        session.status = "cancelled"
        session.save(update_fields=["status"])
    return Response({"session_id": session.pk,
                     "status": "expired" if session.status == "pending" and session.expires_at <= timezone.now() else session.status,
                     "expires_at": session.expires_at, "device": physical_status(device)})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([BootstrapThrottle])
def pairing_complete(request):
    payload = CompleteSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    response = Response(complete_pairing(**payload.validated_data), status=201)
    response["Cache-Control"] = "no-store"
    return response


def authenticated_hardware(request):
    request._allow_disabled_device_configuration = True
    device = resolve_device(request)
    physical = getattr(request, "_authenticated_physical_device", None)
    if physical is None:
        raise PermissionDenied("A device-scoped credential is required.")
    return device, physical


@transaction.atomic
@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([DeviceControlThrottle])
def configuration(request):
    device, _ = authenticated_hardware(request)
    response = Response({"configuration": runtime_config(device), "config_digest": config_digest(device)})
    response["Cache-Control"] = "no-store"
    return response


@transaction.atomic
@api_view(["POST"])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
@throttle_classes([DeviceControlThrottle])
def configuration_ack(request):
    device, physical = authenticated_hardware(request)
    payload = AcknowledgeSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    data = payload.validated_data
    if data["version"] != device.desired_config_version or data["config_digest"] != config_digest(device):
        raise Conflict("Configuration changed; fetch the current version before acknowledging.")
    if data["applied"]:
        physical.applied_config_version = data["version"]
        physical.config_error = ""
        physical.last_config_sync_at = timezone.now()
    else:
        if "error_code" not in data:
            raise ValidationError({"error_code": "Required for rejected configuration."})
        physical.config_error = data["error_code"]
        physical.config_error_version = data["version"]
    physical.firmware_version = data.get("firmware_version", physical.firmware_version)
    physical.save(update_fields=["applied_config_version", "config_error", "config_error_version", "last_config_sync_at", "firmware_version"])
    return Response({"status": "applied" if data["applied"] else "rejected", "version": data["version"]})


@transaction.atomic
@api_view(["GET", "DELETE"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([PairingOwnerThrottle])
def device_identity(request, device_id):
    device = owned_device(request.user, device_id, lock=True)
    if request.method == "DELETE":
        physical = PhysicalDevice.objects.select_for_update().filter(logical_device=device).first()
        if physical:
            now = timezone.now()
            physical.credentials.filter(revoked_at__isnull=True).update(revoked_at=now)
            physical.binding_generation += 1
            physical.logical_device = None
            physical.save(update_fields=["binding_generation", "logical_device"])
            DevicePairingSession.objects.filter(device=device, status__in=["pending", "bound", "confirmed"]).update(status="cancelled")
            PumpTask.objects.filter(device=device, status__in=["pending", "delivered"]).update(status="cancelled", cancelled_at=now, updated_at=now)
            device.automatic_pump_launch = False
            device.desired_config_version += 1
            device.save(update_fields=["automatic_pump_launch", "desired_config_version", "updated_at"])
    return Response(physical_status(device))
