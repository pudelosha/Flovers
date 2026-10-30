from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
import secrets
import uuid

# Reuse the enums already used on mobile (keep keys identical)
LIGHT_LEVEL_CHOICES = [
    ("bright-direct", "Bright direct"),
    ("bright-indirect", "Bright indirect"),
    ("medium", "Medium"),
    ("low", "Low"),
    ("very-low", "Very low"),
]
ORIENTATION_CHOICES = [("N", "North"), ("E", "East"), ("S", "South"), ("W", "West")]

POT_MATERIAL_CHOICES = []
SOIL_MIX_CHOICES = []

class PlantInstance(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="plant_instances"
    )

    plant_definition = models.ForeignKey(
        "plant_definitions.PlantDefinition",
        on_delete=models.SET_NULL,
        related_name="instances",
        null=True,
        blank=True,
    )

    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="plant_instances"
    )

    display_name = models.CharField(max_length=160, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    purchase_date = models.DateField(null=True, blank=True)

    photo_uri = models.CharField(max_length=512, blank=True, default="")

    light_level = models.CharField(max_length=20, choices=LIGHT_LEVEL_CHOICES, default="medium")
    orientation = models.CharField(max_length=1, choices=ORIENTATION_CHOICES, default="S")
    distance_cm = models.PositiveIntegerField(default=0)

    pot_material = models.CharField(max_length=40, blank=True, default="")
    soil_mix = models.CharField(max_length=40, blank=True, default="")

    create_auto_tasks = models.BooleanField(default=False)
    water_task_enabled = models.BooleanField(default=False)
    repot_task_enabled = models.BooleanField(default=False)
    moisture_required = models.BooleanField(default=False)
    fertilize_required = models.BooleanField(default=False)
    care_required = models.BooleanField(default=False)

    last_watered = models.CharField(max_length=32, blank=True, default="")
    last_repotted = models.CharField(max_length=32, blank=True, default="")

    water_interval_days = models.PositiveSmallIntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    moisture_interval_days = models.PositiveSmallIntegerField(null=True, blank=True)
    fertilize_interval_days = models.PositiveSmallIntegerField(null=True, blank=True)
    care_interval_days = models.PositiveSmallIntegerField(null=True, blank=True)
    repot_interval_months = models.PositiveSmallIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    # Opaque token used in QR codes (URL-safe, unique, not editable)
    qr_code = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        editable=False,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.display_name or f"Plant #{self.pk}"
    
    def _ensure_qr_code(self):
        if not self.qr_code:
            self.qr_code = secrets.token_urlsafe(18)

    def save(self, *args, **kwargs):
        self._ensure_qr_code()
        super().save(*args, **kwargs)


class PlantCreationRequest(models.Model):
    """Durable per-account receipt; deleting a plant must not silently recreate it on retry."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    creation_key = models.UUIDField()
    request_hash = models.CharField(max_length=64)
    plant = models.OneToOneField(PlantInstance, null=True, on_delete=models.SET_NULL)
    response_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "creation_key"], name="plant_creation_user_key_unique")]


class PlantImage(models.Model):
    """Private image metadata; bytes never live in PostgreSQL or public media."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plant = models.ForeignKey(PlantInstance, on_delete=models.CASCADE, related_name="images")
    purpose = models.CharField(max_length=12, default="cover", editable=False)
    upload_key = models.UUIDField()
    directory = models.CharField(max_length=160, unique=True, editable=False)
    width = models.PositiveSmallIntegerField()
    height = models.PositiveSmallIntegerField()
    byte_size = models.PositiveIntegerField()
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["plant"], condition=models.Q(purpose="cover"), name="plant_one_current_cover")]


class PhotoStorageLock(models.Model):
    """A stable database admission lock serializes global quota checks."""

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)


class PhotoFileDeletion(models.Model):
    """Durable filesystem cleanup survives rollbacks, worker and broker failures."""

    directory = models.CharField(max_length=160, unique=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.CharField(max_length=500, blank=True, default="")
