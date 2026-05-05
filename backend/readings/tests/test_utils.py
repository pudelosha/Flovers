from django.test import override_settings
from django.utils import timezone

from readings.utils import (
    build_mobile_deeplink,
    build_readings_link,
    build_web_fallback,
    parse_ts_or_now,
)


def test_parse_ts_or_now_parses_valid_datetime():
    dt = parse_ts_or_now("2026-05-05T10:15:00Z")

    assert dt.year == 2026
    assert dt.month == 5
    assert dt.day == 5


def test_parse_ts_or_now_returns_now_for_invalid_value():
    before = timezone.now()
    dt = parse_ts_or_now("not-a-date")
    after = timezone.now()

    assert before <= dt <= after


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_build_mobile_deeplink_without_host():
    link = build_mobile_deeplink("readings", {"source": "email"})

    assert link == "flovers://readings?source=email"


@override_settings(DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="app")
def test_build_mobile_deeplink_with_host():
    link = build_mobile_deeplink("readings", {"source": "email"})

    assert link == "flovers://app/readings?source=email"


@override_settings(PUBLIC_WEB_BASE="https://api.example.com")
def test_build_web_fallback_uses_public_web_base():
    link = build_web_fallback("readings", {})

    assert link == "https://api.example.com/api/readings/open/readings/"


@override_settings(DEEP_LINK_ENABLED=True, PUBLIC_WEB_BASE="https://api.example.com")
def test_build_readings_link_uses_web_fallback_when_deeplink_enabled():
    assert build_readings_link() == "https://api.example.com/api/readings/open/readings/"


@override_settings(DEEP_LINK_ENABLED=False, DEEP_LINK_SCHEME="flovers", DEEP_LINK_HOST="")
def test_build_readings_link_uses_mobile_deeplink_when_deeplink_disabled():
    assert build_readings_link() == "flovers://readings"
