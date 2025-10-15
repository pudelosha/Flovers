from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone

LocationCategory = [
    ("indoor", "Indoor"),
    ("outdoor", "Outdoor"),
    ("other", "Other"),
]

class Location(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="locations",
    )
    name = models.CharField(max_length=80)
    category = models.CharField(max_length=10, choices=LocationCategory, default="indoor")

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Case-insensitive unique name per user
        constraints = [
            models.UniqueConstraint(
                Lower("name"), "user", name="uniq_location_name_per_user_ci"
            )
        ]
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.category})"
