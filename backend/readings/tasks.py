"""Monitor silent devices and deliver one owner alert per outage and channel."""
import logging
from datetime import timedelta
from uuid import uuid4

from celery import shared_task
from django.db.models import F, Q
from django.utils import timezone

from core.emailing import send_templated_email
from core.i18n import t
from profiles.models import ProfileNotifications, ProfileSettings, PushDevice
from profiles.tasks import _safe_zoneinfo, _send_push_and_deactivate_bad_tokens
from profiles.utils import build_mobile_deeplink
from .models import MissingReadingNotification, ReadingDevice
from .notifications import _get_user_lang
from .utils import build_readings_link

logger = logging.getLogger(__name__)
LEASE = timedelta(minutes=15)


def reading_baseline(device):
    return device.last_read_at or device.created_at


def readings_overdue(device, now=None):
    now = now or timezone.now()
    return bool(device.is_active and now >= reading_baseline(device) + timedelta(
        minutes=device.effective_interval_minutes))


def _eligible(now):
    return Q(status="pending", next_attempt_at__lte=now) | Q(status="sending", lease_expires_at__lte=now)


def _claim(delivery_id):
    now, token = timezone.now(), uuid4().hex
    changed = MissingReadingNotification.objects.filter(pk=delivery_id).filter(_eligible(now)).update(
        status="sending", claim_token=token, lease_expires_at=now + LEASE, attempts=F("attempts") + 1,
    )
    if not changed:
        return None
    return MissingReadingNotification.objects.select_related("device__user").filter(
        pk=delivery_id, claim_token=token).first()


def _finish(delivery, status, error=""):
    now = timezone.now()
    values = {"status": status, "claim_token": "", "lease_expires_at": None, "last_error": error[:1000]}
    if status == "sent":
        values["sent_at"] = now
    elif status == "pending":
        values["next_attempt_at"] = now + timedelta(seconds=min(60 * 2 ** min(delivery.attempts - 1, 6), 3600))
    MissingReadingNotification.objects.filter(pk=delivery.pk, status="sending", claim_token=delivery.claim_token).update(**values)


def _deliver(delivery):
    # Query current state after claiming: queued work must not ignore recovery,
    # changed intervals, disabled devices, or an owner's changed consent.
    device = ReadingDevice.objects.select_related("user").filter(pk=delivery.device_id).first()
    if (device is None or not device.user.is_active or not readings_overdue(device)
            or reading_baseline(device) != delivery.baseline_at
            or not getattr(device, f"send_{delivery.channel}_missing_readings")):
        _finish(delivery, "skipped")
        return

    owner, scope = device.user, "readings.missing_readings"
    lang = _get_user_lang(owner)
    zone = ProfileNotifications.objects.filter(user=owner).values_list("timezone", flat=True).first()
    if device.last_read_at:
        local = timezone.localtime(device.last_read_at, _safe_zoneinfo(zone))
        pattern = ProfileSettings.objects.filter(user=owner).values_list("date_format", flat=True).first()
        date_pattern = {"DD.MM.YYYY": "%d.%m.%Y", "DD/MM/YYYY": "%d/%m/%Y",
                        "MM/DD/YYYY": "%m/%d/%Y"}.get(pattern, "%Y-%m-%d")
        last_read = local.strftime(date_pattern + " %H:%M %Z")
    else:
        last_read = t(f"{scope}.last_read_never", lang=lang, default="No readings received yet")
    values = {"device_name": device.device_name or device.plant_name or f"Device #{device.pk}",
              "interval_minutes": device.effective_interval_minutes, "last_read": last_read}
    if delivery.channel == "email":
        if not owner.email:
            _finish(delivery, "skipped")
            return
        accepted = send_templated_email(
            to_email=owner.email, subject_key=f"{scope}.subject", template_name="readings/missing_readings", lang=lang,
            context={"title": t(f"{scope}.title", lang=lang, default="Device readings overdue"),
                     "line1": t(f"{scope}.line1", lang=lang,
                                default="{device_name} has not sent a reading within {interval_minutes} minutes. Last reading: {last_read}.").format(**values),
                     "cta": t(f"{scope}.cta", lang=lang, default="Open readings"), "link": build_readings_link()},
        )
    else:
        tokens = list(PushDevice.objects.filter(user=owner, is_active=True).values_list("token", flat=True))
        if not tokens:
            raise RuntimeError("No active push devices are available.")
        accepted = _send_push_and_deactivate_bad_tokens(
            tokens, t(f"{scope}.push_title", lang=lang, default="Device readings overdue"),
            t(f"{scope}.push_body", lang=lang,
              default="{device_name} has not sent a reading within {interval_minutes} minutes. Last reading: {last_read}.").format(**values),
            {"kind": "missing_readings", "route": "Readings", "deviceId": str(device.pk),
             "url": build_mobile_deeplink("readings", {}), "delivery_id": str(delivery.pk)},
        ) > 0
    if not accepted:
        raise RuntimeError("Notification provider did not accept the delivery.")
    _finish(delivery, "sent")


@shared_task(ignore_result=True)
def deliver_missing_reading_notifications(delivery_ids=None):
    rows = MissingReadingNotification.objects.filter(_eligible(timezone.now()))
    if delivery_ids is not None:
        rows = rows.filter(pk__in=delivery_ids)
    for delivery_id in list(rows.order_by("next_attempt_at", "pk").values_list("pk", flat=True)[:200]):
        delivery = None
        try:
            delivery = _claim(delivery_id)
            if delivery is not None:
                _deliver(delivery)
        except Exception as error:
            logger.exception("Missing-reading notification failed: id=%s", delivery_id)
            if delivery is not None:
                _finish(delivery, "pending", str(error))


@shared_task(ignore_result=True)
def check_missing_readings():
    now = timezone.now()
    devices = ReadingDevice.objects.filter(is_active=True, user__is_active=True).filter(
        Q(send_email_missing_readings=True) | Q(send_push_missing_readings=True))
    for device in devices.iterator(chunk_size=200):
        if not readings_overdue(device, now):
            continue
        for channel in ("email", "push"):
            if not getattr(device, f"send_{channel}_missing_readings"):
                continue
            row, created = MissingReadingNotification.objects.get_or_create(
                device=device, baseline_at=reading_baseline(device), channel=channel,
                defaults={"next_attempt_at": now},
            )
            # Consent may have been removed while queued and later restored.
            # A previously sent row is never reopened for the same outage.
            if not created:
                MissingReadingNotification.objects.filter(pk=row.pk, status="skipped").update(
                    status="pending", next_attempt_at=now, last_error="")
    deliver_missing_reading_notifications()
