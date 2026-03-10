from django.conf import settings


def _deeplink_base() -> str:
    scheme = getattr(settings, "DEEP_LINK_SCHEME", "flovers").strip()
    host = (getattr(settings, "DEEP_LINK_HOST", "") or "").strip().strip("/")
    return f"{scheme}://{host}" if host else f"{scheme}://"


def build_reminders_link() -> str:
    """
    Return a deep link that opens the mobile app on its Home screen.
    Examples:
      host empty  -> flovers://home
      host 'app'  -> flovers://app/home
    """
    base = _deeplink_base()
    if base.endswith("://"):
        return f"{base}home"
    return f"{base}/home"