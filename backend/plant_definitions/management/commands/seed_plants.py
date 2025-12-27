from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from plant_definitions.models import PlantDefinition, PlantDefinitionTranslation


LANGS = ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"]
MAX_TRAIT_TEXT_LEN = 25


def _media_root() -> Path:
    mr = getattr(settings, "MEDIA_ROOT", None)
    if not mr:
        raise CommandError("settings.MEDIA_ROOT is not set.")
    return Path(mr)


def _seed_dir() -> Path:
    # plant_definitions/management/commands/seed_plants.py -> plant_definitions/
    app_dir = Path(__file__).resolve().parents[2]
    return app_dir / "seed_data" / "plants"


def normalize_difficulty(value: str) -> str:
    # Your DIFFICULTY_CHOICES: easy, medium, hard
    if value == "very_easy":
        return "easy"
    return value


def validate_plant_payload(p: dict) -> None:
    required = ["external_id", "latin", "sun", "water", "difficulty", "traits", "translations"]
    missing = [k for k in required if k not in p]
    if missing:
        raise CommandError(f"Missing required keys: {missing}")

    if not isinstance(p["traits"], list):
        raise CommandError("traits must be a list")

    if not isinstance(p["translations"], dict):
        raise CommandError("translations must be an object/dict keyed by language code")

    # Validate trait multi-lang text length
    for trait in p["traits"]:
        if "key" not in trait or "value" not in trait:
            raise CommandError("Each trait must have 'key' and 'value'")
        val = trait["value"]
        if not isinstance(val, dict) or "text" not in val or not isinstance(val["text"], dict):
            raise CommandError(
                "Each trait.value must be like {'text': {'en': '...', 'pl': '...'}}"
            )
        for lang, txt in val["text"].items():
            if txt is None:
                continue
            if not isinstance(txt, str):
                raise CommandError(f"Trait '{trait['key']}' text for '{lang}' must be a string")
            if len(txt) > MAX_TRAIT_TEXT_LEN:
                raise CommandError(
                    f"Trait '{trait['key']}' text too long for '{lang}' "
                    f"({len(txt)} > {MAX_TRAIT_TEXT_LEN}): '{txt}'"
                )


class Command(BaseCommand):
    help = "Seed/update PlantDefinitions from JSON files in plant_definitions/seed_data/plants/"

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            dest="only",
            default="",
            help="Seed only one plant file by external_id (e.g. monstera_deliciosa)",
        )

    def handle(self, *args, **options):
        seed_dir = _seed_dir()
        if not seed_dir.exists():
            raise CommandError(f"Seed folder not found: {seed_dir}")

        only = (options.get("only") or "").strip()

        files = sorted(seed_dir.glob("*.json"))
        if only:
            files = [seed_dir / f"{only}.json"]
            if not files[0].exists():
                raise CommandError(f"File not found for --only={only}: {files[0]}")

        if not files:
            self.stdout.write("No JSON files found.")
            return

        media_root = _media_root()

        ok = 0
        failed = 0

        for fp in files:
            try:
                payload = json.loads(fp.read_text(encoding="utf-8"))
                validate_plant_payload(payload)

                # Defaults / canonical (non-translated) fields
                obj, _ = PlantDefinition.objects.update_or_create(
                    external_id=payload["external_id"],
                    defaults={
                        "name": (payload.get("name") or "").strip(),
                        "latin": payload["latin"].strip(),
                        "sun": payload["sun"],
                        "water": payload["water"],
                        "difficulty": normalize_difficulty(payload["difficulty"]),
                        "popular": bool(payload.get("popular", False)),
                        "recommended_pot_materials": payload.get("recommended_pot_materials", []),
                        "recommended_soil_mixes": payload.get("recommended_soil_mixes", []),
                        "water_required": bool(payload.get("water_required", False)),
                        "water_interval_days": payload.get("water_interval_days"),
                        "moisture_required": bool(payload.get("moisture_required", False)),
                        "moisture_interval_days": payload.get("moisture_interval_days"),
                        "fertilize_required": bool(payload.get("fertilize_required", False)),
                        "fertilize_interval_days": payload.get("fertilize_interval_days"),
                        "repot_required": bool(payload.get("repot_required", False)),
                        "repot_interval_months": payload.get("repot_interval_months"),
                        # Legacy traits JSON (now multilingual)
                        "traits": payload.get("traits", []),
                    },
                )

                # Translations
                translations = payload["translations"]
                for lang in LANGS:
                    tr = translations.get(lang) or {}
                    common_name = (tr.get("common_name") or "").strip()
                    description = (tr.get("description") or "").strip()

                    # Fallbacks
                    if not common_name:
                        common_name = (
                            (translations.get("en") or {}).get("common_name")
                            or payload.get("name")
                            or obj.name
                            or obj.latin
                        ).strip()
                    if not description:
                        description = ((translations.get("en") or {}).get("description") or "").strip()

                    PlantDefinitionTranslation.objects.update_or_create(
                        plant_definition=obj,
                        language_code=lang,
                        defaults={"common_name": common_name, "description": description},
                    )

                # Images: JSON provides filenames; you keep files in MEDIA_ROOT/plants/...
                hero_name = (payload.get("image_hero") or "").strip()   # e.g. "monstera_deliciosa.jpg"
                thumb_name = (payload.get("image_thumb") or "").strip() # e.g. "monstera_deliciosa.jpg"

                if hero_name and not obj.image_hero:
                    hero_path = media_root / "plants" / "hero" / hero_name
                    if hero_path.exists():
                        with open(hero_path, "rb") as f:
                            # store under upload_to path (plants/hero/)
                            obj.image_hero.save(f"plants/hero/{hero_name}", File(f), save=False)

                if thumb_name and not obj.image_thumb:
                    thumb_path = media_root / "plants" / "thumb" / thumb_name
                    if thumb_path.exists():
                        with open(thumb_path, "rb") as f:
                            obj.image_thumb.save(f"plants/thumb/{thumb_name}", File(f), save=False)

                obj.save()
                ok += 1
                self.stdout.write(self.style.SUCCESS(f"OK  {payload['external_id']} ({fp.name})"))

            except Exception as e:
                failed += 1
                self.stdout.write(self.style.ERROR(f"ERR {fp.name}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Done. OK={ok}, Failed={failed}"))
