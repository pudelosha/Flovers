from __future__ import annotations

import logging
from uuid import uuid4
from datetime import timedelta
from typing import Optional

from core.i18n import t

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover
    ZoneInfo = None

from reminders.models import ReminderTask
from core.emailing import send_templated_email
from .models import ProfileNotifications, NotificationDeliveryLog, PushDevice
from .push import send_fcm_multicast
from .utils import build_reminders_link

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


def _count_due_on_date(user_id: int, due_date) -> int:
    return ReminderTask.objects.filter(
        user_id=user_id,
        status="pending",
        due_date=due_date,
        reminder__is_active=True,
        reminder__user_id=user_id,
        reminder__plant__user_id=user_id,
    ).count()


def _count_shared_due_on_date(user_id: int, due_date, *, now=None) -> int:
    from sharing.permissions import active_shares

    plant_ids = active_shares(now).filter(recipient_id=user_id).values("plant_id")
    return ReminderTask.objects.filter(
        status="pending", due_date=due_date, reminder__is_active=True,
        reminder__plant_id__in=plant_ids,
        reminder__user_id=models.F("user_id"),
        reminder__plant__user_id=models.F("user_id"),
    ).exclude(user_id=user_id).count()


def _count_notification_tasks(preferences, channel, kind, due_date, *, now=None) -> int:
    prefix = "email" if channel == NotificationDeliveryLog.CHANNEL_EMAIL else "push"
    if kind != NotificationDeliveryLog.KIND_DUE_TODAY:
        # Next-day follow-ups retain their existing owner-only scope.
        return _count_due_on_date(preferences.user_id, due_date)
    count = _count_due_on_date(preferences.user_id, due_date) if getattr(preferences, f"{prefix}_daily") else 0
    if getattr(preferences, f"{prefix}_shared_due"):
        count += _count_shared_due_on_date(preferences.user_id, due_date, now=now)
    return count


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


def _send_email_due_today(user, due_count: int) -> bool:
    if not user.email:
        return False

    lang = _get_user_lang(user)
    line1 = t("profiles.due_today.line1", lang=lang, default="").format(count=due_count)
    link = build_reminders_link()

    send_templated_email(
        to_email=user.email,
        subject_key="profiles.due_today.subject",
        template_name="profiles/due_today",
        lang=lang,
        context={
            "user": user,
            "count": due_count,
            "line1": line1,
            "link": link,
        },
    )
    return True


def _send_email_overdue_1d(user, overdue_count: int) -> bool:
    if not user.email:
        return False

    lang = _get_user_lang(user)
    line1 = t("profiles.overdue_1d.line1", lang=lang, default="").format(count=overdue_count)
    link = build_reminders_link()

    send_templated_email(
        to_email=user.email,
        subject_key="profiles.overdue_1d.subject",
        template_name="profiles/overdue_1d",
        lang=lang,
        context={
            "user": user,
            "count": overdue_count,
            "line1": line1,
            "link": link,
        },
    )
    return True


def _get_push_due_today_text(user, due_count: int) -> tuple[str, str]:
    lang = _get_user_lang(user)

    title = t(
        "profiles.due_today.push_title",
        lang=lang,
        default="Plant tasks",
    )

    body = t(
        "profiles.due_today.push_body",
        lang=lang,
        default="You have {count} plant task(s) due today.",
    ).format(count=due_count)

    return title, body


def _get_push_overdue_1d_text(user, overdue_count: int) -> tuple[str, str]:
    lang = _get_user_lang(user)

    title = t(
        "profiles.overdue_1d.push_title",
        lang=lang,
        default="Overdue plant tasks",
    )

    body = t(
        "profiles.overdue_1d.push_body",
        lang=lang,
        default="You have {count} plant task(s) overdue since yesterday.",
    ).format(count=overdue_count)

    return title, body


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



# A claim is intentionally longer than bounded provider timeouts. A process
# dying after provider acceptance can still cause a repeat after lease recovery;
# SMTP/FCM do not offer an atomic commit with this database.
DELIVERY_LEASE = timedelta(minutes=15)
RETRY_MAX_SECONDS = 3600


