from urllib.parse import urlencode

from django.conf import settings
from django.utils.dateparse import parse_datetime
from django.utils import timezone


def parse_ts_or_now(value):
    if not value:
        return timezone.now()
    dt = parse_datetime(value)
    return dt if dt is not None else timezone.now()


def _deeplink_base() -> str:
    scheme = getattr(settings, "DEEP_LINK_SCHEME", "flovers").strip()
    host = (getattr(settings, "DEEP_LINK_HOST", "") or "").strip().strip("/")
    return f"{scheme}://{host}" if host else f"{scheme}://"


def build_mobile_deeplink(path: str, params: dict) -> str:
    """
    Return a custom-scheme deep link. If a host is set, include a slash before path.
    Examples:
      host empty  -> flovers://readings
      host 'app'  -> flovers://app/readings
    """
    base = _deeplink_base()
    qs = urlencode(params)
    if base.endswith("://"):
        return f"{base}{path}?{qs}" if qs else f"{base}{path}"
    return f"{base}/{path}?{qs}" if qs else f"{base}/{path}"


def build_web_fallback(path: str, params: dict) -> str:
    web_base = getattr(settings, "PUBLIC_WEB_BASE", settings.SITE_URL).rstrip("/")
    qs = urlencode(params)
    return f"{web_base}/api/readings/open/{path}/?{qs}" if qs else f"{web_base}/api/readings/open/{path}/"


def build_readings_link() -> str:
    """
    Return an HTTPS fallback URL that redirects to the mobile app Readings screen.
    Examples:
      https://.../api/readings/open/readings/
    """
    if getattr(settings, "DEEP_LINK_ENABLED", True):
        return build_web_fallback("readings", {})
    return build_mobile_deeplink("readings", {})