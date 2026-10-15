from django.db import migrations, models
from datetime import timedelta


def backfill_observation_time(apps, schema_editor):
    Reading = apps.get_model("readings", "Reading")
    Reading.objects.using(schema_editor.connection.alias).filter(observed_at__isnull=True).update(
        observed_at=models.F("timestamp"),
    )
    # An old delivery may already have watered without its acknowledgement.
    # Carry that uncertainty through the firmware upgrade instead of allowing
    # automatic watering immediately when the old task expires.
    Task = apps.get_model("readings", "PumpTask")
    Device = apps.get_model("readings", "ReadingDevice")
    db = schema_editor.connection.alias
    for task in Task.objects.using(db).filter(status="delivered").select_related("device").iterator():
        anchor = task.delivered_at or task.requested_at
        until = anchor + timedelta(minutes=max(1, task.device.pump_cooldown_minutes), seconds=30)
        Device.objects.using(db).filter(pk=task.device_id).filter(
            models.Q(pump_safety_until__isnull=True) | models.Q(pump_safety_until__lt=until),
        ).update(pump_safety_until=until)


class Migration(migrations.Migration):
    dependencies = [("readings", "0006_readingdevice_send_email_watering_notifications_and_more")]
    operations = [
        migrations.AddField(model_name="reading", name="observed_at", field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name="readingdevice", name="pump_safety_until", field=models.DateTimeField(null=True, blank=True)),
        migrations.AddField(model_name="pumptask", name="delivery_retry_safe", field=models.BooleanField(default=False)),
        migrations.RunPython(backfill_observation_time, migrations.RunPython.noop),
    ]
