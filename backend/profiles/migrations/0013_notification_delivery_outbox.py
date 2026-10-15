import django.utils.timezone
from django.db import migrations, models


def mark_existing_sent(apps, schema_editor):
    Delivery = apps.get_model("profiles", "NotificationDeliveryLog")
    Delivery.objects.using(schema_editor.connection.alias).filter(status="sent").update(sent_at=models.F("created_at"))


class Migration(migrations.Migration):
    dependencies = [("profiles", "0012_profilesettings_japanese_korean")]
    operations = [
        migrations.AddField(model_name="notificationdeliverylog", name="status", field=models.CharField(choices=[("pending", "Pending"), ("sending", "Sending"), ("sent", "Sent"), ("skipped", "Skipped")], default="sent", max_length=12)),
        migrations.AddField(model_name="notificationdeliverylog", name="attempts", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="notificationdeliverylog", name="next_attempt_at", field=models.DateTimeField(default=django.utils.timezone.now)),
        migrations.AddField(model_name="notificationdeliverylog", name="lease_expires_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="notificationdeliverylog", name="claim_token", field=models.CharField(blank=True, default="", max_length=32)),
        migrations.AddField(model_name="notificationdeliverylog", name="sent_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="notificationdeliverylog", name="last_error", field=models.CharField(blank=True, default="", max_length=1000)),
        migrations.RunPython(mark_existing_sent, migrations.RunPython.noop),
        migrations.AddIndex(model_name="notificationdeliverylog", index=models.Index(fields=["status", "next_attempt_at"], name="notification_retry_idx")),
    ]
