import pytest
from django.test import override_settings
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from plant_definitions.models import PlantDefinition, PlantDefinitionTranslation
from plant_definitions.serializers import (
    PlantDefinitionProfileSerializer,
    PlantDefinitionSuggestionSerializer,
    PopularPlantDefinitionSerializer,
    _abs_media_url,
    _get_translation,
    _pick_language,
)


def _plant(**overrides):
    data = {
        "external_id": "monstera_deliciosa",
        "name": "Monstera",
        "latin": "Monstera deliciosa",
        "sun": "medium",
        "water": "medium",
        "difficulty": "easy",
        "popular": True,
    }
    data.update(overrides)
    return PlantDefinition.objects.create(**data)


@pytest.mark.django_db
def test_get_translation_prefers_requested_language_and_falls_back_to_english():
    plant = _plant()
    en = PlantDefinitionTranslation.objects.create(
        plant_definition=plant,
        language_code="en",
        common_name="Swiss cheese plant",
    )
    pl = PlantDefinitionTranslation.objects.create(
        plant_definition=plant,
        language_code="pl",
        common_name="Monstera dziurawa",
    )

    assert _get_translation(plant, "pl") == pl
    assert _get_translation(plant, "de") == en


def test_pick_language_prefers_query_param_then_accept_language_header():
    factory = APIRequestFactory()

    request = Request(factory.get("/plants/", {"lang": "pl"}))
    assert _pick_language(request) == "pl"

    request = Request(factory.get("/plants/", HTTP_ACCEPT_LANGUAGE="de-DE,de;q=0.8"))
    assert _pick_language(request) == "de"

    assert _pick_language(None) == "en"


@override_settings(SITE_URL="https://api.example.com", MEDIA_URL="/media/")
def test_abs_media_url_handles_raw_strings():
    assert _abs_media_url(None, "plants/hero/monstera.jpg") == (
        "https://api.example.com/media/plants/hero/monstera.jpg"
    )
    assert _abs_media_url(None, "monstera.jpg") == (
        "https://api.example.com/media/plants/hero/monstera.jpg"
    )
    assert _abs_media_url(None, "https://cdn.example.com/monstera.jpg") == (
        "https://cdn.example.com/monstera.jpg"
    )


@pytest.mark.django_db
def test_popular_serializer_uses_language_context_for_display_name():
    plant = _plant()
    PlantDefinitionTranslation.objects.create(
        plant_definition=plant,
        language_code="pl",
        common_name="Monstera dziurawa",
    )

    data = PopularPlantDefinitionSerializer(
        plant,
        context={"request": None, "lang": "pl"},
    ).data

    assert data["display_name"] == "Monstera dziurawa"


@pytest.mark.django_db
def test_suggestion_serializer_uses_request_language_and_fallback_name():
    plant = _plant(name="Fallback name")
    PlantDefinitionTranslation.objects.create(
        plant_definition=plant,
        language_code="en",
        common_name="Swiss cheese plant",
    )
    request = Request(APIRequestFactory().get("/plants/", {"lang": "de"}))

    data = PlantDefinitionSuggestionSerializer(plant, context={"request": request}).data

    assert data["display_name"] == "Swiss cheese plant"


@pytest.mark.django_db
def test_profile_serializer_returns_translated_description_and_care_fields():
    plant = _plant(
        traits=[{"key": "easy-care"}],
        recommended_pot_materials=["terracotta"],
        recommended_soil_mixes=["aroid"],
        water_interval_days=7,
        moisture_required=True,
        moisture_interval_days=3,
    )
    PlantDefinitionTranslation.objects.create(
        plant_definition=plant,
        language_code="pl",
        common_name="Monstera dziurawa",
        description="Opis rosliny.",
    )
    request = Request(APIRequestFactory().get("/plants/", {"lang": "pl"}))

    data = PlantDefinitionProfileSerializer(plant, context={"request": request}).data

    assert data["display_name"] == "Monstera dziurawa"
    assert data["description"] == "Opis rosliny."
    assert data["traits"] == [{"key": "easy-care"}]
    assert data["recommended_pot_materials"] == ["terracotta"]
    assert data["water_interval_days"] == 7
    assert data["moisture_required"] is True
