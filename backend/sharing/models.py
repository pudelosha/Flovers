from django.conf import settings
from django.db import models


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
