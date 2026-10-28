from django.conf import settings
from django.db import models
from django.db.models import F, Q


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
