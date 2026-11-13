from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from readings.models import Reading
from readings.tests.test_api_history import _device


@pytest.mark.django_db
def test_summary_uses_rolling_24_hours_and_preserves_missing_values():
    user = get_user_model().objects.create_user(email="summary@example.test")
    device = _device(user)
    now = timezone.now()
    for hours, temperature, humidity in [(25, 100, 100), (24, 20, None), (1, 30, 40), (-1, 200, 200)]:
        Reading.objects.create(device=device, timestamp=now-timedelta(hours=hours), temperature=temperature, humidity=humidity)
    client = APIClient()
    client.force_authenticate(user)
    with patch("readings.views.timezone.now", return_value=now):
        response = client.get(reverse("readings-summary-24h"), {"device_id": device.pk})
    assert response.status_code == 200
    assert response.data["metrics"]["temperature"] == {"avg": 25, "min": 20, "max": 30}
    assert response.data["metrics"]["humidity"] == {"avg": 40, "min": 40, "max": 40}
    assert response.data["metrics"]["light"] == {"avg": None, "min": None, "max": None}


@pytest.mark.django_db
def test_summary_uses_actual_observation_time_when_hourly_bucket_crosses_window_boundary():
    user = get_user_model().objects.create_user(email="observed-summary@example.test")
    device = _device(user)
    now = timezone.now()
    Reading.objects.create(device=device, timestamp=now-timedelta(hours=25),
                           observed_at=now-timedelta(hours=23, minutes=50), temperature=18)
    client = APIClient()
    client.force_authenticate(user)
    with patch("readings.views.timezone.now", return_value=now):
        response = client.get(reverse("readings-summary-24h"), {"device_id": device.pk})
    assert response.data["metrics"]["temperature"] == {"avg": 18, "min": 18, "max": 18}


@pytest.mark.django_db
def test_summary_requires_authentication_and_rejects_unshared_devices():
    owner = get_user_model().objects.create_user(email="owner-summary@example.test")
    other = get_user_model().objects.create_user(email="other-summary@example.test")
    device = _device(owner)
    client = APIClient()
    assert client.get(reverse("readings-summary-24h"), {"device_id": device.pk}).status_code == 401
    client.force_authenticate(other)
    assert client.get(reverse("readings-summary-24h"), {"device_id": device.pk}).status_code == 404
    assert client.get(reverse("readings-summary-24h"), {"device_id": "bad"}).status_code == 400
