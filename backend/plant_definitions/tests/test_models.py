import pytest

from plant_definitions.models import (
    PlantDefinition,
    PlantDefinitionTrait,
    PlantDefinitionTranslation,
    PlantTraitDefinition,
    PlantTraitDefinitionTranslation,
)


def _plant(**overrides):
    data = {
        "external_id": "monstera_deliciosa",
        "name": "Monstera",
        "latin": "Monstera deliciosa",
        "sun": "medium",
        "water": "medium",
        "difficulty": "easy",
    }
    data.update(overrides)
    return PlantDefinition.objects.create(**data)


@pytest.mark.django_db
def test_plant_definition_string_representation_uses_name_and_latin():
    plant = _plant()

    assert str(plant) == "Monstera (Monstera deliciosa)"


@pytest.mark.django_db
def test_plant_definition_string_representation_falls_back_to_latin():
    plant = _plant(name="")

    assert str(plant) == "Monstera deliciosa (Monstera deliciosa)"


@pytest.mark.django_db
def test_plant_definition_translation_string_representation():
    plant = _plant()
    translation = PlantDefinitionTranslation.objects.create(
        plant_definition=plant,
        language_code="pl",
        common_name="Monstera dziurawa",
    )

    assert str(translation) == f"{plant.id} [pl]"


@pytest.mark.django_db
def test_trait_models_string_representations():
    plant = _plant()
    trait = PlantTraitDefinition.objects.create(key="pet-safe", category="safety")
    translation = PlantTraitDefinitionTranslation.objects.create(
        trait=trait,
        language_code="en",
        label="Pet safe",
    )
    value = PlantDefinitionTrait.objects.create(
        plant_definition=plant,
        trait=trait,
        value={"value": False},
    )

    assert str(trait) == "pet-safe"
    assert str(translation) == "pet-safe [en]"
    assert str(value) == f"{plant.id}:pet-safe"
