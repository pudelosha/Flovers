import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from plant_definitions.models import PlantDefinition, PlantDefinitionTranslation

User = get_user_model()


def _plant(**overrides):
    data = {
        "external_id": "monstera_deliciosa",
        "name": "Monstera",
        "latin": "Monstera deliciosa",
        "sun": "medium",
        "water": "medium",
        "difficulty": "easy",
        "popular": False,
    }
    data.update(overrides)
    return PlantDefinition.objects.create(**data)


def test_popular_plant_definitions_requires_authentication():
    response = APIClient().get(reverse("plant-definitions-popular"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_popular_plant_definitions_returns_only_popular_with_translation():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    popular = _plant(popular=True)
    _plant(
        external_id="ficus_elastica",
        name="Ficus",
        latin="Ficus elastica",
        popular=False,
    )
    PlantDefinitionTranslation.objects.create(
        plant_definition=popular,
        language_code="pl",
        common_name="Monstera dziurawa",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("plant-definitions-popular"), data={"lang": "pl"})

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == popular.id
    assert data[0]["display_name"] == "Monstera dziurawa"


@pytest.mark.django_db
def test_search_index_filters_by_latin_and_accepts_underscores():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    monstera = _plant()
    _plant(
        external_id="ficus_elastica",
        name="Ficus",
        latin="Ficus elastica",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        reverse("plant-definitions-search-index"),
        data={"search": "monstera_deliciosa"},
    )

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == monstera.id
    assert data[0]["latin"] == "Monstera deliciosa"


@pytest.mark.django_db
def test_profile_by_id_returns_translated_profile():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(water_interval_days=7)
    PlantDefinitionTranslation.objects.create(
        plant_definition=plant,
        language_code="pl",
        common_name="Monstera dziurawa",
        description="Opis rosliny.",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        reverse("plant-definitions-profile", args=[plant.id]),
        data={"lang": "pl"},
    )

    data = response.json()
    assert response.status_code == 200
    assert data["id"] == plant.id
    assert data["display_name"] == "Monstera dziurawa"
    assert data["description"] == "Opis rosliny."
    assert data["water_interval_days"] == 7


@pytest.mark.django_db
def test_profile_by_external_id_returns_profile():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant()
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        reverse("plant-definitions-profile-by-key", args=[plant.external_id])
    )

    data = response.json()
    assert response.status_code == 200
    assert data["id"] == plant.id
    assert data["external_id"] == "monstera_deliciosa"


@pytest.mark.django_db
def test_profile_by_key_resolves_canonical_key_against_legacy_punctuated_external_id():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(
        external_id="echeveria_'black_prince'",
        name="Echeveria Black Prince",
        latin="Echeveria 'Black Prince'",
        sun="high",
        water="low",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(
        reverse("plant-definitions-profile-by-key", args=["echeveria_black_prince"])
    )

    data = response.json()
    assert response.status_code == 200
    assert data["id"] == plant.id
    assert data["external_id"] == "echeveria_'black_prince'"
