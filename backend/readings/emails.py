from __future__ import annotations

from django.conf import settings

from core.emailing import send_templated_email
from core.i18n import t


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


def _safe_arduino_filename(device) -> str:
    device_id = getattr(device, "id", None) or "device"
    device_key = getattr(device, "device_key", None) or "flovers"

    return f"flovers-device-{device_id}-{device_key}.ino"


def send_device_code_email(*, user, device, code_text: str) -> bool:
    if not user.email:
        return False

    lang = _get_user_lang(user)

    intro_line1 = t(
        "readings.device_code.intro_line1",
        lang=lang,
        default='Here is the generated code for device "{device_name}".',
    ).format(device_name=device.device_name)

    intro_line2 = t(
        "readings.device_code.intro_line2",
        lang=lang,
        default="Before uploading it to your ESP32, fill in your WiFi SSID and password in the code.",
    )

    return send_templated_email(
        to_email=user.email,
        subject_key="readings.device_code.subject",
        template_name="readings/device_code",
        lang=lang,
        context={
            "user": user,
            "device": device,
            "device_name": device.device_name,
            "plant_name": device.plant_name,
            "device_key": device.device_key,
            "code_text": code_text,
            "intro_line1": intro_line1,
            "intro_line2": intro_line2,
        },
        attachments=[
            {
                "filename": _safe_arduino_filename(device),
                "content": code_text.encode("utf-8"),
                "mimetype": "text/x-arduino",
            }
        ],
    )