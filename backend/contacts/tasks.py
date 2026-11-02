"""Drain the committed invitation outbox; provider calls run outside transactions."""
from datetime import timedelta
import logging
from uuid import uuid4

from celery import shared_task
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone

from core.emailing import send_templated_email
from .models import EmailInvitation, InvitationEmailDelivery

logger = logging.getLogger(__name__)
LEASE = timedelta(minutes=15)  # SMTP timeout is capped at 120 seconds.
MAX_ATTEMPTS = 6


def _eligible(now):
    return Q(status="pending", next_attempt_at__lte=now) | Q(status="sending", lease_expires_at__lte=now)


def _claim(pk):
    now = timezone.now()
    rows = InvitationEmailDelivery.objects.filter(pk=pk).filter(_eligible(now))
    rows.filter(attempts__gte=MAX_ATTEMPTS).update(status="failed", claim_token="", lease_expires_at=None)
    token = uuid4().hex
    if not rows.filter(attempts__lt=MAX_ATTEMPTS).update(status="sending",claim_token=token,
            lease_expires_at=now+LEASE,attempts=F("attempts")+1):
        return None
    return InvitationEmailDelivery.objects.select_related("invitation__sender").get(pk=pk,claim_token=token)


def _finish(job, status, error=""):
    now = timezone.now()
    values = {"status":status,"claim_token":"","lease_expires_at":None,"last_error":error[:80]}
    if status == "sent":
        values["sent_at"] = now
    elif status == "pending":
        if job.attempts >= MAX_ATTEMPTS:
            values["status"] = "failed"
        else:
            values["next_attempt_at"] = now+timedelta(seconds=min(60*2**(job.attempts-1),3600))
    with transaction.atomic():
        changed = InvitationEmailDelivery.objects.filter(pk=job.pk,status="sending",claim_token=job.claim_token).update(**values)
        if changed and status == "sent":
            EmailInvitation.objects.filter(pk=job.invitation_id,delivery_generation=job.generation).update(sent_at=now)


def _deliver(job):
    row = job.invitation
    sender = row.sender
    if (row.closed or row.expires_at <= timezone.now() or row.delivery_generation != job.generation or
        not sender.is_active or get_user_model().objects.filter(email__iexact=row.email).exists()):
        _finish(job,"skipped")
        return
    accepted = send_templated_email(to_email=row.email,template_name="contacts/join",lang=row.language,
        context={"inviter":sender.get_full_name().strip() or sender.email,
                 "invite_email":row.email,"inviter_id":f"FL-{sender.flovers_id.hex.upper()}",
                 "website_url":getattr(settings,"PUBLIC_WEB_BASE","https://flovers.app").rstrip("/")+"/"+row.language,
                 "google_play_url":getattr(settings,"INVITATION_GOOGLE_PLAY_URL",""),
                 "app_store_url":getattr(settings,"INVITATION_APP_STORE_URL","")})
    if not accepted:
        raise RuntimeError("Mail provider did not accept the invitation")
    _finish(job,"sent")


@shared_task(ignore_result=True)
def deliver_invitation_emails():
    ids = list(InvitationEmailDelivery.objects.filter(_eligible(timezone.now())).order_by("next_attempt_at","pk").values_list("pk",flat=True)[:100])
    for pk in ids:
        job = None
        try:
            job = _claim(pk)
            if job is not None:
                _deliver(job)
        except Exception as error:
            logger.warning("Invitation delivery failed: job=%s error=%s",pk,type(error).__name__)
            if job is not None:
                _finish(job,"pending",type(error).__name__)
