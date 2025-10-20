from django.conf import settings
from django.db import models
from django.utils import timezone
import secrets

# Reuse the enums already used on mobile (keep keys identical)
LIGHT_LEVEL_CHOICES = [
    ("bright-direct", "Bright direct"),
    ("bright-indirect", "Bright indirect"),
    ("medium", "Medium"),
    ("low", "Low"),
    ("very-low", "Very low"),
]
ORIENTATION_CHOICES = [("N", "North"), ("E", "East"), ("S", "South"), ("W", "West")]

# Optional enums (free strings allowed; leave blank/NULL ok)
POT_MATERIAL_CHOICES = []  # keep open; you might constrain later
SOIL_MIX_CHOICES = []      # keep open; you might constrain later

class PlantInstance(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="plant_instances"
    )

    # optional link to the definition
    plant_definition = models.ForeignKey(
        "plant_definitions.PlantDefinition",
        on_delete=models.SET_NULL,
        related_name="instances",
        null=True,
        blank=True,
    )

    # location is mandatory (must belong to the same user; validated in serializer)
    location = models.ForeignKey(
        "locations.Location", on_delete=models.PROTECT, related_name="plant_instances"
    )

    # basic display data
    display_name = models.CharField(max_length=160, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    purchase_date = models.DateField(null=True, blank=True)

    # photo is deferred — store a local/app path or URL later
    photo_uri = models.CharField(max_length=512, blank=True, default="")

    # exposure
    light_level = models.CharField(max_length=20, choices=LIGHT_LEVEL_CHOICES, default="medium")
    orientation = models.CharField(max_length=1, choices=ORIENTATION_CHOICES, default="S")
    distance_cm = models.PositiveIntegerField(default=0)

    # container & soil (keep as free text keys for now)
    pot_material = models.CharField(max_length=40, blank=True, default="")
    soil_mix = models.CharField(max_length=40, blank=True, default="")

    # auto tasks preferences (store the flags + intervals; generation will come later)
    create_auto_tasks = models.BooleanField(default=False)
    water_task_enabled = models.BooleanField(default=False)
    repot_task_enabled = models.BooleanField(default=False)
    moisture_required = models.BooleanField(default=False)
    fertilize_required = models.BooleanField(default=False)
    care_required = models.BooleanField(default=False)

    last_watered = models.CharField(max_length=32, blank=True, default="")   # e.g. "today", "one-week", ...
    last_repotted = models.CharField(max_length=32, blank=True, default="")  # e.g. "one-month-ago", ...

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
            # ~24 chars base64url; adjust entropy by changing the number
            self.qr_code = secrets.token_urlsafe(18)

    def save(self, *args, **kwargs):
        self._ensure_qr_code()
        super().save(*args, **kwargs)
