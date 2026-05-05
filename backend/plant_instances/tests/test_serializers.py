import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

from locations.models import Location
from plant_definitions.models import PlantDefinition
from plant_instances.models import PlantInstance
from plant_instances.serializers import (
    PlantInstanceDetailSerializer,
    PlantInstanceListSerializer,
    PlantInstanceSerializer,
)
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _request_for(user):
    request = APIRequestFactory().post("/api/plant-instances/")
    request.user = user
    return request


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


@pytest.mark.django_db
def test_plant_instance_serializer_creates_plant_with_existing_location_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    definition = _plant_definition()

    serializer = PlantInstanceSerializer(
        data={
            "plant_definition_id": definition.id,
            "location_id": location.id,
            "display_name": "Monstera",
            "notes": "Near the window.",
            "light_level": "bright-indirect",
            "orientation": "E",
            "distance_cm": 120,
        },
        context={"request": _request_for(user)},
    )

    assert serializer.is_valid(), serializer.errors
    plant = serializer.save()

    assert plant.user == user
    assert plant.location == location
    assert plant.plant_definition == definition
    assert plant.display_name == "Monstera"
    assert plant.notes == "Near the window."
    assert plant.qr_code


@pytest.mark.django_db
def test_plant_instance_serializer_rejects_other_users_location_id():
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

    serializer = PlantInstanceSerializer(
        data={
            "location_id": other_location.id,
            "display_name": "Monstera",
        },
        context={"request": _request_for(user)},
    )

    assert serializer.is_valid() is False
    assert "location_id" in serializer.errors


@pytest.mark.django_db
def test_plant_instance_serializer_rejects_missing_location_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )

    serializer = PlantInstanceSerializer(
        data={"display_name": "Monstera"},
        context={"request": _request_for(user)},
    )

    assert serializer.is_valid() is False
    assert "location_id" in serializer.errors


@pytest.mark.django_db
def test_plant_instance_serializer_accepts_empty_plant_definition_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")

    serializer = PlantInstanceSerializer(
        data={
            "plant_definition_id": 0,
            "location_id": location.id,
            "display_name": "Mystery plant",
        },
        context={"request": _request_for(user)},
    )

    assert serializer.is_valid(), serializer.errors
    plant = serializer.save()
    assert plant.plant_definition is None


@pytest.mark.django_db
def test_plant_instance_serializer_rejects_invalid_plant_definition_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")

    serializer = PlantInstanceSerializer(
        data={
            "plant_definition_id": 999999,
            "location_id": location.id,
            "display_name": "Monstera",
        },
        context={"request": _request_for(user)},
    )

    assert serializer.is_valid() is False
    assert "plant_definition_id" in serializer.errors


@pytest.mark.django_db
def test_plant_instance_serializer_creates_enabled_auto_reminders():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")

    serializer = PlantInstanceSerializer(
        data={
            "location_id": location.id,
            "display_name": "Monstera",
            "create_auto_tasks": True,
            "water_task_enabled": True,
            "moisture_interval_days": 7,
            "fertilize_required": True,
            "fertilize_interval_days": 30,
            "repot_task_enabled": True,
            "repot_interval_months": 12,
        },
        context={"request": _request_for(user)},
    )

    assert serializer.is_valid(), serializer.errors
    plant = serializer.save()

    assert set(Reminder.objects.filter(plant=plant).values_list("type", flat=True)) == {
        "water",
        "fertilize",
        "repot",
    }
    assert ReminderTask.objects.filter(reminder__plant=plant, status="pending").count() == 3


@pytest.mark.django_db
def test_plant_instance_list_serializer_returns_nested_location():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(
        user=user,
        location=location,
        display_name="Monstera",
    )

    data = PlantInstanceListSerializer(plant).data

    assert data["location"] == {
        "id": location.id,
        "name": "Living room",
        "category": "indoor",
    }


@pytest.mark.django_db
def test_plant_instance_detail_serializer_returns_edit_shape():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(
        user=user,
        location=location,
        display_name="Monstera",
        light_level="medium",
        orientation="S",
    )

    data = PlantInstanceDetailSerializer(plant).data

    assert data["id"] == plant.id
    assert data["location_id"] == location.id
    assert data["location"]["name"] == "Living room"
    assert data["display_name"] == "Monstera"
    assert data["light_level"] == "medium"
    assert data["orientation"] == "S"
