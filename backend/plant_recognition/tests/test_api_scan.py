from io import BytesIO
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from plant_definitions.models import PlantDefinition

User = get_user_model()


def _image_file(name="plant.jpg"):
    image = Image.new("RGB", (10, 10), color="green")
    buf = BytesIO()
    image.save(buf, format="JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


def test_scan_requires_authentication():
    response = APIClient().post(reverse("plant-recognition-scan"), format="multipart")

    assert response.status_code == 401


@pytest.mark.django_db
def test_scan_rejects_missing_image():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("plant-recognition-scan"), data={}, format="multipart")

    assert response.status_code == 400
    assert response.json()["detail"] == "No image file provided under 'image' field."


@pytest.mark.django_db
def test_scan_rejects_invalid_image():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("plant-recognition-scan"),
        data={
            "image": SimpleUploadedFile(
                "plant.txt",
                b"not an image",
                content_type="text/plain",
            )
        },
        format="multipart",
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Uploaded file is not a valid image."


@pytest.mark.django_db
@override_settings(SITE_URL="https://api.example.com", MEDIA_URL="/media/")
@patch("plant_recognition.views.predict_topk")
def test_scan_returns_sorted_predictions_with_matching_definition_thumb(mock_predict):
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    PlantDefinition.objects.create(
        external_id="monstera_deliciosa",
        name="Monstera",
        latin="Monstera deliciosa",
        sun="medium",
        water="medium",
        difficulty="easy",
        image_thumb="plants/thumb/monstera.jpg",
    )
    mock_predict.return_value = [
        {"name": "Ficus", "latin": "Ficus elastica", "score": 0.30, "rank": 2},
        {"name": "Monstera", "latin": "Monstera deliciosa", "score": 0.91, "rank": 1},
    ]
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("plant-recognition-scan"),
        data={"image": _image_file(), "topk": "2"},
        format="multipart",
    )

    data = response.json()
    assert response.status_code == 200
    assert len(data["results"]) == 2
    assert data["results"][0]["external_id"] == "monstera_deliciosa"
    assert data["results"][0]["probability"] == 0.91
    assert data["results"][0]["confidence"] == 0.91
    assert data["results"][0]["image_thumb"] == (
        "https://api.example.com/media/plants/thumb/monstera.jpg"
    )
    assert data["results"][1]["external_id"] == "ficus_elastica"
    mock_predict.assert_called_once()


@pytest.mark.django_db
@patch("plant_recognition.views.predict_topk")
def test_scan_clamps_invalid_topk_to_default(mock_predict):
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    mock_predict.return_value = [
        {"name": "Monstera", "latin": "Monstera deliciosa", "score": 0.91, "rank": 1},
    ]
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("plant-recognition-scan"),
        data={"image": _image_file(), "topk": "not-a-number"},
        format="multipart",
    )

    assert response.status_code == 200
    assert mock_predict.call_args.kwargs["topk"] == 3


@pytest.mark.django_db
@patch("plant_recognition.views.predict_topk")
def test_scan_returns_500_when_inference_fails(mock_predict):
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    mock_predict.side_effect = Exception("model unavailable")
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(
        reverse("plant-recognition-scan"),
        data={"image": _image_file()},
        format="multipart",
    )

    assert response.status_code == 500
    assert "Internal error during plant recognition" in response.json()["detail"]
