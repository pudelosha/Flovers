from django.core.management.base import BaseCommand
from django.utils.text import slugify

from plant_definitions.models import PlantDefinition


class Command(BaseCommand):
    help = "Fill missing PlantDefinition.external_id from latin name (snake_case), ensuring uniqueness."

    def handle(self, *args, **options):
        updated = 0

        qs = PlantDefinition.objects.all().only("id", "latin", "external_id")
        for plant in qs:
            if plant.external_id:
                continue

            base = (plant.latin or "").strip() or f"plant_{plant.id}"
            candidate = slugify(base).replace("-", "_") or f"plant_{plant.id}"

            unique = candidate
            i = 2
            while PlantDefinition.objects.filter(external_id=unique).exclude(id=plant.id).exists():
                unique = f"{candidate}_{i}"
                i += 1

            plant.external_id = unique
            plant.save(update_fields=["external_id"])
            updated += 1

        self.stdout.write(self.style.SUCCESS(f"Filled external_id for {updated} plants."))
