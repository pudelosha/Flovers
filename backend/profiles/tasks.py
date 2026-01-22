from __future__ import annotations

from datetime import timedelta

from django.db import models

from celery import shared_task
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

try:
    # Python 3.9+ stdlib
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None  # fallback handled below

from reminders.models import ReminderTask
from .models import ProfileNotifications, NotificationDeliveryLog, PushDevice
from .push import send_fcm_multicast
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()

DEFAULT_TZ = "Europe/Warsaw"


def _safe_zoneinfo(tz_name: str):
    """
    Returns a tzinfo. Falls back to DEFAULT_TZ if invalid or zoneinfo unavailable.
    """
    if ZoneInfo is None:
        return timezone.get_current_timezone()  # uses Django TIME_ZONE (fallback)
    try:
        return ZoneInfo(tz_name or DEFAULT_TZ)
    except Exception:
        return ZoneInfo(DEFAULT_TZ)


def _matches_minute(now_local, hour: int, minute: int) -> bool:
    return now_local.hour == int(hour) and now_local.minute == int(minute)


def _count_due_on_date(user_id: int, due_date) -> int:
    return ReminderTask.objects.filter(
        user_id=user_id,
        status="pending",
        due_date=due_date,
    ).count()


def _try_log_send(user_id: int, channel: str, kind: str, local_date) -> bool:
    """
    Insert-only idempotency. Returns True if we should send now.
    Unique is enforced at (user, channel, kind, local_date).
    """
    try:
        with transaction.atomic():
            NotificationDeliveryLog.objects.create(
                user_id=user_id,
                channel=channel,
                kind=kind,
                local_date=local_date,
            )
        return True
    except IntegrityError:
        return False


def _send_email_due_today(user, due_count: int):
    subject = "You have tasks due today"
    body = f"You have {due_count} pending plant task(s) due today. Open the app to review."
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "no-reply@example.com"
    if not user.email:
        return
    send_mail(subject, body, from_email, [user.email], fail_silently=False)


def _send_email_overdue_1d(user, overdue_count: int):
    subject = "You still have overdue tasks"
    body = (
        f"You have {overdue_count} pending plant task(s) that were due yesterday and are still not completed. "
        "Open the app to review."
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "no-reply@example.com"
    if not user.email:
        return
    send_mail(subject, body, from_email, [user.email], fail_silently=False)


def _get_android_tokens(user_id: int) -> list[str]:
    return list(
        PushDevice.objects.filter(
            user_id=user_id,
            is_active=True,
            platform=PushDevice.PLATFORM_ANDROID,
        ).values_list("token", flat=True)
    )


def _send_push_and_deactivate_bad_tokens(tokens: list[str], title: str, body: str, data: dict[str, str]):
    if not tokens:
        return

    try:
        resp = send_fcm_multicast(tokens=tokens, title=title, body=body, data=data)
    except Exception:
        # Keep the periodic job resilient; optionally add logging later.
        return

    if resp is None:
        return

    bad_tokens: list[str] = []
    for idx, r in enumerate(resp.responses):
        if not r.success:
            bad_tokens.append(tokens[idx])

    if bad_tokens:
        PushDevice.objects.filter(token__in=bad_tokens).update(is_active=False)


@shared_task(bind=True, ignore_result=True)
def check_and_send_daily_task_notifications(self):
    """
    Runs every minute.

    For each timezone group, finds users whose configured minute matches "now" in that tz.

    For each matched user, independently evaluates:
    - Due-today notifications (email_daily / push_daily): tasks due on local_date
    - Overdue-1d followup (email_24h / push_24h): tasks due on local_date - 1 day

    Uses NotificationDeliveryLog(kind=...) to guarantee "once per day per type per channel".
    """
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

    tz_map: dict[str, list[ProfileNotifications]] = {}
    for pn in notif_qs:
        tz_name = pn.timezone or DEFAULT_TZ
        tz_map.setdefault(tz_name, []).append(pn)

    for tz_name, group in tz_map.items():
        tzinfo = _safe_zoneinfo(tz_name)
        now_local = now_utc.astimezone(tzinfo)
        local_date = now_local.date()
        yesterday = local_date - timedelta(days=1)

        for pn in group:
            user = pn.user

            email_time_match = _matches_minute(now_local, pn.email_hour, pn.email_minute)
            push_time_match = _matches_minute(now_local, pn.push_hour, pn.push_minute)

            # --- EMAIL: due today ---
            if pn.email_daily and email_time_match:
                due_count = _count_due_on_date(user.id, local_date)
                if due_count > 0:
                    if _try_log_send(
                        user.id,
                        NotificationDeliveryLog.CHANNEL_EMAIL,
                        NotificationDeliveryLog.KIND_DUE_TODAY,
                        local_date,
                    ):
                        _send_email_due_today(user, due_count)

            # --- EMAIL: overdue 1 day ---
            if pn.email_24h and email_time_match:
                overdue_count = _count_due_on_date(user.id, yesterday)
                if overdue_count > 0:
                    if _try_log_send(
                        user.id,
                        NotificationDeliveryLog.CHANNEL_EMAIL,
                        NotificationDeliveryLog.KIND_OVERDUE_1D,
                        local_date,
                    ):
                        _send_email_overdue_1d(user, overdue_count)

            # --- PUSH: due today ---
            if pn.push_daily and push_time_match:
                due_count = _count_due_on_date(user.id, local_date)
                if due_count > 0:
                    if _try_log_send(
                        user.id,
                        NotificationDeliveryLog.CHANNEL_PUSH,
                        NotificationDeliveryLog.KIND_DUE_TODAY,
                        local_date,
                    ):
                        tokens = _get_android_tokens(user.id)
                        _send_push_and_deactivate_bad_tokens(
                            tokens=tokens,
                            title="Plant tasks",
                            body=f"You have {due_count} task(s) due today.",
                            data={"kind": "due_today"},
                        )

            # --- PUSH: overdue 1 day ---
            if pn.push_24h and push_time_match:
                overdue_count = _count_due_on_date(user.id, yesterday)
                if overdue_count > 0:
                    if _try_log_send(
                        user.id,
                        NotificationDeliveryLog.CHANNEL_PUSH,
                        NotificationDeliveryLog.KIND_OVERDUE_1D,
                        local_date,
                    ):
                        tokens = _get_android_tokens(user.id)
                        _send_push_and_deactivate_bad_tokens(
                            tokens=tokens,
                            title="Plant tasks",
                            body=f"You have {overdue_count} task(s) overdue since yesterday.",
                            data={"kind": "overdue_1d"},
                        )
