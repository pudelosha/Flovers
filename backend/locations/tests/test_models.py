import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from locations.models import Location

User = get_user_model()


@pytest.mark.django_db
def test_location_string_representation():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    location = Location.objects.create(
        user=user,
        name="Living room",
        category="indoor",
    )

    assert str(location) == "Living room (indoor)"


@pytest.mark.django_db
def test_location_name_is_unique_case_insensitive_per_user():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    Location.objects.create(user=user, name="Living room", category="indoor")

    with pytest.raises(IntegrityError):
        Location.objects.create(user=user, name="LIVING ROOM", category="outdoor")


@pytest.mark.django_db
def test_location_name_can_repeat_for_different_users():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    other_user = User.objects.create_user(
        email="other@example.com",
        password="strong-password-123",
    )

    Location.objects.create(user=user, name="Living room", category="indoor")
    other_location = Location.objects.create(
        user=other_user,
        name="LIVING ROOM",
        category="outdoor",
    )

    assert other_location.name == "LIVING ROOM"