def _notification_enabled(preferences, channel, kind):
    prefix = "email" if channel == NotificationDeliveryLog.CHANNEL_EMAIL else "push"
    if kind == NotificationDeliveryLog.KIND_DUE_TODAY:
        return bool(getattr(preferences, f"{prefix}_daily") or getattr(preferences, f"{prefix}_shared_due"))
    return bool(getattr(preferences, f"{prefix}_24h"))


def _enqueue_due_notifications(now_utc):
    preferences = ProfileNotifications.objects.select_related("user").filter(user__is_active=True).filter(
        models.Q(email_daily=True) | models.Q(email_24h=True) |
        models.Q(push_daily=True) | models.Q(push_24h=True) |
        models.Q(email_shared_due=True) | models.Q(push_shared_due=True)
    )
    for pn in preferences.iterator():
        # One invalid recipient must not prevent other recipients being queued.
        try:
            local = now_utc.astimezone(_safe_zoneinfo(pn.timezone))
            existing = set(NotificationDeliveryLog.objects.filter(
                user_id=pn.user_id, local_date=local.date()
            ).values_list("channel", "kind"))
            due_counts = {}
            for channel in (NotificationDeliveryLog.CHANNEL_EMAIL, NotificationDeliveryLog.CHANNEL_PUSH):
                prefix = "email" if channel == NotificationDeliveryLog.CHANNEL_EMAIL else "push"
                hour, minute = int(getattr(pn, f"{prefix}_hour")), int(getattr(pn, f"{prefix}_minute"))
                if not (0 <= hour <= 23 and 0 <= minute <= 59):
                    continue
                # Catch up after a missed minute, including a worker restart.
                if (local.hour, local.minute) < (hour, minute):
                    continue
                for kind in (NotificationDeliveryLog.KIND_DUE_TODAY, NotificationDeliveryLog.KIND_OVERDUE_1D):
                    if (channel, kind) in existing or not _notification_enabled(pn, channel, kind):
                        continue
                    due_date = local.date() - timedelta(days=kind == NotificationDeliveryLog.KIND_OVERDUE_1D)
                    key = (channel, kind)
                    if key not in due_counts:
                        due_counts[key] = _count_notification_tasks(pn, channel, kind, due_date, now=now_utc)
                    if due_counts[key] == 0:
                        continue
                    NotificationDeliveryLog.objects.get_or_create(
                        user_id=pn.user_id, channel=channel, kind=kind, local_date=local.date(),
                        defaults={"status": NotificationDeliveryLog.STATUS_PENDING, "next_attempt_at": now_utc},
                    )
        except Exception:
            logger.exception("Could not queue task notifications for user=%s", pn.user_id)


def _claim_delivery(delivery_id, now_utc):
    token = uuid4().hex
    eligible = models.Q(status=NotificationDeliveryLog.STATUS_PENDING, next_attempt_at__lte=now_utc) | models.Q(
        status=NotificationDeliveryLog.STATUS_SENDING, lease_expires_at__lte=now_utc
    )
    # Conditional UPDATE is the claim. A unique delivery row alone would dedup
    # only the log after sending and let overlapping workers both send.
    changed = NotificationDeliveryLog.objects.filter(pk=delivery_id).filter(eligible).update(
        status=NotificationDeliveryLog.STATUS_SENDING, claim_token=token,
        lease_expires_at=now_utc + DELIVERY_LEASE, attempts=models.F("attempts") + 1,
    )
    if not changed:
        return None
    return NotificationDeliveryLog.objects.select_related("user", "user__profile_notifications").get(
        pk=delivery_id, claim_token=token
    )


