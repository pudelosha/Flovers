import pytest
from django.contrib.auth import get_user_model

from locations.models import Location
from plant_instances.models import PlantInstance

User = get_user_model()


@pytest.mark.django_db
def test_plant_instance_string_representation_uses_display_name():
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

    assert str(plant) == "Monstera"


@pytest.mark.django_db
def test_plant_instance_string_representation_falls_back_to_id():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    plant = PlantInstance.objects.create(user=user, location=location)

    assert str(plant) == f"Plant #{plant.pk}"


@pytest.mark.django_db
def test_plant_instance_generates_qr_code_on_save():
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

    assert plant.qr_code
    assert len(plant.qr_code) <= 64


@pytest.mark.django_db
def test_plant_instance_preserves_existing_qr_code_on_save():
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
    qr_code = plant.qr_code

    plant.display_name = "Monstera Deliciosa"
    plant.save()

    assert plant.qr_code == qr_code
