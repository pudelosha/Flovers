import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


def test_profile_settings_requires_authentication():
    response = APIClient().get(reverse("profile-settings"))

    assert response.status_code == 401


@pytest.mark.django_db
def test_profile_settings_get_returns_defaults():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("profile-settings"))

    data = response.json()
    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Profile settings fetched."
    assert data["data"]["language"] == "en"
    assert data["data"]["temperature_unit"] == "C"
    assert data["data"]["measure_unit"] == "metric"
    assert data["data"]["background"] == "bg1"
    assert data["data"]["fab_position"] == "right"


@pytest.mark.django_db
def test_profile_settings_patch_updates_values():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("profile-settings"),
        data={
            "language": "pl",
            "temperature_unit": "F",
            "measure_unit": "imperial",
            "tile_transparency": "0.30",
            "tile_motive": "dark",
            "background": "bg3",
            "fab_position": "left",
        },
        format="json",
    )

    data = response.json()
    user.profile_settings.refresh_from_db()

    assert response.status_code == 200
    assert data["status"] == "success"
    assert data["message"] == "Profile settings updated."
    assert data["data"]["language"] == "pl"
    assert user.profile_settings.language == "pl"
    assert user.profile_settings.temperature_unit == "F"
    assert user.profile_settings.measure_unit == "imperial"
    assert str(user.profile_settings.tile_transparency) == "0.30"
    assert user.profile_settings.tile_motive == "dark"
    assert user.profile_settings.background == "bg3"
    assert user.profile_settings.fab_position == "left"


@pytest.mark.django_db
def test_profile_settings_patch_rejects_invalid_choice():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("profile-settings"),
        data={"language": "unknown"},
        format="json",
    )

    data = response.json()
    assert response.status_code == 400
    assert data["status"] == "error"
    assert data["message"] == "Validation failed."
    assert "language" in data["errors"]
