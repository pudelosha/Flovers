from django.core.management.base import BaseCommand
from django.core.files import File
from django.conf import settings

from plant_definitions.models import PlantDefinition, PlantDefinitionTranslation


class Command(BaseCommand):
    help = "Seed database with real-world plant definitions, traits and descriptions"

    def handle(self, *args, **options):
        plants = [
            {
                "external_id": "monstera_deliciosa",
                "name": "Monstera",
                "latin": "Monstera deliciosa",
                "sun": "medium",
                "water": "medium",
                "difficulty": "easy",
                "popular": True,
                "recommended_pot_materials": ["ceramic", "plastic"],
                "recommended_soil_mixes": ["aroid", "universal"],
                "water_required": True,
                "water_interval_days": 7,
                "moisture_required": True,
                "moisture_interval_days": 3,
                "fertilize_required": True,
                "fertilize_interval_days": 30,
                "repot_required": True,
                "repot_interval_months": 12,
                "hero": "plants/hero/monstera_deliciosa.jpg",
                "thumb": "plants/thumb/monstera_deliciosa.jpg",
                "traits": [
                    {"key": "sun", "value": "Bright, indirect"},
                    {"key": "soil", "value": "Well-draining, rich aroid mix"},
                    {"key": "watering", "value": "Moderate; allow topsoil to dry"},
                    {"key": "difficulty", "value": "Easy"},
                    {"key": "temperature", "value": "18–27°C"},
                    {"key": "humidity", "value": "Medium–High"},
                    {"key": "toxic", "value": "Toxic to pets"},
                    {"key": "growth", "value": "Large, climbing"},
                ],
                # ✅ 2–3 sentence description
                "description_en": (
                    "Monstera deliciosa is a popular tropical houseplant known for its large, split leaves. "
                    "It grows best in bright, indirect light with evenly moist (not soggy) soil and higher humidity. "
                    "Given a moss pole or support, it will climb and produce larger leaves over time."
                ),
            },
            {
                "external_id": "sansevieria_zeylanica",
                "name": "Snake Plant",
                "latin": "Sansevieria zeylanica",
                "sun": "low",
                "water": "low",
                "difficulty": "very_easy",
                "popular": True,
                "recommended_pot_materials": ["ceramic"],
                "recommended_soil_mixes": ["cactus"],
                "water_required": True,
                "water_interval_days": 14,
                "moisture_required": False,
                "fertilize_required": False,
                "repot_required": True,
                "repot_interval_months": 24,
                "hero": "plants/hero/sansevieria_zeylanica.jpg",
                "thumb": "plants/thumb/sansevieria_zeylanica.jpg",
                "traits": [
                    {"key": "sun", "value": "Low to bright, indirect"},
                    {"key": "soil", "value": "Cactus / gritty mix"},
                    {"key": "watering", "value": "Sparse; drought-tolerant"},
                    {"key": "difficulty", "value": "Very easy"},
                    {"key": "temperature", "value": "15–30°C"},
                    {"key": "humidity", "value": "Low–Medium"},
                    {"key": "toxic", "value": "Toxic to pets"},
                    {"key": "growth", "value": "Upright, slow-growing"},
                ],
                # ✅ 2–3 sentence description
                "description_en": (
                    "Sansevieria zeylanica (snake plant) is a tough, upright houseplant that tolerates low light and irregular care. "
                    "Let the soil dry out between waterings, and use a gritty, fast-draining mix to prevent root rot. "
                    "It grows slowly and is a great choice for beginners and low-maintenance spaces."
                ),
            },
        ]

        for p in plants:
            obj, _ = PlantDefinition.objects.update_or_create(
                external_id=p["external_id"],
                defaults={
                    "name": p["name"],
                    "latin": p["latin"],
                    "sun": p["sun"],
                    "water": p["water"],
                    "difficulty": p["difficulty"],
                    "popular": p["popular"],
                    "recommended_pot_materials": p["recommended_pot_materials"],
                    "recommended_soil_mixes": p["recommended_soil_mixes"],
                    "water_required": p.get("water_required", False),
                    "water_interval_days": p.get("water_interval_days"),
                    "moisture_required": p.get("moisture_required", False),
                    "moisture_interval_days": p.get("moisture_interval_days"),
                    "fertilize_required": p.get("fertilize_required", False),
                    "fertilize_interval_days": p.get("fertilize_interval_days"),
                    "repot_required": p.get("repot_required", False),
                    "repot_interval_months": p.get("repot_interval_months"),
                    "traits": p["traits"],
                },
            )

            # ✅ translation row (EN)
            PlantDefinitionTranslation.objects.update_or_create(
                plant_definition=obj,
                language_code="en",
                defaults={
                    "common_name": p["name"],
                    "description": p.get("description_en", ""),
                },
            )

            hero = settings.MEDIA_ROOT / p["hero"]
            thumb = settings.MEDIA_ROOT / p["thumb"]

            if hero.exists() and not obj.image_hero:
                with open(hero, "rb") as f:
                    obj.image_hero.save(hero.name, File(f), save=False)

            if thumb.exists() and not obj.image_thumb:
                with open(thumb, "rb") as f:
                    obj.image_thumb.save(thumb.name, File(f), save=False)

            obj.save()

        self.stdout.write(self.style.SUCCESS("✅ Plant seed data updated (traits + descriptions)"))
