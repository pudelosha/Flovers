from datetime import timedelta

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.utils import timezone


@pytest.mark.django_db(transaction=True)
def test_upgrade_preserves_uncertain_legacy_watering_and_existing_observations():
    before = [("readings", "0006_readingdevice_send_email_watering_notifications_and_more")]
    after = [("readings", "0007_reading_observation_and_pump_safety")]
    executor = MigrationExecutor(connection)
    account_targets = [target for target in executor.loader.graph.leaf_nodes() if target[0] == "accounts"]
    before += account_targets
    after += account_targets
    executor.migrate(before)
    try:
        old = executor.loader.project_state(before).apps
        user = old.get_model("accounts", "User").objects.create(email="upgrade@example.test", password="unusable")
        location = old.get_model("locations", "Location").objects.create(user=user, name="Room", category="indoor")
        plant = old.get_model("plant_instances", "PlantInstance").objects.create(user=user, location=location, display_name="Fern")
        device = old.get_model("readings", "ReadingDevice").objects.create(
            user=user, plant=plant, device_key="MIGRATE1", device_name="Legacy", pump_included=True,
        )
        now = timezone.now()
        task = old.get_model("readings", "PumpTask").objects.create(
            device=device, source="manual", status="delivered", requested_at=now-timedelta(hours=2),
            delivered_at=now, expires_at=now+timedelta(minutes=1),
        )
        row = old.get_model("readings", "Reading").objects.create(device=device, timestamp=now, moisture=12)
        executor = MigrationExecutor(connection)
        executor.migrate(after)
        new = executor.loader.project_state(after).apps
        updated_device = new.get_model("readings", "ReadingDevice").objects.get(pk=device.pk)
        assert updated_device.pump_safety_until == now+timedelta(minutes=60, seconds=30)
        assert not new.get_model("readings", "PumpTask").objects.get(pk=task.pk).delivery_retry_safe
        updated_row = new.get_model("readings", "Reading").objects.get(pk=row.pk)
        assert updated_row.observed_at == now and updated_row.moisture == 12
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
