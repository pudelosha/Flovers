# profiles/tasks.py
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Optional

from core.i18n import t

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, models, transaction
from django.utils import timezone

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None

from reminders.models import ReminderTask
from core.emailing import send_templated_email
from .models import ProfileNotifications, NotificationDeliveryLog, PushDevice
from .push import send_fcm_multicast

logger = logging.getLogger(__name__)
User = get_user_model()

DEFAULT_TZ = "Europe/Warsaw"


def _safe_zoneinfo(tz_name: Optional[str]):
    tz_name = tz_name or DEFAULT_TZ

    if ZoneInfo is None:
        return timezone.get_current_timezone()

    try:
        return ZoneInfo(tz_name)
    except Exception:
        try:
            return ZoneInfo(DEFAULT_TZ)
        except Exception:
            return timezone.get_current_timezone()


def _matches_minute(now_local, hour: int, minute: int) -> bool:
    try:
        return now_local.hour == int(hour) and now_local.minute == int(minute)
    except Exception:
        return False


def _count_due_on_date(user_id: int, due_date) -> int:
    return ReminderTask.objects.filter(
        user_id=user_id,
        status="pending",
        due_date=due_date,
    ).count()


def _should_send(user_id: int, channel: str, kind: str, local_date) -> bool:
    return not NotificationDeliveryLog.objects.filter(
        user_id=user_id,
        channel=channel,
        kind=kind,
        local_date=local_date,
    ).exists()


def _log_sent(user_id: int, channel: str, kind: str, local_date) -> None:
    try:
        with transaction.atomic():
            NotificationDeliveryLog.objects.create(
                user_id=user_id,
                channel=channel,
                kind=kind,
                local_date=local_date,
            )
    except IntegrityError:
        pass


def _get_user_lang(user) -> str:
    # Prefer ProfileSettings.language if present, else fallback to settings default.
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

def _send_email_due_today(user, due_count: int) -> bool:
    if not user.email:
        return False

    lang = _get_user_lang(user)

    # JSON: profiles.due_today.line1 contains "{count}"
    line1 = t("profiles.due_today.line1", lang=lang, default="").format(count=due_count)

    send_templated_email(
        to_email=user.email,
        subject_key="profiles.due_today.subject",
        template_name="profiles/due_today",
        lang=lang,
        context={
            "user": user,
            "count": due_count,
            "line1": line1,
            # Optional: provide a link so CTA can be clickable in template
            # "link": "<your deep link or web url>",
        },
    )
    return True

def _send_email_overdue_1d(user, overdue_count: int) -> bool:
    if not user.email:
        return False

    lang = _get_user_lang(user)

    line1 = t("profiles.overdue_1d.line1", lang=lang, default="").format(count=overdue_count)

    send_templated_email(
        to_email=user.email,
        subject_key="profiles.overdue_1d.subject",
        template_name="profiles/overdue_1d",
        lang=lang,
        context={
            "user": user,
            "count": overdue_count,
            "line1": line1,
            # "link": "<your deep link or web url>",
        },
    )
    return True

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


@shared_task(bind=True, ignore_result=True)
def check_and_send_daily_task_notifications(self):
    now_utc = timezone.now()

    notif_qs = (
        ProfileNotifications.objects
        .select_related("user")
        .filter(
            models.Q(email_daily=True) |
            models.Q(push_daily=True) |
            models.Q(email_24h=True) |
            models.Q(push_24h=True)
        )
        .only(
            "id", "timezone",
            "email_daily", "email_24h", "email_hour", "email_minute",
            "push_daily", "push_24h", "push_hour", "push_minute",
            "user__id", "user__email",
        )
    )

    for pn in notif_qs:
        tzinfo = _safe_zoneinfo(pn.timezone)
        now_local = now_utc.astimezone(tzinfo)
        local_date = now_local.date()
        yesterday = local_date - timedelta(days=1)

        user = pn.user

        email_time_match = _matches_minute(now_local, pn.email_hour, pn.email_minute)
        push_time_match = _matches_minute(now_local, pn.push_hour, pn.push_minute)

        # --- EMAIL: due today ---
        if pn.email_daily and email_time_match:
            if _should_send(user.id, NotificationDeliveryLog.CHANNEL_EMAIL, NotificationDeliveryLog.KIND_DUE_TODAY, local_date):
                due_count = _count_due_on_date(user.id, local_date)
                if due_count > 0 and _send_email_due_today(user, due_count):
                    _log_sent(user.id, NotificationDeliveryLog.CHANNEL_EMAIL, NotificationDeliveryLog.KIND_DUE_TODAY, local_date)

        # --- EMAIL: overdue 1 day ---
        if pn.email_24h and email_time_match:
            if _should_send(user.id, NotificationDeliveryLog.CHANNEL_EMAIL, NotificationDeliveryLog.KIND_OVERDUE_1D, local_date):
                overdue_count = _count_due_on_date(user.id, yesterday)
                if overdue_count > 0 and _send_email_overdue_1d(user, overdue_count):
                    _log_sent(user.id, NotificationDeliveryLog.CHANNEL_EMAIL, NotificationDeliveryLog.KIND_OVERDUE_1D, local_date)

        # --- PUSH: due today ---
        if pn.push_daily and push_time_match:
            should = _should_send(user.id, NotificationDeliveryLog.CHANNEL_PUSH, NotificationDeliveryLog.KIND_DUE_TODAY, local_date)
            due_count = _count_due_on_date(user.id, local_date) if should else 0
            tokens = _get_android_tokens(user.id) if (should and due_count > 0) else []

            logger.info(
                "push_due_today user=%s tz=%s now_local=%s local_date=%s match=%s should_send=%s due=%s tokens=%s",
                user.id,
                pn.timezone,
                now_local.isoformat(),
                local_date,
                push_time_match,
                should,
                due_count,
                len(tokens),
            )

            if should and due_count > 0:
                sent = _send_push_and_deactivate_bad_tokens(
                    tokens=tokens,
                    title="Plant tasks",
                    body=f"You have {due_count} task(s) due today.",
                    data={"kind": "due_today", "route": "Home"},
                )
                logger.info("push_due_today result user=%s sent=%s", user.id, sent)

                if sent > 0:
                    _log_sent(user.id, NotificationDeliveryLog.CHANNEL_PUSH, NotificationDeliveryLog.KIND_DUE_TODAY, local_date)

        # --- PUSH: overdue 1 day ---
        if pn.push_24h and push_time_match:
            if _should_send(user.id, NotificationDeliveryLog.CHANNEL_PUSH, NotificationDeliveryLog.KIND_OVERDUE_1D, local_date):
                overdue_count = _count_due_on_date(user.id, yesterday)
                if overdue_count > 0:
                    tokens = _get_android_tokens(user.id)
                    sent = _send_push_and_deactivate_bad_tokens(
                        tokens=tokens,
                        title="Plant tasks",
                        body=f"You have {overdue_count} task(s) overdue since yesterday.",
                        data={"kind": "overdue_1d", "route": "Home"},
                    )
                    if sent > 0:
                        _log_sent(user.id, NotificationDeliveryLog.CHANNEL_PUSH, NotificationDeliveryLog.KIND_OVERDUE_1D, local_date)
