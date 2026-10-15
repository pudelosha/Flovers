from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance

User = get_user_model()


@pytest.mark.django_db
def test_legacy_auto_water_create_falls_back_only_when_watering_interval_is_absent():
    user = User.objects.create_user(email="legacy@example.com", password="password-123")
    location = Location.objects.create(user=user, name="Room")
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(reverse("plant-instance-list-create"), {
        "location_id": location.pk, "create_auto_tasks": True,
        "water_task_enabled": True, "moisture_interval_days": 7,
    }, format="json")
    assert response.status_code == 201
    plant = PlantInstance.objects.get()
    assert plant.water_interval_days == 7
    reminder = plant.reminders.get(type="water")
    assert reminder.interval_value == 7
    assert reminder.tasks.get().due_date == timezone.localdate() + timedelta(days=7)


@pytest.mark.django_db
def test_auto_water_and_misting_have_independent_intervals_and_delayed_first_due():
    user = User.objects.create_user(email="owner@example.com", password="password-123")
    location = Location.objects.create(user=user, name="Room")
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(reverse("plant-instance-list-create"), {
        "location_id": location.pk, "create_auto_tasks": True, "water_task_enabled": True,
        "water_interval_days": 9, "moisture_required": True, "moisture_interval_days": 3,
    }, format="json")
    assert response.status_code == 201
    plant = PlantInstance.objects.get()
    assert plant.water_interval_days == 9 and plant.moisture_interval_days == 3
    water = plant.reminders.get(type="water")
    misting = plant.reminders.get(type="moisture")
    assert water.interval_value == 9 and misting.interval_value == 3
    assert water.tasks.get().due_date == timezone.localdate() + timedelta(days=9)
    assert misting.tasks.get().due_date == timezone.localdate() + timedelta(days=3)
    detail = client.get(reverse("plant-instance-detail", args=[plant.pk]))
    assert detail.json()["water_interval_days"] == 9


@pytest.mark.django_db
@pytest.mark.parametrize("water_interval", [None, 0])
def test_auto_water_requires_its_own_positive_interval(water_interval):
    user = User.objects.create_user(email="owner@example.com", password="password-123")
    location = Location.objects.create(user=user, name="Room")
    client = APIClient()
    client.force_authenticate(user)
    response = client.post(reverse("plant-instance-list-create"), {
        "location_id": location.pk, "create_auto_tasks": True, "water_task_enabled": True,
        "water_interval_days": water_interval, "moisture_interval_days": 7,
    }, format="json")
    assert response.status_code == 400
    assert "water_interval_days" in response.json()
    assert not PlantInstance.objects.exists()
