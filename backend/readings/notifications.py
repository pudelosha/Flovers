from __future__ import annotations

import logging

from django.conf import settings

from core.emailing import send_templated_email
from core.i18n import t
from profiles.models import PushDevice
from profiles.push import send_fcm_multicast

from .models import ReadingDevice
from .utils import build_readings_link

logger = logging.getLogger(__name__)


def _format_metric(value) -> str:
    try:
        value_f = float(value)
    except (TypeError, ValueError):
        return str(value)

    if value_f.is_integer():
        return str(int(value_f))
    return f"{value_f:.2f}".rstrip("0").rstrip(".")


def _get_user_lang(user) -> str:
    default = getattr(settings, "EMAIL_DEFAULT_LANG", "en") or "en"
    try:
        ps = getattr(user, "profile_settings", None)
        if ps and getattr(ps, "language", None):
            lang = str(ps.language).strip().lower()
            supported = set(getattr(settings, "SUPPORTED_LANGS", [])) or {default}
            return lang if lang in supported else default
    except Exception:
        pass
    return default


def _get_android_tokens(user_id: int) -> list[str]:
    return list(
        PushDevice.objects.filter(
            user_id=user_id,
            is_active=True,
            platform=PushDevice.PLATFORM_ANDROID,
        ).values_list("token", flat=True)
    )


def _looks_unregistered(exc: Exception) -> bool:
    msg = str(exc).lower()
    return (
        "not registered" in msg
        or "unregistered" in msg
        or "registration-token-not-registered" in msg
        or "requested entity was not found" in msg
    )


def _send_push_and_deactivate_bad_tokens(tokens: list[str], title: str, body: str, data: dict[str, str]) -> int:
    tokens = [t for t in tokens if t]
    if not tokens:
        return 0

    try:
        resp = send_fcm_multicast(tokens=tokens, title=title, body=body, data=data)
    except Exception:
        logger.exception("FCM multicast send raised")
        return 0

    success_count = getattr(resp, "success_count", None)
    responses = getattr(resp, "responses", None)

    if success_count is None or responses is None:
        logger.warning("FCM multicast response missing expected attrs: %r", resp)
        return 0

    bad_tokens: list[str] = []
    for idx, r in enumerate(responses):
        ok = getattr(r, "success", False)
        exc = getattr(r, "exception", None)
        if not ok and exc and _looks_unregistered(exc):
            bad_tokens.append(tokens[idx])

    if bad_tokens:
        PushDevice.objects.filter(token__in=bad_tokens).update(is_active=False)

    return int(success_count)


def _send_moisture_alert_email(device: ReadingDevice, moisture_value: float) -> bool:
    if not device.send_email_notifications:
        return False

    user = device.user
    if not user.email:
        return False

    lang = _get_user_lang(user)
    link = build_readings_link()

    device_name = device.device_name or device.plant_name or f"Device #{device.pk}"
    threshold = _format_metric(device.moisture_alert_threshold)
    value = _format_metric(moisture_value)

    line1 = t(
        "readings.moisture_alert.line1",
        lang=lang,
        default="",
    ).format(
        device_name=device_name,
        value=value,
        threshold=threshold,
    )

    send_templated_email(
        to_email=user.email,
        subject_key="readings.moisture_alert.subject",
        template_name="readings/moisture_alert",
        lang=lang,
        context={
            "user": user,
            "device": device,
            "device_name": device_name,
            "plant_name": device.plant_name,
            "value": value,
            "threshold": threshold,
            "line1": line1,
            "link": link,
        },
    )
    return True


def _send_moisture_alert_push(device: ReadingDevice, moisture_value: float) -> int:
    if not device.send_push_notifications:
        return 0

    user = device.user
    lang = _get_user_lang(user)

    device_name = device.device_name or device.plant_name or f"Device #{device.pk}"
    threshold = _format_metric(device.moisture_alert_threshold)
    value = _format_metric(moisture_value)

    title = t(
        "readings.moisture_alert.push_title",
        lang=lang,
        default="Soil moisture alert",
    )

    body = t(
        "readings.moisture_alert.push_body",
        lang=lang,
        default="{device_name}: moisture {value} is below threshold {threshold}.",
    ).format(
        device_name=device_name,
        value=value,
        threshold=threshold,
    )

    tokens = _get_android_tokens(user.id)
    if not tokens:
        return 0

    return _send_push_and_deactivate_bad_tokens(
        tokens=tokens,
        title=title,
        body=body,
        data={
            "kind": "moisture_alert",
            "route": "Readings",
            "deviceId": str(device.id),
        },
    )


def send_moisture_alert_notifications(*, device_id: int, moisture_value: float) -> None:
    try:
        device = (
            ReadingDevice.objects
            .select_related("user")
            .get(id=device_id)
        )
    except ReadingDevice.DoesNotExist:
        logger.warning("Moisture alert notification skipped; device %s no longer exists", device_id)
        return

    try:
        _send_moisture_alert_email(device, moisture_value)
    except Exception:
        logger.exception("Failed to send moisture alert email for device=%s", device_id)

    try:
        _send_moisture_alert_push(device, moisture_value)
    except Exception:
        logger.exception("Failed to send moisture alert push for device=%s", device_id)