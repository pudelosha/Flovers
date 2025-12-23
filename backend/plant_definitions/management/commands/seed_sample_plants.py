# plant_definitions/management/commands/seed_sample_plants.py
from django.core.management.base import BaseCommand
from django.core.files import File
from django.conf import settings

from plant_definitions.models import PlantDefinition


class Command(BaseCommand):
    help = "Seed database with sample plant definitions (Monstera, Sansevieria)"

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
                "water_required": True,
                "water_interval_days": 7,
                "moisture_required": True,
                "moisture_interval_days": 3,
                "fertilize_required": True,
                "fertilize_interval_days": 30,
                "repot_required": True,
                "repot_interval_months": 12,
                "recommended_pot_materials": ["ceramic", "plastic"],
                "recommended_soil_mixes": ["universal", "aroid"],
                "hero": "plants/hero/monstera_deliciosa.jpg",
                "thumb": "plants/thumb/monstera_deliciosa.jpg",
            },
            {
                "external_id": "sansevieria_zeylanica",
                "name": "Snake Plant",
                "latin": "Sansevieria zeylanica",
                "sun": "low",
                "water": "low",
                "difficulty": "very_easy",
                "popular": True,
                "water_required": True,
                "water_interval_days": 14,
                "moisture_required": False,
                "fertilize_required": False,
                "repot_required": True,
                "repot_interval_months": 24,
                "recommended_pot_materials": ["ceramic"],
                "recommended_soil_mixes": ["cactus"],
                "hero": "plants/hero/sansevieria_zeylanica.jpg",
                "thumb": "plants/thumb/sansevieria_zeylanica.jpg",
            },
        ]

        created = 0
        updated = 0
        images_attached = 0

        for p in plants:
            obj, is_created = PlantDefinition.objects.get_or_create(
                external_id=p["external_id"],
                defaults={
                    "name": p["name"],
                    "latin": p["latin"],
                    "sun": p["sun"],
                    "water": p["water"],
                    "difficulty": p["difficulty"],
                    "popular": p["popular"],
                    "water_required": p.get("water_required", False),
                    "water_interval_days": p.get("water_interval_days"),
                    "moisture_required": p.get("moisture_required", False),
                    "moisture_interval_days": p.get("moisture_interval_days"),
                    "fertilize_required": p.get("fertilize_required", False),
                    "fertilize_interval_days": p.get("fertilize_interval_days"),
                    "repot_required": p.get("repot_required", False),
                    "repot_interval_months": p.get("repot_interval_months"),
                    "recommended_pot_materials": p.get("recommended_pot_materials", []),
                    "recommended_soil_mixes": p.get("recommended_soil_mixes", []),
                },
            )

            if is_created:
                created += 1
            else:
                # ✅ ensure existing rows are updated too (especially images)
                obj.name = p["name"]
                obj.latin = p["latin"]
                obj.sun = p["sun"]
                obj.water = p["water"]
                obj.difficulty = p["difficulty"]
                obj.popular = p["popular"]

                obj.water_required = p.get("water_required", False)
                obj.water_interval_days = p.get("water_interval_days")
                obj.moisture_required = p.get("moisture_required", False)
                obj.moisture_interval_days = p.get("moisture_interval_days")
                obj.fertilize_required = p.get("fertilize_required", False)
                obj.fertilize_interval_days = p.get("fertilize_interval_days")
                obj.repot_required = p.get("repot_required", False)
                obj.repot_interval_months = p.get("repot_interval_months")
                obj.recommended_pot_materials = p.get("recommended_pot_materials", [])
                obj.recommended_soil_mixes = p.get("recommended_soil_mixes", [])
                updated += 1

            # ✅ attach images even if object already existed
            hero_path = settings.MEDIA_ROOT / p["hero"]
            thumb_path = settings.MEDIA_ROOT / p["thumb"]

            changed = False

            if hero_path.exists() and not obj.image_hero:
                with open(hero_path, "rb") as f:
                    obj.image_hero.save(hero_path.name, File(f), save=False)
                changed = True

            if thumb_path.exists() and not obj.image_thumb:
                with open(thumb_path, "rb") as f:
                    obj.image_thumb.save(thumb_path.name, File(f), save=False)
                changed = True

            if changed:
                images_attached += 1

            obj.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed completed. Created={created}, Updated={updated}, ImagesAttached/Fixed={images_attached}"
            )
        )
