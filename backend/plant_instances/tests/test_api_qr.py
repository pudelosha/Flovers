from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance

User = get_user_model()


@pytest.mark.django_db
def test_get_plant_by_qr_requires_code():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(reverse("plant-instance-by-qr"))

    data = response.json()
    assert response.status_code == 400
    assert data["detail"] == "Missing 'code' query parameter."


@pytest.mark.django_db
def test_get_plant_by_qr_returns_current_users_plant():
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

    response = client.get(reverse("plant-instance-by-qr"), data={"code": plant.qr_code})

    data = response.json()
    assert response.status_code == 200
    assert data["id"] == plant.id
    assert data["display_name"] == "Monstera"
    assert data["location"]["id"] == location.id


@pytest.mark.django_db
def test_get_plant_by_qr_returns_404_for_other_users_plant():
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

    response = client.get(
        reverse("plant-instance-by-qr"),
        data={"code": other_plant.qr_code},
    )

    data = response.json()
    assert response.status_code == 404
    assert data["detail"] == "Not found."


@pytest.mark.django_db
@override_settings(PUBLIC_WEB_BASE="https://api.example.com")
@patch("plant_instances.views.send_templated_email")
def test_send_qr_email_sends_message_with_inline_qr(mock_send):
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

    response = client.post(
        reverse("plant-instance-send-qr-email", args=[plant.id]),
        data={"lang": "pl"},
        format="json",
    )

    data = response.json()
    assert response.status_code == 200
    assert data["detail"] == "QR code email sent."
    mock_send.assert_called_once()
    kwargs = mock_send.call_args.kwargs
    assert kwargs["to_email"] == "test@example.com"
    assert kwargs["template_name"] == "plant_instances/qr_code"
    assert kwargs["lang"] == "pl"
    assert plant.qr_code in kwargs["context"]["qr_payload"]
    assert kwargs["inline_attachments"][0]["mimetype"] == "image/png"


@pytest.mark.django_db
def test_send_qr_email_returns_404_for_other_users_plant():
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

    response = client.post(
        reverse("plant-instance-send-qr-email", args=[other_plant.id]),
        format="json",
    )

    data = response.json()
    assert response.status_code == 404
    assert data["detail"] == "Not found."
