from __future__ import annotations

import json
from pathlib import Path

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from plant_definitions.models import PlantDefinition, PlantDefinitionTranslation

LANGS = ["en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko"]
MAX_TRAIT_TEXT_LEN = 40

# ---- Trait key normalization (consistency) ----
# Keep one canonical key per concept across your whole dataset.
TRAIT_KEY_ALIASES = {
    "watering": "water",
    "light": "sun",
    "fertiliser": "fertilizer",
}


def normalize_trait_key(key: str) -> str:
    k = (key or "").strip().lower()
    return TRAIT_KEY_ALIASES.get(k, k)


def normalize_traits_in_place(payload: dict) -> None:
    traits = payload.get("traits")
    if not isinstance(traits, list):
        return
    for t in traits:
        if not isinstance(t, dict):
            continue
        t["key"] = normalize_trait_key(t.get("key", ""))
    # drop empties
    payload["traits"] = [t for t in traits if isinstance(t, dict) and (t.get("key") or "").strip()]


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
            raise CommandError("Each trait.value must be like {'text': {'en': '...', 'pl': '...'}}")
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


def _is_probably_bad_image_name(name: str) -> bool:
    """
    Guard against accidentally storing 'plants/hero/foo.jpg' in the DB field name
    when upload_to already adds 'plants/hero/'.
    """
    n = (name or "").replace("\\", "/")
    return n.startswith("plants/hero/") or n.startswith("plants/thumb/") or n.startswith("/")


class Command(BaseCommand):
    help = "Seed/update PlantDefinitions from JSON files in plant_definitions/seed_data/plants/"

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            dest="only",
            default="",
            help="Seed only one plant file by filename stem (e.g. monstera_deliciosa)",
        )
        parser.add_argument(
            "--force-images",
            action="store_true",
            help="Always re-attach images from MEDIA_ROOT even if DB already has image fields set.",
        )

    def handle(self, *args, **options):
        seed_dir = _seed_dir()
        if not seed_dir.exists():
            raise CommandError(f"Seed folder not found: {seed_dir}")

        only = (options.get("only") or "").strip()
        force_images = bool(options.get("force_images", False))

        files = sorted(seed_dir.glob("*.json"))
        if only:
            # Interpret --only as filename stem first.
            candidate = seed_dir / f"{only}.json"
            if candidate.exists():
                files = [candidate]
            else:
                raise CommandError(f"File not found for --only={only}: {candidate}")

        if not files:
            self.stdout.write("No JSON files found.")
            return

        media_root = _media_root()

        ok = 0
        failed = 0

        for fp in files:
            try:
                payload = json.loads(fp.read_text(encoding="utf-8"))

                # Normalize trait keys before validating/storing (consistency fix)
                normalize_traits_in_place(payload)

                validate_plant_payload(payload)

                latin = payload["latin"].strip()
                desired_external_id = (payload.get("external_id") or "").strip()

                # Idempotent write: DB uniqueness is on latin, so upsert by latin
                with transaction.atomic():
                    obj, created = PlantDefinition.objects.update_or_create(
                        latin=latin,
                        defaults={
                            # IMPORTANT: do NOT blindly set external_id here, because it may be unique too
                            "name": (payload.get("name") or "").strip(),
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
                            "traits": payload.get("traits", []),
                        },
                    )

                    # Safely normalize external_id (only if provided and not taken by another row)
                    if desired_external_id:
                        taken = (
                            PlantDefinition.objects.filter(external_id=desired_external_id)
                            .exclude(pk=obj.pk)
                            .exists()
                        )
                        if not taken and obj.external_id != desired_external_id:
                            obj.external_id = desired_external_id
                            obj.save(update_fields=["external_id"])

                # Translations
                translations = payload["translations"]
                for lang in LANGS:
                    tr = translations.get(lang) or {}
                    common_name = (tr.get("common_name") or "").strip()
                    description = (tr.get("description") or "").strip()

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

                # ---- Images ----
                hero_name = (payload.get("image_hero") or "").strip()
                thumb_name = (payload.get("image_thumb") or "").strip()

                # Clear old bad values (e.g. 'plants/hero/...' stored inside the field name)
                if obj.image_hero and _is_probably_bad_image_name(obj.image_hero.name):
                    obj.image_hero.delete(save=False)
                if obj.image_thumb and _is_probably_bad_image_name(obj.image_thumb.name):
                    obj.image_thumb.delete(save=False)

                # Attach hero (always if force_images, otherwise if empty)
                if hero_name and (force_images or not obj.image_hero):
                    hero_path = media_root / "plants" / "hero" / hero_name
                    if hero_path.exists():
                        with open(hero_path, "rb") as f:
                            # IMPORTANT: pass only filename; upload_to adds plants/hero/
                            obj.image_hero.save(hero_name, File(f), save=False)

                # Attach thumb (always if force_images, otherwise if empty)
                if thumb_name and (force_images or not obj.image_thumb):
                    thumb_path = media_root / "plants" / "thumb" / thumb_name

                    # Fallback: some setups store thumbs in hero folder too
                    if not thumb_path.exists():
                        alt = media_root / "plants" / "hero" / thumb_name
                        if alt.exists():
                            thumb_path = alt

                    if thumb_path.exists():
                        with open(thumb_path, "rb") as f:
                            obj.image_thumb.save(thumb_name, File(f), save=False)

                obj.save()

                ok += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"OK  {payload.get('external_id')} ({fp.name})"
                    )
                )

            except Exception as e:
                failed += 1
                self.stdout.write(self.style.ERROR(f"ERR {fp.name}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Done. OK={ok}, Failed={failed}"))
