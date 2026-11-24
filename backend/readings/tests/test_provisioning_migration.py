"""Additive upgrade preserves legacy board associations, readings and pump safety."""
from datetime import timedelta

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone


@pytest.mark.django_db(transaction=True)
def test_identity_upgrade_preserves_existing_device_and_readings():
    executor = MigrationExecutor(connection)
    support = [target for target in executor.loader.graph.leaf_nodes() if target[0] != "readings"]
    before = support + [("readings", "0010_readingdevice_pump_duration_seconds")]
    after = support + [("readings", "0011_physical_device_foundations")]
    executor.migrate(before)
    try:
        old = executor.loader.project_state(before).apps
        user = old.get_model("accounts", "User").objects.create(email="iot-upgrade@example.test", password="unusable")
        location = old.get_model("locations", "Location").objects.create(user=user, name="Room", category="indoor")
        plant = old.get_model("plant_instances", "PlantInstance").objects.create(user=user, location=location, display_name="Legacy plant")
        safety = timezone.now() + timedelta(hours=1)
        device = old.get_model("readings", "ReadingDevice").objects.create(
            user=user, plant=plant, device_key="IOTUP001", device_name="Legacy", pump_included=True,
            pump_safety_until=safety, automatic_pump_launch=True, pump_duration_seconds=25, interval_minutes=120,
        )
        reading = old.get_model("readings", "Reading").objects.create(device=device, timestamp=timezone.now(), moisture=42)
        secret = old.get_model("readings", "AccountSecret").objects.create(user=user, secret="synthetic-existing-secret")
        executor = MigrationExecutor(connection)
        executor.migrate(after)
        new = executor.loader.project_state(after).apps
        updated = new.get_model("readings", "ReadingDevice").objects.get(pk=device.pk)
        assert (updated.user_id, updated.plant_id, updated.device_key) == (user.pk, plant.pk, "IOTUP001")
        assert updated.pump_safety_until == safety
        assert updated.automatic_pump_launch is True
        assert updated.pump_duration_seconds == 25 and updated.interval_minutes == 120
        assert updated.desired_config_version == 1
        assert new.get_model("readings", "Reading").objects.get(pk=reading.pk).moisture == 42
        assert new.get_model("readings", "AccountSecret").objects.get(pk=secret.pk).secret == "synthetic-existing-secret"
        assert new.get_model("readings", "PhysicalDevice").objects.count() == 0
        assert new.get_model("readings", "DeviceCredential").objects.count() == 0
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
