from django.core.management.base import BaseCommand
from plants.models import Plant

SAMPLES = [
    dict(
        name="Monstera",
        latin="Monstera deliciosa",
        popular=True, sun="medium", water="medium", difficulty="easy",
        image_thumb_url="https://images.unsplash.com/photo-1551970634-747846a548cb?w=400",
        image_hero_url="https://images.unsplash.com/photo-1470058869958-2a77ade41c02?w=1200",
        description="General indoor plant that prefers bright, indirect light and moderate watering.",
        traits=[
            {"key": "sun", "value": "Bright, indirect"},
            {"key": "soil", "value": "Well-draining"},
            {"key": "temp", "value": "18–26°C"},
            {"key": "humidity", "value": "Medium–High"},
            {"key": "difficulty", "value": "Easy"},
            {"key": "watering", "value": "Weekly"},
            {"key": "moisture", "value": "Mist sometimes"},
        ],
    ),
    dict(
        name="Snake Plant",
        latin="Sansevieria trifasciata",
        popular=True, sun="low", water="low", difficulty="easy",
        image_thumb_url="https://images.unsplash.com/photo-1608178398319-48f814d0750c?w=400",
        image_hero_url="https://images.unsplash.com/photo-1614594821361-1b98b5eb2d4a?w=1200",
        description="Very tolerant plant: low light, infrequent watering.",
        traits=[
            {"key": "sun", "value": "Low–Medium"},
            {"key": "soil", "value": "Fast draining"},
            {"key": "watering", "value": "Every 2–3 weeks"},
            {"key": "difficulty", "value": "Easy"},
        ],
    ),
]

class Command(BaseCommand):
    help = "Seed a few demo plants"

    def handle(self, *args, **opts):
        for p in SAMPLES:
            obj, created = Plant.objects.update_or_create(
                latin=p["latin"],  # use latin as stable key
                defaults=p,
            )
            self.stdout.write(self.style.SUCCESS(
                f"{'Created' if created else 'Updated'}: {obj.name}"
            ))