def _finish_delivery(delivery, state, *, now_utc, error=""):
    # A recovered lease fences the previous worker from changing the new claim.
    values = {
        "status": state, "claim_token": "", "lease_expires_at": None,
        "last_error": error[:1000],
    }
    if state == NotificationDeliveryLog.STATUS_SENT:
        values["sent_at"] = now_utc
    if state == NotificationDeliveryLog.STATUS_PENDING:
        delay = min(60 * (2 ** min(delivery.attempts - 1, 6)), RETRY_MAX_SECONDS)
        values["next_attempt_at"] = now_utc + timedelta(seconds=delay)
    NotificationDeliveryLog.objects.filter(
        pk=delivery.pk, status=NotificationDeliveryLog.STATUS_SENDING, claim_token=delivery.claim_token
    ).update(**values)


def _deliver_claimed(delivery, now_utc):
    user = delivery.user
    pn = getattr(user, "profile_notifications", None)
    if pn is None or not user.is_active or not _notification_enabled(pn, delivery.channel, delivery.kind):
        _finish_delivery(delivery, NotificationDeliveryLog.STATUS_SKIPPED, now_utc=now_utc)
        return
    local_date = now_utc.astimezone(_safe_zoneinfo(pn.timezone)).date()
    # A "due today" message must describe this local day. Tomorrow's overdue
    # preference controls tomorrow's notifications; stale work is not sent late.
    if delivery.local_date != local_date:
        _finish_delivery(delivery, NotificationDeliveryLog.STATUS_SKIPPED, now_utc=now_utc, error="Local delivery day expired.")
        return
    due_date = delivery.local_date - timedelta(days=delivery.kind == NotificationDeliveryLog.KIND_OVERDUE_1D)
    count = _count_notification_tasks(pn, delivery.channel, delivery.kind, due_date, now=now_utc)
    if count == 0:
        _finish_delivery(delivery, NotificationDeliveryLog.STATUS_SKIPPED, now_utc=now_utc)
        return
    if delivery.channel == NotificationDeliveryLog.CHANNEL_EMAIL:
        send = _send_email_due_today if delivery.kind == NotificationDeliveryLog.KIND_DUE_TODAY else _send_email_overdue_1d
        sent = send(user, count)
    else:
        tokens = list(PushDevice.objects.filter(user_id=user.pk, is_active=True).values_list("token", flat=True)) \
            if delivery.kind == NotificationDeliveryLog.KIND_DUE_TODAY and pn.push_shared_due else _get_android_tokens(user.pk)
        get_text = _get_push_due_today_text if delivery.kind == NotificationDeliveryLog.KIND_DUE_TODAY else _get_push_overdue_1d_text
        title, body = get_text(user, count)
        sent = _send_push_and_deactivate_bad_tokens(tokens, title, body, {
            "kind": delivery.kind, "route": "Home", "delivery_id": str(delivery.pk),
        }) > 0
    if not sent:
        raise RuntimeError("Notification provider did not accept a delivery.")
    _finish_delivery(delivery, NotificationDeliveryLog.STATUS_SENT, now_utc=timezone.now())


@shared_task(bind=True, ignore_result=True)
def check_and_send_daily_task_notifications(self):
    now_utc = timezone.now()
    _enqueue_due_notifications(now_utc)
    eligible = models.Q(status=NotificationDeliveryLog.STATUS_PENDING, next_attempt_at__lte=now_utc) | models.Q(
        status=NotificationDeliveryLog.STATUS_SENDING, lease_expires_at__lte=now_utc
    )
    ids = NotificationDeliveryLog.objects.filter(eligible).order_by("next_attempt_at", "pk").values_list("pk", flat=True)
    for delivery_id in ids.iterator():
        delivery = None
        try:
            # Queue enumeration can be long; every claim gets a fresh lease.
            delivery = _claim_delivery(delivery_id, timezone.now())
            if delivery is not None:
                _deliver_claimed(delivery, timezone.now())
        except Exception as exc:
            logger.exception("Task notification attempt failed delivery=%s", delivery_id)
            if delivery is not None:
                # Store an exception class, not provider text that may contain
                # tokens, addresses or response bodies.
                _finish_delivery(delivery, NotificationDeliveryLog.STATUS_PENDING,
                                 now_utc=timezone.now(), error=type(exc).__name__)
