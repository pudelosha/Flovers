"""Resolve IoT credentials before assigning an authenticated device rate limit."""
from collections.abc import Mapping

from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import AccountSecret, ReadingDevice


def resolve_device(request):
    cached = getattr(request, "_authenticated_reading_device", None)
    if cached is not None:
        return cached
    data = request.query_params if request.method == "GET" else request.data
    if not isinstance(data, Mapping):
        raise ValidationError({"detail": "A JSON object is required."})
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
    request._authenticated_reading_device = device
    return device
