from django.db import models
from django.utils import timezone

SUN_CHOICES = [
    ("low", "Low"),
    ("medium", "Medium"),
    ("high", "High"),
]
WATER_CHOICES = [
    ("low", "Low"),
    ("medium", "Medium"),
    ("high", "High"),
]
DIFFICULTY_CHOICES = [
    ("easy", "Easy"),
    ("medium", "Medium"),
    ("hard", "Hard"),
]


class PlantDefinition(models.Model):
    external_id = models.SlugField(max_length=160, unique=True, db_index=True)

    name = models.CharField(max_length=120, blank=True, default="")
    latin = models.CharField(max_length=160, unique=True)

    popular = models.BooleanField(default=False)
    sun = models.CharField(max_length=10, choices=SUN_CHOICES)
    water = models.CharField(max_length=10, choices=WATER_CHOICES)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)

    # Images (Option C: filesystem media)
    image_thumb = models.ImageField(upload_to="plants/thumb/", blank=True, null=True)
    image_hero = models.ImageField(upload_to="plants/hero/", blank=True, null=True)

    # Keep existing traits JSON for backward compatibility
    traits = models.JSONField(default=list, blank=True)

    # recommended keys (frontend translates)
    recommended_pot_materials = models.JSONField(default=list, blank=True)
    recommended_soil_mixes = models.JSONField(default=list, blank=True)

    # intervals + required flags
    water_required = models.BooleanField(default=True)
    water_interval_days = models.PositiveSmallIntegerField(null=True, blank=True)

    moisture_required = models.BooleanField(default=False)
    moisture_interval_days = models.PositiveSmallIntegerField(null=True, blank=True)

    fertilize_required = models.BooleanField(default=False)
    fertilize_interval_days = models.PositiveSmallIntegerField(null=True, blank=True)

    repot_required = models.BooleanField(default=True)
    repot_interval_months = models.PositiveSmallIntegerField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "latin"]

    def __str__(self):
        base = self.name.strip() or self.latin
        return f"{base} ({self.latin})"


class PlantDefinitionTranslation(models.Model):
    plant_definition = models.ForeignKey(
        PlantDefinition, on_delete=models.CASCADE, related_name="translations"
    )
    language_code = models.CharField(max_length=10, db_index=True)  # "en", "pl", "de", ...

    common_name = models.CharField(max_length=160, blank=True, default="")
    description = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("plant_definition", "language_code")]
        indexes = [models.Index(fields=["language_code"])]

    def __str__(self):
        return f"{self.plant_definition_id} [{self.language_code}]"


class PlantTraitDefinition(models.Model):
    key = models.SlugField(max_length=80, unique=True, db_index=True)
    category = models.CharField(max_length=80, blank=True, default="")

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return self.key


class PlantTraitDefinitionTranslation(models.Model):
    trait = models.ForeignKey(
        PlantTraitDefinition, on_delete=models.CASCADE, related_name="translations"
    )
    language_code = models.CharField(max_length=10, db_index=True)
    label = models.CharField(max_length=160)
    help_text = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("trait", "language_code")]
        indexes = [models.Index(fields=["language_code"])]

    def __str__(self):
        return f"{self.trait.key} [{self.language_code}]"


class PlantDefinitionTrait(models.Model):
    plant_definition = models.ForeignKey(
        PlantDefinition, on_delete=models.CASCADE, related_name="plant_traits"
    )
    trait = models.ForeignKey(
        PlantTraitDefinition, on_delete=models.PROTECT, related_name="plant_values"
    )
    value = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("plant_definition", "trait")]
        indexes = [
            models.Index(fields=["plant_definition"]),
            models.Index(fields=["trait"]),
        ]

    def __str__(self):
        return f"{self.plant_definition_id}:{self.trait.key}"
