import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class Connection(models.Model):
    """One unordered user pair, from invitation through accepted contact."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"

    user_low = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                 related_name="contact_connections_low")
    user_high = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                  related_name="contact_connections_high")
    initiator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                                  related_name="contact_invitations_sent")
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.PENDING)
    # These names are private to the corresponding user, not public profile edits.
    alias_low = models.CharField(max_length=80, blank=True, default="")
    alias_high = models.CharField(max_length=80, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user_low", "user_high"], name="contacts_unique_pair"),
            models.CheckConstraint(condition=Q(user_low__lt=F("user_high")), name="contacts_pair_order"),
            models.CheckConstraint(
                condition=Q(initiator=F("user_low")) | Q(initiator=F("user_high")),
                name="contacts_initiator_in_pair",
            ),
            models.CheckConstraint(condition=Q(status__in=["pending", "accepted"]), name="contacts_valid_status"),
        ]
        indexes = [
            models.Index(fields=["user_low", "status"], name="contacts_low_status"),
            models.Index(fields=["user_high", "status"], name="contacts_high_status"),
        ]

    def __str__(self):
        return f"Connection<{self.user_low_id}, {self.user_high_id}: {self.status}>"


class EmailInvitation(models.Model):
    """A private invitation to join; never grants contact or plant access."""
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                               related_name="email_contact_invitations")
    email = models.EmailField(max_length=254, db_index=True)
    language = models.CharField(max_length=2)
    created_at = models.DateTimeField(auto_now_add=True)
    delivery_generation = models.UUIDField(default=uuid.uuid4, editable=False)
    sent_at = models.DateTimeField(null=True)
    expires_at = models.DateTimeField()
    closed = models.BooleanField(default=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["sender", "email"], name="contacts_unique_email_invite")]


class InvitationRecipientLock(models.Model):
    """Serializes recipient-wide reservations, including across different senders."""
    key = models.CharField(max_length=64, primary_key=True)


class InvitationEmailDelivery(models.Model):
    """Transactional outbox: one durable mail job per invitation generation."""
    invitation = models.ForeignKey(EmailInvitation, on_delete=models.CASCADE, related_name="deliveries")
    generation = models.UUIDField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=8, default="pending", choices=[(s,s) for s in ("pending","sending","sent","skipped","failed")])
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    lease_expires_at = models.DateTimeField(null=True)
    claim_token = models.CharField(max_length=32, blank=True, default="")
    sent_at = models.DateTimeField(null=True)
    last_error = models.CharField(max_length=80, blank=True, default="")

    class Meta:
        indexes = [models.Index(fields=["status","next_attempt_at"], name="invite_delivery_due")]
