import pytest

from locations.serializers import LocationSerializer


def test_location_serializer_accepts_valid_data_and_trims_name():
    serializer = LocationSerializer(
        data={
            "name": " Living room ",
            "category": "indoor",
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["name"] == "Living room"
    assert serializer.validated_data["category"] == "indoor"


def test_location_serializer_rejects_blank_name():
    serializer = LocationSerializer(
        data={
            "name": "   ",
            "category": "indoor",
        }
    )

    assert serializer.is_valid() is False
    assert "name" in serializer.errors


@pytest.mark.parametrize("category", ["indoor", "outdoor", "other"])
def test_location_serializer_accepts_supported_categories(category):
    serializer = LocationSerializer(
        data={
            "name": "Location",
            "category": category,
        }
    )

    assert serializer.is_valid(), serializer.errors


def test_location_serializer_rejects_invalid_category():
    serializer = LocationSerializer(
        data={
            "name": "Living room",
            "category": "balcony-ish",
        }
    )

    assert serializer.is_valid() is False
    assert "category" in serializer.errors
