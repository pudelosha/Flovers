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

class Plant(models.Model):
    name = models.CharField(max_length=120)
    latin = models.CharField(max_length=160, unique=True)

    popular = models.BooleanField(default=False)
    sun = models.CharField(max_length=10, choices=SUN_CHOICES)
    water = models.CharField(max_length=10, choices=WATER_CHOICES)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)

    # fields your working seeder expects
    image_thumb_url = models.URLField(blank=True, default="")
    image_hero_url = models.URLField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    traits = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.latin})"
