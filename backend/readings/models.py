from django.conf import settings
from django.db import models
from django.utils import timezone

def _generate_device_key(length: int = 8) -> str:
    import secrets
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # avoid 0/O/1/I
    return "".join(secrets.choice(alphabet) for _ in range(length))

class AccountSecret(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="readings_secret"
    )
    secret = models.CharField(max_length=64)
    rotated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AccountSecret<{self.user_id}>"

class ReadingDevice(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reading_devices"
    )
    plant = models.ForeignKey(
        "plant_instances.PlantInstance", on_delete=models.CASCADE, related_name="reading_devices"
    )

    # cached display fields for fast tiles
    plant_name = models.CharField(max_length=255, blank=True)
    plant_location = models.CharField(max_length=255, blank=True)

    device_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    device_key = models.CharField(max_length=16, unique=True, editable=False)
    notes = models.TextField(null=True, blank=True)

    interval_hours = models.PositiveSmallIntegerField(default=5)  # 1..24
    sensors = models.JSONField(default=dict)  # {temperature, humidity, light, moisture, ...}

    last_read_at = models.DateTimeField(null=True, blank=True)
    latest_snapshot = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)

    def __str__(self):
        return f"{self.device_name} [{self.id}]"

    def _cache_plant_display(self):
        try:
            p = self.plant
            self.plant_name = getattr(p, "display_name", f"Plant #{p.pk}") or f"Plant #{p.pk}"
            loc = (
                getattr(p, "location_name", None)
                or getattr(p, "location_label", None)
                or getattr(p, "location_display", None)
                or (getattr(p, "location", None).name if getattr(p, "location", None) else None)
                or getattr(p, "location", None)
            )
            self.plant_location = loc or ""
        except Exception:
            pass

    def save(self, *args, **kwargs):
        if not self.device_key:
            self.device_key = _generate_device_key(8)
        self._cache_plant_display()
        super().save(*args, **kwargs)

class Reading(models.Model):
    device = models.ForeignKey(ReadingDevice, on_delete=models.CASCADE, related_name="readings")
    timestamp = models.DateTimeField(db_index=True)

    temperature = models.FloatField(null=True, blank=True)
    humidity = models.FloatField(null=True, blank=True)
    light = models.FloatField(null=True, blank=True)
    moisture = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = (("device", "timestamp"),)
        ordering = ("-timestamp",)

    def __str__(self):
        return f"Reading<{self.device_id}@{self.timestamp.isoformat()}>"
