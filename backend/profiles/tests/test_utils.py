from django.test import override_settings

from profiles.utils import build_mobile_deeplink, build_reminders_link, build_web_fallback


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_build_mobile_deeplink_without_host():
    link = build_mobile_deeplink("home", {"source": "email"})

    assert link == "flovers://home?source=email"


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="app")
def test_build_mobile_deeplink_with_host():
    link = build_mobile_deeplink("home", {"source": "email"})

    assert link == "flovers://app/home?source=email"


@override_settings(PUBLIC_WEB_BASE="https://api.example.com")
def test_build_web_fallback_uses_public_web_base():
    link = build_web_fallback("home", {"source": "email"})

    assert link == "https://api.example.com/api/profile/open/home/?source=email"


@override_settings(
    DEEP_LINK_ENABLED=True,
    PUBLIC_WEB_BASE="https://api.example.com",
)
def test_build_reminders_link_uses_web_fallback_when_deeplink_enabled():
    link = build_reminders_link()

    assert link == "https://api.example.com/api/profile/open/home/"


@override_settings(
    DEEP_LINK_ENABLED=False,
    DEEP_LINK_SCHEME="flovers",
    DEEP_LINK_HOST="",
)
def test_build_reminders_link_uses_mobile_deeplink_when_deeplink_disabled():
    link = build_reminders_link()

    assert link == "flovers://home"
