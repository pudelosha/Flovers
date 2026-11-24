"""Resolve IoT credentials before assigning an authenticated device rate limit."""
from collections.abc import Mapping
from contextlib import nullcontext
from functools import wraps

from django.db import transaction

from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import AccountSecret, ReadingDevice


def device_request_atomic(view):
    """Keep device-scoped auth and execution in one transaction, before DRF throttles.

    Legacy malformed unauthenticated requests retain their no-database validation path.
    New credentials are header-only, avoiding tokens in query strings and form logs.
    """
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        context = transaction.atomic() if request.headers.get("X-Flovers-Device-Token") is not None else nullcontext()
        with context:
            return view(request, *args, **kwargs)
    return wrapped


def resolve_device(request):
    cached = getattr(request, "_authenticated_reading_device", None)
    if cached is not None:
        return cached
    data = request.query_params if request.method == "GET" else request.data
    if not isinstance(data, Mapping):
        raise ValidationError({"detail": "A JSON object is required."})
    # Explicit device credentials always take precedence, including malformed/empty ones.
    # Never downgrade a failed device authentication to account-wide legacy auth.
    header = request.headers.get("X-Flovers-Device-Token")
    if header is not None or "device_token" in data:
        from .provisioning import authenticate_token
        if request.method == "GET" and "device_token" in data:
            raise ValidationError("Send device credentials in the header, not query parameters.")
        if header is None:
            raise PermissionDenied("Send device credentials in X-Flovers-Device-Token.")
        token = header if header is not None else data.get("device_token")
        if header is not None and "device_token" in data and header != data["device_token"]:
            raise PermissionDenied("Conflicting device credentials.")
        device = authenticate_token(request, token)
        if (("device_key" in data and data["device_key"] != device.device_key) or
                ("device_id" in data and str(data["device_id"]) != str(device.pk))):
            raise PermissionDenied("Credential does not belong to this device.")
        request._authenticated_reading_device = device
        return device
    secret = data.get("secret")
    key = data.get("device_key")
    if not secret or not key:
        raise ValidationError({"detail": "device_key and secret are required"})
    if not isinstance(secret, str) or not isinstance(key, str) or len(secret) > 64 or len(key) > 16:
        raise PermissionDenied("invalid credentials")
    account = AccountSecret.objects.select_related("user").filter(
        secret=secret, user__is_active=True,
    ).first()
    if account is None:
        raise PermissionDenied("invalid credentials")
    filters = {"device_key": key, "user_id": account.user_id, "plant__user_id": account.user_id}
    identifier = data.get("device_id")
    if identifier is not None:
        try:
            if isinstance(identifier, bool) or str(int(identifier)) != str(identifier) or int(identifier) <= 0:
                raise ValueError
            filters["pk"] = int(identifier)
        except (TypeError, ValueError, OverflowError):
            raise ValidationError({"detail": "device_id must be a positive integer."})
    device = ReadingDevice.objects.filter(**filters).first()
    if device is None:
        raise NotFound()
    if not device.is_active:
        raise PermissionDenied("device disabled")
    # Once claimed, factory-managed hardware must not be controlled with account secrets.
    if hasattr(device, "physical_device"):
        raise PermissionDenied("A device-scoped credential is required.")
    request._authenticated_reading_device = device
    return device
