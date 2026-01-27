from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = settings.AUTH_USER_MODEL

LANG_CHOICES = [
    ("en", "English"), ("pl", "Polski"), ("de", "Deutsch"), ("fr", "Français"),
    ("es", "Español"), ("it", "Italiano"), ("pt", "Português"), ("zh", "中文"),
    ("hi", "हिन्दी"), ("ar", "العربية"),
]

TEMP_CHOICES = [("C", "Celsius"), ("F", "Fahrenheit"), ("K", "Kelvin")]
MEASURE_CHOICES = [("metric", "Metric"), ("imperial", "Imperial")]
BACKGROUND_CHOICES = [("bg1", "Background 1"), ("bg2", "Background 2"), ("bg3", "Background 3"), ("bg4", "Background 4"), ("bg5", "Background 5")]
FAB_CHOICES = [("left", "Left"), ("right", "Right")]

# Tile motive choices (light / dark tiles)
TILE_MOTIVE_CHOICES = [
    ("light", "Light"),
    ("dark", "Dark"),
]


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class ProfileSettings(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile_settings")

    language = models.CharField(max_length=5, choices=LANG_CHOICES, default="en")
    date_format = models.CharField(max_length=32, default="DD.MM.YYYY")

    temperature_unit = models.CharField(max_length=1, choices=TEMP_CHOICES, default="C")
    measure_unit = models.CharField(max_length=8, choices=MEASURE_CHOICES, default="metric")

    # 0.00 .. 0.60
    tile_transparency = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.12,
        validators=[MinValueValidator(0.0), MaxValueValidator(0.6)],
        help_text="UI overlay transparency (0.00 – 0.60).",
    )

    # Light / dark tile motive
    tile_motive = models.CharField(
        max_length=5,
        choices=TILE_MOTIVE_CHOICES,
        default="light",
        help_text="Tile gloom style: light or dark.",
    )

    background = models.CharField(max_length=3, choices=BACKGROUND_CHOICES, default="bg1")
    fab_position = models.CharField(max_length=5, choices=FAB_CHOICES, default="right")

    def __str__(self) -> str:
        return f"ProfileSettings<{self.user}>"


class ProfileNotifications(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile_notifications")

    timezone = models.CharField(max_length=64, default="Europe/Warsaw")

    email_daily = models.BooleanField(default=True)
    email_hour = models.IntegerField(default=12, validators=[MinValueValidator(0), MaxValueValidator(23)])
    email_minute = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(59)])
    email_24h = models.BooleanField(default=False)

    push_daily = models.BooleanField(default=True)
    push_hour = models.IntegerField(default=12, validators=[MinValueValidator(0), MaxValueValidator(23)])
    push_minute = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(59)])
    push_24h = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"ProfileNotifications<{self.user}>"


class NotificationDeliveryLog(models.Model):
    CHANNEL_EMAIL = "email"
    CHANNEL_PUSH = "push"

    KIND_DUE_TODAY = "due_today"
    KIND_OVERDUE_1D = "overdue_1d"

    CHANNEL_CHOICES = [
        (CHANNEL_EMAIL, "Email"),
        (CHANNEL_PUSH, "Push"),
    ]

    KIND_CHOICES = [
        (KIND_DUE_TODAY, "Due today"),
        (KIND_OVERDUE_1D, "Overdue 1 day"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_delivery_logs")
    channel = models.CharField(max_length=16, choices=CHANNEL_CHOICES)
    kind = models.CharField(max_length=32, choices=KIND_CHOICES, default=KIND_DUE_TODAY)
    local_date = models.DateField()  # date in user's timezone (send date)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "channel", "kind", "local_date"],
                name="uniq_delivery_user_channel_kind_date",
            ),
        ]
        indexes = [
            models.Index(fields=["local_date", "channel"]),
            models.Index(fields=["user", "local_date"]),
            models.Index(fields=["user", "channel", "kind", "local_date"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.channel}:{self.kind}:{self.local_date}"

class PushDevice(TimeStampedModel):
    PLATFORM_ANDROID = "android"
    PLATFORM_IOS = "ios"

    PLATFORM_CHOICES = [
        (PLATFORM_ANDROID, "Android"),
        (PLATFORM_IOS, "iOS"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="push_devices")

    token = models.CharField(max_length=512, unique=True)
    platform = models.CharField(max_length=16, choices=PLATFORM_CHOICES, default=PLATFORM_ANDROID)

    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["platform", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"PushDevice<{self.user_id}:{self.platform}:{'active' if self.is_active else 'inactive'}>"

class SupportMessage(models.Model):
    KIND_CONTACT = "contact"
    KIND_BUG = "bug"
    KIND_CHOICES = [
        (KIND_CONTACT, "Contact"),
        (KIND_BUG, "Bug report"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_messages",
    )

    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    subject = models.CharField(max_length=200)

    # contact uses "message", bug uses "description" — we store both normalized in "body"
    body = models.TextField()

    copy_to_user = models.BooleanField(default=True)

    # optional diagnostics (can be expanded later)
    user_email = models.EmailField(blank=True, default="")
    user_agent = models.CharField(max_length=255, blank=True, default="")
    app_version = models.CharField(max_length=64, blank=True, default="")
    platform = models.CharField(max_length=32, blank=True, default="")

    created_at = models.DateTimeField(default=timezone.now, editable=False)

    def __str__(self):
        return f"SupportMessage<{self.kind}:{self.user_id}:{self.subject[:30]}>"