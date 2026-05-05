import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from locations.models import Location
from plant_definitions.models import PlantDefinition
from plant_instances.models import PlantInstance

User = get_user_model()


def _plant_definition(**overrides):
    data = {
        "external_id": "monstera-deliciosa",
        "name": "Monstera",
        "latin": "Monstera deliciosa",
        "sun": "medium",
        "water": "medium",
        "difficulty": "easy",
    }
    data.update(overrides)
    return PlantDefinition.objects.create(**data)


def test_plant_instance_list_requires_authentication():
    response = APIClient().get(reverse("plant-instance-list-create"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_create_plant_instance_with_existing_location_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    definition = _plant_definition()
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("plant-instance-list-create"),
        data={
            "plant_definition_id": definition.id,
            "location_id": location.id,
            "display_name": "Monstera",
            "notes": "Near the window.",
            "light_level": "bright-indirect",
            "orientation": "E",
            "distance_cm": 120,
            "pot_material": "terracotta",
            "soil_mix": "aroid",
        },
        format="json",
    )

    data = response.json()
    plant = PlantInstance.objects.get(user=user)

    assert response.status_code == 201
    assert data["id"] == plant.id
    assert data["location_id"] == location.id
    assert data["plant_definition_id"] == definition.id
    assert data["display_name"] == "Monstera"
    assert data["notes"] == "Near the window."
    assert data["qr_code"] == plant.qr_code
    assert plant.location == location
    assert plant.plant_definition == definition


@pytest.mark.django_db
def test_create_plant_instance_rejects_other_users_location_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    other_user = User.objects.create_user(
        email="other@example.com",
        password="strong-password-123",
    )
    other_location = Location.objects.create(
        user=other_user,
        name="Office",
        category="indoor",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("plant-instance-list-create"),
        data={
            "location_id": other_location.id,
            "display_name": "Monstera",
        },
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert "location_id" in data
    assert PlantInstance.objects.filter(user=user).exists() is False


@pytest.mark.django_db
def test_create_plant_instance_rejects_missing_location_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("plant-instance-list-create"),
        data={"display_name": "Monstera"},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert "location_id" in data


@pytest.mark.django_db
def test_list_plant_instances_returns_only_current_users_plants():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    other_user = User.objects.create_user(
        email="other@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    other_location = Location.objects.create(
        user=other_user,
        name="Office",
        category="indoor",
    )
    plant = PlantInstance.objects.create(
        user=user,
        location=location,
        display_name="Monstera",
    )
    PlantInstance.objects.create(
        user=other_user,
        location=other_location,
        display_name="Other plant",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("plant-instance-list-create"))

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == plant.id
    assert data[0]["display_name"] == "Monstera"
    assert data[0]["location"]["id"] == location.id
