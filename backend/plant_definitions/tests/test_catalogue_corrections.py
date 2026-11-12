import importlib
import json
from pathlib import Path

import pytest
from django.apps import apps

from plant_definitions.models import PlantDefinitionTranslation
from plant_definitions.tests.test_models import _plant

correction = importlib.import_module("plant_definitions.migrations.0005_reviewed_catalogue_corrections")


def payload(*plants):
    return {"format": 1, "plants": list(plants)}


def entry(plant, *changes):
    return {"latin": plant.latin, "changes": list(changes)}


def patch(path, before, after):
    return {"path": path, "before": before, "after": after}


@pytest.mark.django_db
def test_corrections_are_idempotent_and_preserve_unrelated_trait_edits():
    plant = _plant(traits=[{"key": "toxic", "value": {"text": {"en": "Non-toxic", "pl": "Keep existing translation"}}},
                           {"key": "soil", "value": {"text": {"en": "Administrator's separate edit"}}}])
    data = payload(entry(plant, patch(["traits", "toxic", "value", "text", "en"], "Non-toxic", "Toxic if ingested"),
                         patch(["traits", "toxic", "value", "text", "ru"], None, "Reviewed warning"),
                         patch(["pruning_required"], False, True), patch(["pruning_interval_days"], None, 60)))
    result = correction.apply_payload(apps, "default", data)
    assert result["changed_fields"] == 4
    assert correction.apply_payload(apps, "default", data)["changed_fields"] == 0
    plant.refresh_from_db()
    assert plant.traits[0]["value"]["text"]["pl"] == "Keep existing translation"
    assert plant.traits[1]["value"]["text"]["en"] == "Administrator's separate edit"
    assert plant.pruning_required and plant.pruning_interval_days == 60


@pytest.mark.django_db(transaction=True)
def test_unexpected_value_rolls_back_all_prior_corrections():
    first = _plant(latin="First audited species")
    second = _plant(latin="Second audited species", external_id="second_audited_species", pruning_interval_days=120)
    data = payload(entry(first, patch(["pruning_interval_days"], None, 60)),
                   entry(second, patch(["pruning_interval_days"], None, 90)))
    with pytest.raises(RuntimeError, match="unexpected existing value was preserved"):
        correction.apply_payload(apps, "default", data)
    first.refresh_from_db()
    assert first.pruning_interval_days is None


@pytest.mark.django_db
def test_new_definition_translations_are_complete_and_idempotent():
    plant = _plant()
    data = payload(entry(plant, patch(["translations", "ru", "common_name"], None, "Plant name"),
                         patch(["translations", "ru", "description"], None, "Translated description")))
    correction.apply_payload(apps, "default", data)
    correction.apply_payload(apps, "default", data)
    assert PlantDefinitionTranslation.objects.filter(plant_definition=plant, language_code="ru").count() == 1


@pytest.mark.django_db
def test_missing_seed_definitions_do_not_break_fresh_installation():
    data = payload({"latin": "Not seeded", "changes": [patch(["pruning_required"], False, True)]})
    assert correction.apply_payload(apps, "default", data)["unseeded_definitions"] == 1


def test_frozen_migration_payload_is_valid_and_contains_no_duplicate_paths():
    data = json.loads(Path(correction.__file__).with_suffix(".json").read_text(encoding="utf-8"))
    assert data["format"] == 1
    assert len(data["plants"]) == 734
    for plant in data["plants"]:
        paths = [tuple(change["path"]) for change in plant["changes"]]
        assert len(paths) == len(set(paths))
        for change in plant["changes"]:
            correction._validate_path(change["path"])


def test_corrected_seeds_match_every_frozen_migration_value():
    root = Path(correction.__file__).parents[1]
    data = json.loads(Path(correction.__file__).with_suffix(".json").read_text(encoding="utf-8"))
    seeds = {plant["latin"]: plant for file in (root / "seed_data" / "plants").glob("*.json")
             for plant in [json.loads(file.read_text(encoding="utf-8"))]}
    for entry in data["plants"]:
        for change in entry["changes"]:
            current = seeds[entry["latin"]]
            for key in change["path"]:
                if isinstance(current, list):
                    current = next(item for item in current if
                                   {"watering": "water", "light": "sun", "fertiliser": "fertilizer"}.get(item["key"], item["key"]) == key)
                else:
                    current = current[key]
            assert current == change["after"], (entry["latin"], change["path"])


@pytest.mark.django_db
def test_definition_corrections_do_not_rewrite_user_plants_or_schedules():
    from django.contrib.auth import get_user_model
    from locations.models import Location
    from plant_instances.models import PlantInstance
    from reminders.models import Reminder, ReminderTask
    definition = _plant()
    user = get_user_model().objects.create_user(email="catalogue-care@example.test")
    location = Location.objects.create(user=user, name="Room")
    plant = PlantInstance.objects.create(user=user, location=location, plant_definition=definition,
                                         display_name="Keep my plant", notes="User notes", water_interval_days=11)
    reminder = Reminder.objects.create(user=user, plant=plant, type="water", start_date="2026-11-09", interval_value=11)
    task = ReminderTask.objects.create(user=user, reminder=reminder, due_date="2026-11-20", note="Keep task note")
    correction.apply_payload(apps, "default", payload(entry(definition, patch(["water_interval_days"], None, 7))))
    plant.refresh_from_db()
    reminder.refresh_from_db()
    task.refresh_from_db()
    assert (plant.water_interval_days, plant.notes) == (11, "User notes")
    assert reminder.interval_value == 11
    assert str(task.due_date) == "2026-11-20" and task.note == "Keep task note"
    assert Reminder.objects.count() == 1 and ReminderTask.objects.count() == 1
