import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance

User = get_user_model()


def test_locations_list_requires_authentication():
    response = APIClient().get(reverse("locations-list-create"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_create_location_success():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("locations-list-create"),
        data={
            "name": " Living room ",
            "category": "indoor",
        },
        format="json",
    )

    data = response.json()
    location = Location.objects.get(user=user)

    assert response.status_code == 201
    assert data["id"] == location.id
    assert data["name"] == "Living room"
    assert data["category"] == "indoor"
    assert data["plant_count"] == 0


@pytest.mark.django_db
def test_create_location_rejects_duplicate_name_case_insensitive_for_same_user():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    Location.objects.create(user=user, name="Living room", category="indoor")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("locations-list-create"),
        data={
            "name": "LIVING ROOM",
            "category": "outdoor",
        },
        format="json",
    )

    data = response.json()
    assert response.status_code == 409
    assert data["message"] == "Location with this name already exists."


@pytest.mark.django_db
def test_list_locations_returns_only_current_user_locations_with_plant_count():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    other_user = User.objects.create_user(
        email="other@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    Location.objects.create(user=other_user, name="Office", category="indoor")
    PlantInstance.objects.create(
        user=user,
        location=location,
        display_name="Monstera",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("locations-list-create"))

    data = response.json()
    assert response.status_code == 200
    assert len(data) == 1
    assert data[0]["id"] == location.id
    assert data[0]["plant_count"] == 1


@pytest.mark.django_db
def test_get_location_returns_404_for_other_users_location():
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

    response = client.get(reverse("location-detail", args=[other_location.id]))

    assert response.status_code == 404


@pytest.mark.django_db
def test_patch_location_updates_name_and_category():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("location-detail", args=[location.id]),
        data={
            "name": "Bedroom",
            "category": "other",
        },
        format="json",
    )

    data = response.json()
    location.refresh_from_db()

    assert response.status_code == 200
    assert data["name"] == "Bedroom"
    assert data["category"] == "other"
    assert location.name == "Bedroom"
    assert location.category == "other"


@pytest.mark.django_db
def test_patch_location_rejects_duplicate_name_case_insensitive():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    Location.objects.create(user=user, name="Bedroom", category="indoor")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("location-detail", args=[location.id]),
        data={"name": "BEDROOM"},
        format="json",
    )

    data = response.json()
    assert response.status_code == 409
    assert data["message"] == "Location with this name already exists."


@pytest.mark.django_db
def test_delete_empty_location_success():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(reverse("location-detail", args=[location.id]))

    assert response.status_code == 204
    assert Location.objects.filter(id=location.id).exists() is False


@pytest.mark.django_db
def test_delete_location_with_plants_returns_409():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    PlantInstance.objects.create(
        user=user,
        location=location,
        display_name="Monstera",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.delete(reverse("location-detail", args=[location.id]))

    data = response.json()
    assert response.status_code == 409
    assert data["message"] == "Cannot delete a location that has plants assigned."
    assert Location.objects.filter(id=location.id).exists()
