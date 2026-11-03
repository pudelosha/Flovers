"""Import only notification history the server actually retained."""
from django.db import migrations


def backfill(apps, schema_editor):
    Inbox = apps.get_model("profiles", "InboxNotification")
    database = schema_editor.connection.alias
    batch = []

    def add(**values):
        batch.append(Inbox(**values))
        if len(batch) >= 500:
            Inbox.objects.using(database).bulk_create(batch, ignore_conflicts=True)
            batch.clear()

    Connection = apps.get_model("contacts", "Connection")
    for row in Connection.objects.using(database).filter(status="pending").select_related("initiator").iterator():
        sender = row.initiator
        recipient = row.user_high_id if row.initiator_id == row.user_low_id else row.user_low_id
        actor = f"{sender.first_name} {sender.last_name}".strip() or f"FL-{sender.flovers_id.hex.upper()}"
        add(user_id=recipient, event_key=f"contact-request:{row.pk}", source="user", channel="in_app",
            kind="contact_invitation", payload={"actor":actor}, created_at=row.created_at)

    Daily = apps.get_model("profiles", "NotificationDeliveryLog")
    for row in Daily.objects.using(database).filter(status="sent").iterator():
        add(user_id=row.user_id, event_key=f"daily:{row.pk}", source="task", channel=row.channel,
            kind="tasks_due" if row.kind=="due_today" else "tasks_followup", created_at=row.sent_at or row.created_at)

    Care = apps.get_model("sharing", "SharedCareNotification")
    for row in Care.objects.using(database).filter(status="sent").iterator():
        add(user_id=row.owner_id, event_key=f"shared-care:{row.pk}", source="task", channel=row.channel,
            kind="shared_task_completed", created_at=row.sent_at or row.created_at)

    Missing = apps.get_model("readings", "MissingReadingNotification")
    for row in Missing.objects.using(database).filter(status="sent").select_related("device").iterator():
        add(user_id=row.device.user_id, event_key=f"missing:{row.pk}", source="device", channel=row.channel,
            kind="missing_readings", created_at=row.sent_at or row.created_at)
    if batch:
        Inbox.objects.using(database).bulk_create(batch, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [("profiles","0021_inboxnotification"),("contacts","0003_invitationrecipientlock_and_more"),
                    ("sharing","0002_sharedcarenotification"),("readings","0010_readingdevice_pump_duration_seconds")]
    operations = [migrations.RunPython(backfill,migrations.RunPython.noop)]
