"""Record semantic notification snapshots without storing tokens, links or secrets."""
from .models import InboxNotification


def record_notification(*, user_id, event_key, channel, source, kind, payload=None, created_at=None):
    values = {"source": source, "kind": kind, "payload": payload or {}}
    if created_at is not None:
        values["created_at"] = created_at
    # A deleted row remains a tombstone: retries must never recreate it.
    return InboxNotification.objects.get_or_create(user_id=user_id, event_key=event_key,
                                                  channel=channel, defaults=values)[0]


def record_contact_request(connection, sender, recipient):
    record_notification(user_id=recipient.pk, event_key=f"contact-request:{connection.pk}",
        channel="in_app", source="user", kind="contact_invitation",
        payload={"actor": sender.get_full_name().strip() or f"FL-{sender.flovers_id.hex.upper()}"},
        created_at=connection.created_at)
