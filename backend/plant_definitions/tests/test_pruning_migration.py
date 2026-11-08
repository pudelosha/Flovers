import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
def test_pruning_upgrade_keeps_existing_definitions_plants_and_pending_tasks():
    executor = MigrationExecutor(connection)
    final = executor.loader.graph.leaf_nodes()
    previous_versions = {
        'plant_definitions': '0003_alter_plantdefinition_external_id',
        'plant_instances': '0009_journalphotoentry_journal_photo_plant_date',
        'reminders': '0008_remindertask_completion_undo',
    }
    before = [(app, previous_versions.get(app, version)) for app, version in final]
    try:
        executor.migrate(before)
        old = executor.loader.project_state(before).apps
        user = old.get_model('accounts', 'User').objects.create(email='pruning-upgrade@example.test', password='unused')
        location = old.get_model('locations', 'Location').objects.create(user_id=user.pk, name='Room')
        definition = old.get_model('plant_definitions', 'PlantDefinition').objects.create(
            external_id='legacy-fern', latin='Legacy fern', sun='medium', water='medium', difficulty='easy')
        plant = old.get_model('plant_instances', 'PlantInstance').objects.create(
            user_id=user.pk, location_id=location.pk, plant_definition_id=definition.pk, display_name='Keep plant')
        reminder = old.get_model('reminders', 'Reminder').objects.create(
            user_id=user.pk, plant_id=plant.pk, type='care', start_date='2026-11-08', interval_value=30)
        task = old.get_model('reminders', 'ReminderTask').objects.create(
            user_id=user.pk, reminder_id=reminder.pk, due_date='2026-12-08', note='Keep note')
        executor = MigrationExecutor(connection)
        executor.migrate(final)
        new = executor.loader.project_state(final).apps
        for app, model, pk in [('plant_definitions', 'PlantDefinition', definition.pk), ('plant_instances', 'PlantInstance', plant.pk)]:
            row = new.get_model(app, model).objects.get(pk=pk)
            assert row.pruning_required is False and row.pruning_interval_days is None
        saved = new.get_model('reminders', 'ReminderTask').objects.get(pk=task.pk)
        assert saved.status == 'pending' and saved.note == 'Keep note'
        assert str(saved.due_date) == '2026-12-08'
        assert new.get_model('reminders', 'Reminder').objects.count() == 1
        assert new.get_model('reminders', 'ReminderTask').objects.count() == 1
    finally:
        executor = MigrationExecutor(connection)
        executor.migrate(final)
