"""Claim and deliver opted-in caregiver-completion notifications."""
import logging
from datetime import timedelta
from uuid import uuid4

from celery import shared_task
from django.db.models import F, Q
from django.utils import timezone

from core.emailing import send_templated_email
from core.i18n import t
from profiles.models import ProfileNotifications, ProfileSettings, PushDevice
from profiles.tasks import _get_user_lang, _send_push_and_deactivate_bad_tokens
from profiles.utils import build_mobile_deeplink, build_web_fallback
from reminders.models import ReminderTask
from .identity import care_actor_identity
from .models import SharedCareNotification
from .services import _owner_timezone

logger = logging.getLogger(__name__)
# A unique row and fenced lease prevent concurrent/API retry duplicates. A crash
# after SMTP/FCM acceptance can still repeat a send: providers cannot commit
# atomically with this database.
LEASE = timedelta(minutes=15)
MAX_AGE = timedelta(days=1)


def _eligible(now):
    return Q(status="pending", next_attempt_at__lte=now) | Q(status="sending", lease_expires_at__lte=now)


def _claim(delivery_id):
    now = timezone.now()
    token = uuid4().hex
    changed = SharedCareNotification.objects.filter(pk=delivery_id).filter(_eligible(now)).update(
        status="sending", claim_token=token, lease_expires_at=now + LEASE, attempts=F("attempts") + 1,
    )
    if not changed:
        return None
    return SharedCareNotification.objects.select_related("owner", "plant").get(pk=delivery_id, claim_token=token)


def _finish(delivery, status, error=""):
    now = timezone.now()
    values = {"status": status, "claim_token": "", "lease_expires_at": None, "last_error": error[:1000]}
    if status == "sent":
        values["sent_at"] = now
    elif status == "pending":
        values["next_attempt_at"] = now + timedelta(seconds=min(60 * 2 ** min(delivery.attempts - 1, 6), 3600))
    SharedCareNotification.objects.filter(pk=delivery.pk, status="sending", claim_token=delivery.claim_token).update(**values)


def _deliver(delivery):
    owner = delivery.owner
    preferences = ProfileNotifications.objects.filter(user=owner).first()
    enabled = preferences and getattr(preferences, f"shared_task_{delivery.channel}")
    task = ReminderTask.objects.select_related("completed_by").filter(
        pk=delivery.source_task_id, user=owner, status="completed",
    ).first()
    if (not owner.is_active or delivery.plant.user_id != owner.pk or not enabled or task is None
            or task.completed_by_id in (None, owner.pk) or not task.completed_at
            or (task.completed_event or {}).get("plant_id") != delivery.plant_id
            or delivery.created_at < timezone.now() - MAX_AGE):
        _finish(delivery, "skipped")
        return

    lang = _get_user_lang(owner)
    scope = "sharing.task_completed"
    event = task.completed_event
    actor_name = care_actor_identity(task.completed_by, owner)["name"]
    plant_name = event.get("plant_name") or delivery.plant.display_name or f"Plant #{delivery.plant_id}"
    task_type = t(f"{scope}.types.{event.get('type', 'care')}", lang=lang, default="Care")
    local_time = timezone.localtime(task.completed_at, _owner_timezone(owner))
    pattern = ProfileSettings.objects.filter(user=owner).values_list("date_format", flat=True).first() or "YYYY-MM-DD"
    date_text = local_time.strftime("%Y-%m-%d")
    if pattern in {"DD.MM.YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"}:
        date_text = pattern.replace("YYYY", local_time.strftime("%Y")).replace("MM", local_time.strftime("%m")).replace("DD", local_time.strftime("%d"))
    body = t(f"{scope}.line1", lang=lang, default="{actor} completed a task for {plant}.").format(actor=actor_name, plant=plant_name)
    details = t(f"{scope}.details", lang=lang, default="Task: {task}. Completed: {date} at {time}.").format(
        task=task_type, date=date_text, time=local_time.strftime("%H:%M"),
    )
    params = {"plantId": str(delivery.plant_id)}
    if delivery.channel == "email":
        if not owner.email:
            _finish(delivery, "skipped")
            return
        accepted = send_templated_email(
            to_email=owner.email, template_name="sharing/task_completed", lang=lang,
            subject_key=f"{scope}.subject",
            context={"line1": body, "details": details, "link": build_web_fallback("task-history", params)},
        )
    else:
        tokens = list(PushDevice.objects.filter(user=owner, is_active=True).values_list("token", flat=True))
        if not tokens:
            _finish(delivery, "skipped")
            return
        accepted = _send_push_and_deactivate_bad_tokens(
            tokens, t(f"{scope}.push_title", lang=lang, default="Task completed"), body + " " + details,
            {"kind": "shared_task_completed", "route": "TaskHistory", **params,
             "url": build_mobile_deeplink("task-history", params), "delivery_id": str(delivery.pk)},
        ) > 0
    if not accepted:
        raise RuntimeError("Notification provider did not accept the delivery.")
    _finish(delivery, "sent")


@shared_task(ignore_result=True)
def deliver_shared_care_notifications(delivery_ids=None):
    rows = SharedCareNotification.objects.filter(_eligible(timezone.now()))
    if delivery_ids is not None:
        rows = rows.filter(pk__in=delivery_ids)
    ids = list(rows.order_by("next_attempt_at", "pk").values_list("pk", flat=True)[:200])
    for delivery_id in ids:
        delivery = None
        try:
            delivery = _claim(delivery_id)
            if delivery is not None:
                _deliver(delivery)
        except Exception as error:
            logger.exception("Shared-care delivery failed: id=%s", delivery_id)
            if delivery is not None:
                _finish(delivery, "pending", str(error))
