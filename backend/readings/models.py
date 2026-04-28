from django.conf import settings
from django.db import models
from django.utils import timezone


def _generate_device_key(length: int = 8) -> str:
    import secrets

    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # avoid 0/O/1/I
    return "".join(secrets.choice(alphabet) for _ in range(length))


class AccountSecret(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="readings_secret",
    )
    secret = models.CharField(max_length=64)
    rotated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AccountSecret<{self.user_id}>"


class ReadingDevice(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_devices",
    )
    plant = models.ForeignKey(
        "plant_instances.PlantInstance",
        on_delete=models.CASCADE,
        related_name="reading_devices",
    )

    # Cached display fields for fast tiles
    plant_name = models.CharField(max_length=255, blank=True)
    plant_location = models.CharField(max_length=255, blank=True)

    device_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    device_key = models.CharField(max_length=16, unique=True, editable=False)
    notes = models.TextField(null=True, blank=True)

    interval_hours = models.PositiveSmallIntegerField(default=1)  # 1..24
    sensors = models.JSONField(default=dict)  # {temperature, humidity, light, moisture, ...}

    moisture_alert_enabled = models.BooleanField(default=False)
    moisture_alert_threshold = models.FloatField(null=True, blank=True)
    moisture_alert_active = models.BooleanField(default=False)

    send_email_notifications = models.BooleanField(default=False)
    send_push_notifications = models.BooleanField(default=False)

    send_email_watering_notifications = models.BooleanField(default=False)
    send_push_watering_notifications = models.BooleanField(default=False)

    pump_included = models.BooleanField(default=False)
    automatic_pump_launch = models.BooleanField(default=False)
    pump_threshold_pct = models.FloatField(null=True, blank=True)

    # Pump summary fields for fast UI display
    last_pump_run_at = models.DateTimeField(null=True, blank=True)
    last_pump_run_source = models.CharField(max_length=16, null=True, blank=True)

    # Safety cooldown used by backend automatic pump logic
    pump_cooldown_minutes = models.PositiveSmallIntegerField(default=60)

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


class PumpTask(models.Model):
    SOURCE_MANUAL = "manual"
    SOURCE_AUTOMATIC = "automatic"

    STATUS_PENDING = "pending"
    STATUS_DELIVERED = "delivered"
    STATUS_EXECUTED = "executed"
    STATUS_CANCELLED = "cancelled"
    STATUS_EXPIRED = "expired"
    STATUS_FAILED = "failed"

    SOURCE_CHOICES = (
        (SOURCE_MANUAL, "Manual"),
        (SOURCE_AUTOMATIC, "Automatic"),
    )

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_EXECUTED, "Executed"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_FAILED, "Failed"),
    )

    device = models.ForeignKey(
        ReadingDevice,
        on_delete=models.CASCADE,
        related_name="pump_tasks",
    )

    source = models.CharField(
        max_length=16,
        choices=SOURCE_CHOICES,
        default=SOURCE_MANUAL,
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
    )

    requested_at = models.DateTimeField(default=timezone.now)
    delivered_at = models.DateTimeField(null=True, blank=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    created_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_pump_tasks",
    )

    moisture_at_request = models.FloatField(null=True, blank=True)
    threshold_at_request = models.FloatField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-requested_at",)
        indexes = [
            models.Index(fields=["device", "status", "source"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"PumpTask<{self.id}:{self.device_id}:{self.source}:{self.status}>"

    @property
    def is_open(self):
        return self.status in {
            self.STATUS_PENDING,
            self.STATUS_DELIVERED,
        }


class Reading(models.Model):
    device = models.ForeignKey(
        ReadingDevice,
        on_delete=models.CASCADE,
        related_name="readings",
    )
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