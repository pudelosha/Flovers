from django.db import migrations, models
from django.db.models import Count


def preserve_events_and_cancel_duplicate_pending(apps, schema_editor):
    Task = apps.get_model("reminders", "ReminderTask")
    db = schema_editor.connection.alias
    completed = Task.objects.using(db).filter(status="completed").select_related(
        "reminder__plant__location", "reminder__plant__plant_definition"
    )
    for task in completed.iterator():
        reminder = task.reminder
        plant = reminder.plant
        definition = plant.plant_definition
        event = {
            "plant_id": plant.pk, "type": reminder.type,
            "plant_name": plant.display_name or (definition.name if definition else "") or f"Plant #{plant.pk}",
            "location_name": plant.location.name,
            "interval_value": reminder.interval_value, "interval_unit": reminder.interval_unit,
            "start_date": reminder.start_date.isoformat(),
        }
        Task.objects.using(db).filter(pk=task.pk).update(completed_event=event)
    # Keep every row and note. Superseded pending work is cancelled, never
    # rewritten as completed care. Prefer the earliest due task for each reminder.
    Task.objects.using(db).filter(status="pending", reminder__is_active=False).update(status="cancelled")
    duplicates = Task.objects.using(db).filter(status="pending").values("reminder_id").annotate(count=Count("id")).filter(count__gt=1)
    for duplicate in duplicates.iterator():
        pending = Task.objects.using(db).filter(status="pending", reminder_id=duplicate["reminder_id"])
        keep = pending.order_by("due_date", "id").values_list("pk", flat=True).first()
        pending.exclude(pk=keep).update(status="cancelled")


class Migration(migrations.Migration):
    dependencies = [("reminders", "0004_positive_reminder_interval")]
    operations = [
        migrations.AddField(model_name="remindertask", name="completed_event", field=models.JSONField(blank=True, editable=False, null=True)),
        migrations.AlterField(model_name="remindertask", name="status", field=models.CharField(choices=[("pending", "Pending"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="pending", max_length=12)),
        migrations.RunPython(preserve_events_and_cancel_duplicate_pending, migrations.RunPython.noop),
        migrations.AddConstraint(model_name="remindertask", constraint=models.UniqueConstraint(condition=models.Q(status="pending"), fields=("reminder",), name="one_pending_task_per_reminder")),
        migrations.AddConstraint(model_name="remindertask", constraint=models.CheckConstraint(condition=~models.Q(status="completed") | models.Q(completed_event__isnull=False), name="completed_task_has_event")),
    ]
