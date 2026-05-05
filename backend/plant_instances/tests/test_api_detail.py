import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance

User = get_user_model()


@pytest.mark.django_db
def test_retrieve_plant_instance_detail():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(
        user=user,
        location=location,
        display_name="Monstera",
        notes="Near the window.",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("plant-instance-detail", args=[plant.id]))

    data = response.json()
    assert response.status_code == 200
    assert data["id"] == plant.id
    assert data["location_id"] == location.id
    assert data["location"]["name"] == "Living room"
    assert data["display_name"] == "Monstera"
    assert data["notes"] == "Near the window."


@pytest.mark.django_db
def test_retrieve_plant_instance_returns_404_for_other_users_plant():
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
    other_plant = PlantInstance.objects.create(
        user=other_user,
        location=other_location,
        display_name="Other plant",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("plant-instance-detail", args=[other_plant.id]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_patch_plant_instance_updates_fields_and_location():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    old_location = Location.objects.create(user=user, name="Living room", category="indoor")
    new_location = Location.objects.create(user=user, name="Bedroom", category="indoor")
    plant = PlantInstance.objects.create(
        user=user,
        location=old_location,
        display_name="Monstera",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("plant-instance-detail", args=[plant.id]),
        data={
            "location_id": new_location.id,
            "display_name": "Bedroom Monstera",
            "notes": "Moved upstairs.",
        },
        format="json",
    )

    data = response.json()
    plant.refresh_from_db()

    assert response.status_code == 200
    assert data["id"] == plant.id
    assert data["display_name"] == "Bedroom Monstera"
    assert data["location"]["id"] == new_location.id
    assert plant.location == new_location
    assert plant.notes == "Moved upstairs."


@pytest.mark.django_db
def test_patch_plant_instance_rejects_other_users_location():
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
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("plant-instance-detail", args=[plant.id]),
        data={"location_id": other_location.id},
        format="json",
    )

    data = response.json()
    plant.refresh_from_db()

    assert response.status_code == 400
    assert "location_id" in data
    assert plant.location == location


@pytest.mark.django_db
def test_delete_plant_instance_success():
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
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(reverse("plant-instance-detail", args=[plant.id]))

    assert response.status_code == 204
    assert PlantInstance.objects.filter(id=plant.id).exists() is False
