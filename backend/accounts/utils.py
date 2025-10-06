# accounts/utils.py
from django.conf import settings
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from urllib.parse import urlencode

from .tokens import activation_token, reset_password_token

def _deeplink_base() -> str:
    scheme = getattr(settings, "DEEP_LINK_SCHEME", "flovers").strip()
    host = (getattr(settings, "DEEP_LINK_HOST", "") or "").strip().strip("/")
    # no trailing slash here; we keep '://' intact
    return f"{scheme}://{host}" if host else f"{scheme}://"

def build_mobile_deeplink(path: str, params: dict) -> str:
    """
    Return a custom-scheme deep link. If a host is set, include a slash before path.
    Examples:
      host empty  -> flovers://confirm-email?uid=...&token=...
      host 'app'  -> flovers://app/confirm-email?uid=...&token=...
    """
    base = _deeplink_base()
    qs = urlencode(params)
    if base.endswith("://"):
        return f"{base}{path}?{qs}"
    return f"{base}/{path}?{qs}"

def build_web_fallback(path: str, params: dict) -> str:
    web_base = getattr(settings, "PUBLIC_WEB_BASE", settings.SITE_URL).rstrip("/")
    qs = urlencode(params)
    return f"{web_base}/open/{path}/?{qs}"

def build_activation_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = activation_token.make_token(user)
    params = {"uid": uid, "token": token}
    if getattr(settings, "DEEP_LINK_ENABLED", True):
        return build_web_fallback("activate", params)
    return f"{settings.SITE_URL}/api/auth/activate/?{urlencode(params)}"

def build_password_reset_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = reset_password_token.make_token(user)
    params = {"uid": uid, "token": token}
    if getattr(settings, "DEEP_LINK_ENABLED", True):
        return build_web_fallback("reset-password", params)
    return f"{settings.SITE_URL}/api/auth/reset-password/?{urlencode(params)}"
