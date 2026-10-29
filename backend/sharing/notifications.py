"""Create durable owner notifications inside the task-completion transaction."""
import logging

from django.db import transaction

from profiles.models import ProfileNotifications
from .models import SharedCareNotification
from .permissions import active_shares

logger = logging.getLogger(__name__)


def queue_shared_care_notification(task, plant, actor):
    if actor.pk == plant.user_id or task.status != "completed" or task.completed_by_id != actor.pk:
        return
    if task.user_id != plant.user_id or (task.completed_event or {}).get("plant_id") != plant.pk:
        return
    preferences = ProfileNotifications.objects.filter(user_id=plant.user_id).first()
    if preferences is None or not (preferences.shared_task_email or preferences.shared_task_push):
        return
    if not active_shares().filter(plant=plant, recipient=actor, can_complete_tasks=True).exists():
        return
    ids = []
    for channel, enabled in (("email", preferences.shared_task_email), ("push", preferences.shared_task_push)):
        if enabled:
            delivery, created = SharedCareNotification.objects.get_or_create(
                source_task_id=task.pk, channel=channel,
                defaults={"owner_id": plant.user_id, "plant": plant},
            )
            if created:
                ids.append(delivery.pk)
    if not ids:
        return

    def dispatch():
        from .tasks import deliver_shared_care_notifications
        try:
            deliver_shared_care_notifications.apply_async(kwargs={"delivery_ids": ids}, retry=False)
        except Exception:
            # The minute-based outbox sweep recovers broker outages after commit.
            logger.exception("Could not dispatch shared-care notifications; queued for recovery")

    transaction.on_commit(dispatch)
