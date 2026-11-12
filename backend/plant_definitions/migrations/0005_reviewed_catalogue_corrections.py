"""Apply frozen, reviewed definition changes without touching users' care plans."""
import copy
import json
from pathlib import Path

from django.db import migrations, transaction


TOP_LEVEL_FIELDS = {
    "name",
    "recommended_pot_materials", "recommended_soil_mixes", "water_required",
    "water_interval_days", "moisture_required", "moisture_interval_days",
    "fertilize_required", "fertilize_interval_days", "pruning_required",
    "pruning_interval_days", "repot_required", "repot_interval_months",
}
LANGUAGES = {"en", "pl", "de", "it", "fr", "es", "pt", "ar", "hi", "zh", "ja", "ko", "id", "ru", "tr"}


def _validate_path(path):
    if len(path) == 1 and path[0] in TOP_LEVEL_FIELDS:
        return
    if (len(path) == 5 and path[:1] == ["traits"] and
            path[2:4] == ["value", "text"] and path[4] in LANGUAGES):
        return
    if (len(path) == 3 and path[0] == "translations" and
            path[1] in LANGUAGES and path[2] in {"common_name", "description"}):
        return
    raise RuntimeError(f"Unsupported catalogue correction path: {path!r}")


def apply_payload(apps, alias, payload):
    """Check before/after values atomically; preserve edits outside each leaf."""
    if payload.get("format") != 1 or not isinstance(payload.get("plants"), list):
        raise RuntimeError("Invalid reviewed catalogue correction payload")
    Definition = apps.get_model("plant_definitions", "PlantDefinition")
    Translation = apps.get_model("plant_definitions", "PlantDefinitionTranslation")
    changed = unchanged = missing = 0
    with transaction.atomic(using=alias):
        for entry in payload["plants"]:
            rows = list(Definition.objects.using(alias).select_for_update().filter(latin=entry["latin"]))
            if not rows:
                # A fresh installation has no seeded catalogue yet. The seed
                # files carry the same corrected values for a later import.
                missing += 1
                continue
            if len(rows) != 1:
                raise RuntimeError(f"Ambiguous catalogue identity: {entry['latin']}")
            plant = rows[0]
            traits = copy.deepcopy(plant.traits)
            translations = {row.language_code: row for row in Translation.objects.using(alias).filter(plant_definition_id=plant.pk)}
            dirty_fields, dirty_translations = set(), set()
            for patch in entry["changes"]:
                path, before, after = patch["path"], patch["before"], patch["after"]
                _validate_path(path)
                if len(path) == 1:
                    current = getattr(plant, path[0])
                elif path[0] == "traits":
                    matches = [item for item in traits if item.get("key") == path[1]]
                    if len(matches) != 1:
                        raise RuntimeError(f"Missing/ambiguous trait for {entry['latin']}: {path[1]}")
                    texts = matches[0].setdefault("value", {}).setdefault("text", {})
                    current = texts.get(path[4])
                else:
                    row = translations.get(path[1])
                    current = getattr(row, path[2]) if row is not None and row.pk else None
                if current == after:
                    unchanged += 1
                    continue
                if current != before:
                    raise RuntimeError(
                        f"Catalogue correction conflict for {entry['latin']} at {'.'.join(path)}; "
                        "unexpected existing value was preserved. Review before retrying."
                    )
                if len(path) == 1:
                    setattr(plant, path[0], copy.deepcopy(after))
                    dirty_fields.add(path[0])
                elif path[0] == "traits":
                    texts[path[4]] = after
                    dirty_fields.add("traits")
                else:
                    lang = path[1]
                    if lang not in translations:
                        translations[lang] = Translation(plant_definition_id=plant.pk, language_code=lang)
                    setattr(translations[lang], path[2], after)
                    dirty_translations.add(lang)
                changed += 1
            if "traits" in dirty_fields:
                plant.traits = traits
            if dirty_fields:
                plant.save(using=alias, update_fields=sorted(dirty_fields))
            for lang in sorted(dirty_translations):
                row = translations[lang]
                if not row.common_name or not row.description:
                    raise RuntimeError(f"Incomplete catalogue translation for {entry['latin']}: {lang}")
                row.save(using=alias)
    return {"changed_fields": changed, "already_correct": unchanged, "unseeded_definitions": missing}


def forwards(apps, schema_editor):
    payload = json.loads(Path(__file__).with_suffix(".json").read_text(encoding="utf-8"))
    result = apply_payload(apps, schema_editor.connection.alias, payload)
    print("Reviewed catalogue corrections: " + json.dumps(result, sort_keys=True))


class Migration(migrations.Migration):
    dependencies = [("plant_definitions", "0004_pruning_support")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
