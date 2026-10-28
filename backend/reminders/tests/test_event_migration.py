import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_event_backfill_and_duplicate_pending_cleanup_preserve_completed_rows_and_notes():
    executor = MigrationExecutor(connection)
    final = executor.loader.graph.leaf_nodes()
    previous = [("reminders", "0004_positive_reminder_interval")]
    previous += [target for target in final if target[0] == "accounts"]
    try:
        executor.migrate(previous)
        old = executor.loader.project_state(previous).apps
        User = old.get_model("accounts", "User")
        Location = old.get_model("locations", "Location")
        Plant = old.get_model("plant_instances", "PlantInstance")
        Reminder = old.get_model("reminders", "Reminder")
        Task = old.get_model("reminders", "ReminderTask")
        user = User.objects.create(email="event-migration@example.com", password="unused")
        room = Location.objects.create(user_id=user.pk, name="Original room")
        plant = Plant.objects.create(user_id=user.pk, location_id=room.pk, display_name="Original plant")
        reminder = Reminder.objects.create(user_id=user.pk, plant_id=plant.pk, type="water",
                                           start_date="2026-10-15", interval_value=7)
        paused = Reminder.objects.create(user_id=user.pk, plant_id=plant.pk, type="care",
                                         start_date="2026-10-15", interval_value=2, is_active=False)
        completed = Task.objects.create(reminder_id=reminder.pk, user_id=user.pk, status="completed",
                                        due_date="2026-10-13", note="Real historical care")
        # Earliest due wins, even if the later task was inserted first.
        later = Task.objects.create(reminder_id=reminder.pk, user_id=user.pk, due_date="2026-10-17", note="Duplicate note")
        earliest = Task.objects.create(reminder_id=reminder.pk, user_id=user.pk, due_date="2026-10-15", note="Keep note")
        paused_task = Task.objects.create(reminder_id=paused.pk, user_id=user.pk, due_date="2026-10-15", note="Paused note")
        executor = MigrationExecutor(connection)
        executor.migrate(final)
        new = executor.loader.project_state(final).apps
        NewTask = new.get_model("reminders", "ReminderTask")
        history = NewTask.objects.get(pk=completed.pk)
        assert history.status == "completed" and history.note == "Real historical care"
        assert history.completed_event == {
            "plant_id": plant.pk, "type": "water", "plant_name": "Original plant", "location_name": "Original room",
            "interval_value": 7, "interval_unit": "days", "start_date": "2026-10-15",
        }
        assert NewTask.objects.get(pk=earliest.pk).status == "pending"
        assert NewTask.objects.get(pk=later.pk).status == "cancelled"
        assert NewTask.objects.get(pk=later.pk).note == "Duplicate note"
        assert NewTask.objects.get(pk=paused_task.pk).status == "cancelled"
        assert NewTask.objects.get(pk=paused_task.pk).note == "Paused note"
        assert NewTask.objects.count() == 4
    finally:
        MigrationExecutor(connection).migrate(final)
