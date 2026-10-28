import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_legacy_water_intervals_and_invalid_reminders_migrate_safely():
    executor = MigrationExecutor(connection)
    final_targets = executor.loader.graph.leaf_nodes()
    previous_targets = [("plant_instances", "0003_backfill_qr_codes"), ("reminders", "0003_remindertask_note")]
    # Keep unrelated account fields in sync with the live account table.
    previous_targets += [target for target in final_targets if target[0] == "accounts"]
    try:
        executor.migrate(previous_targets)
        old_apps = executor.loader.project_state(previous_targets).apps
        User = old_apps.get_model("accounts", "User")
        Location = old_apps.get_model("locations", "Location")
        Plant = old_apps.get_model("plant_instances", "PlantInstance")
        Reminder = old_apps.get_model("reminders", "Reminder")
        Task = old_apps.get_model("reminders", "ReminderTask")
        user = User.objects.create(email="migration@example.com", password="unused")
        other_user = User.objects.create(email="foreign-migration@example.com", password="unused")
        location = Location.objects.create(user_id=user.pk, name="Room")
        plant = Plant.objects.create(user_id=user.pk, location_id=location.pk, moisture_interval_days=3)
        legacy_plant = Plant.objects.create(user_id=user.pk, location_id=location.pk, moisture_interval_days=8)
        water = Reminder.objects.create(user_id=user.pk, plant_id=plant.pk, type="water", start_date="2026-10-14", interval_value=9)
        Reminder.objects.create(user_id=other_user.pk, plant_id=legacy_plant.pk, type="water",
                                start_date="2026-10-14", interval_value=99)
        invalid = Reminder.objects.create(user_id=user.pk, plant_id=legacy_plant.pk, type="care", start_date="2026-10-14", interval_value=0)
        Task.objects.create(reminder_id=invalid.pk, user_id=user.pk, due_date="2026-10-14", status="pending")
        completed = Task.objects.create(reminder_id=invalid.pk, user_id=user.pk, due_date="2026-10-13", status="completed", note="Real care")
        executor = MigrationExecutor(connection)
        executor.migrate(final_targets)
        new_apps = executor.loader.project_state(final_targets).apps
        NewPlant = new_apps.get_model("plant_instances", "PlantInstance")
        NewReminder = new_apps.get_model("reminders", "Reminder")
        NewTask = new_apps.get_model("reminders", "ReminderTask")
        assert NewPlant.objects.get(pk=plant.pk).water_interval_days == water.interval_value
        assert NewPlant.objects.get(pk=plant.pk).moisture_interval_days == 3
        assert NewPlant.objects.get(pk=legacy_plant.pk).water_interval_days == 8
        repaired = NewReminder.objects.get(pk=invalid.pk)
        assert repaired.interval_value == 1 and not repaired.is_active
        assert not NewTask.objects.filter(reminder_id=invalid.pk, status="pending").exists()
        assert NewTask.objects.get(pk=completed.pk).note == "Real care"
    finally:
        MigrationExecutor(connection).migrate(final_targets)
