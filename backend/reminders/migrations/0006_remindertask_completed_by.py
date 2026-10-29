import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_owners(apps, schema_editor):
    Task = apps.get_model("reminders", "ReminderTask")
    Task.objects.using(schema_editor.connection.alias).filter(
        status="completed", completed_by__isnull=True,
    ).update(completed_by=models.F("user_id"))


class Migration(migrations.Migration):
    dependencies = [
        ("reminders", "0005_completed_events_and_one_pending_task"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.AddField(
            model_name="remindertask", name="completed_by",
            field=models.ForeignKey(blank=True, editable=False, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="completed_care_tasks", to=settings.AUTH_USER_MODEL),
        ),
        migrations.RunPython(backfill_owners, migrations.RunPython.noop),
    ]
