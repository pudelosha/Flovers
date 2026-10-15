from django.core.validators import MinValueValidator
from django.db import migrations, models


def pause_invalid_reminders(apps, schema_editor):
    Reminder = apps.get_model("reminders", "Reminder")
    Task = apps.get_model("reminders", "ReminderTask")
    db = schema_editor.connection.alias
    invalid = Reminder.objects.using(db).filter(interval_value__lt=1)
    Task.objects.using(db).filter(reminder_id__in=invalid.values("pk"), status="pending").delete()
    # Preserve history; a user must choose a valid interval before resuming.
    invalid.update(interval_value=1, is_active=False)


class Migration(migrations.Migration):
    dependencies = [("reminders", "0003_remindertask_note")]
    operations = [
        migrations.RunPython(pause_invalid_reminders, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="reminder", name="interval_value",
            field=models.PositiveIntegerField(validators=[MinValueValidator(1)]),
        ),
        migrations.AddConstraint(
            model_name="reminder",
            constraint=models.CheckConstraint(condition=models.Q(interval_value__gte=1), name="reminder_interval_positive"),
        ),
    ]
