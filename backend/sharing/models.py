from django.conf import settings
from django.db import models
from django.utils import timezone


class PlantSharingVersion(models.Model):
    plant = models.OneToOneField("plant_instances.PlantInstance", on_delete=models.CASCADE,
                                 related_name="sharing_version")
    revision = models.PositiveIntegerField(default=0)


class PlantShare(models.Model):
    plant = models.ForeignKey("plant_instances.PlantInstance", on_delete=models.CASCADE, related_name="shares")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_plant_shares")
    # Removing a contact deletes its grants; accepting a new invitation cannot
    # silently resurrect access granted under the old contact relationship.
    connection = models.ForeignKey("contacts.Connection", on_delete=models.CASCADE, related_name="plant_shares")
    can_complete_tasks = models.BooleanField(default=False)
    ends_on = models.DateField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["plant", "recipient"], name="sharing_unique_plant_recipient")]
        indexes = [models.Index(fields=["recipient", "expires_at"], name="sharing_recipient_expiry")]


class SharedCareNotification(models.Model):
    """Durable owner-only delivery; task/channel uniqueness deduplicates retries."""

    STATUS_PENDING = "pending"
    STATUS_SENDING = "sending"
    STATUS_SENT = "sent"
    STATUS_SKIPPED = "skipped"
    STATUS_CHOICES = [(STATUS_PENDING, "Pending"), (STATUS_SENDING, "Sending"),
                      (STATUS_SENT, "Sent"), (STATUS_SKIPPED, "Skipped")]
    CHANNEL_EMAIL = "email"
    CHANNEL_PUSH = "push"
    CHANNEL_CHOICES = [(CHANNEL_EMAIL, "Email"), (CHANNEL_PUSH, "Push")]

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
                              related_name="shared_care_notifications")
    plant = models.ForeignKey("plant_instances.PlantInstance", on_delete=models.CASCADE,
                              related_name="care_notifications")
    # The immutable source ID preserves deduplication if task history is removed.
    source_task_id = models.PositiveBigIntegerField()
    channel = models.CharField(max_length=8, choices=CHANNEL_CHOICES)
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_PENDING)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    attempts = models.PositiveIntegerField(default=0)
    lease_expires_at = models.DateTimeField(null=True, blank=True)
    claim_token = models.CharField(max_length=32, blank=True, default="")
    sent_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=1000, blank=True, default="")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["source_task_id", "channel"], name="shared_care_task_channel")]
        indexes = [models.Index(fields=["status", "next_attempt_at"], name="shared_care_retry_idx")]
