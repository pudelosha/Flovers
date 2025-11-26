from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

User = settings.AUTH_USER_MODEL

LANG_CHOICES = [
    ("en", "English"), ("pl", "Polski"), ("de", "Deutsch"), ("fr", "Français"),
    ("es", "Español"), ("it", "Italiano"), ("pt", "Português"), ("zh", "中文"),
    ("hi", "हिन्दी"), ("ar", "العربية"),
]

TEMP_CHOICES = [("C", "Celsius"), ("F", "Fahrenheit"), ("K", "Kelvin")]
MEASURE_CHOICES = [("metric", "Metric"), ("imperial", "Imperial")]
BACKGROUND_CHOICES = [("bg1", "Background 1"), ("bg2", "Background 2"), ("bg3", "Background 3"), ("bg4", "Background 4")]
FAB_CHOICES = [("left", "Left"), ("right", "Right")]

# NEW: Tile motive choices (light / dark tiles)
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

    # NEW: Light / dark tile motive
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

    email_daily = models.BooleanField(default=True)
    email_hour = models.IntegerField(default=12, validators=[MinValueValidator(0), MaxValueValidator(23)])
    email_24h = models.BooleanField(default=False)

    push_daily = models.BooleanField(default=True)
    push_hour = models.IntegerField(default=12, validators=[MinValueValidator(0), MaxValueValidator(23)])
    push_24h = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"ProfileNotifications<{self.user}>"
