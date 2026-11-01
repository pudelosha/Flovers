"""Conservative completion reversal with server-owned provenance and bounded eligibility."""
import uuid

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.http import Http404

from profiles.models import AccountProgression, TaskXPAward
from sharing.permissions import locked_plant_access
from .models import Reminder, ReminderTask


def reminder_snapshot(reminder):
    return {key: str(getattr(reminder, key)) for key in (
        "user_id", "plant_id", "type", "start_date", "interval_value", "interval_unit", "is_active", "updated_at")}


def pending_snapshot(task):
    return {key: str(getattr(task, key)) for key in (
        "pk", "user_id", "reminder_id", "due_date", "status", "note", "completed_at", "completed_by_id", "updated_at", "created_at")}


def record_completion(task, reminder, successor, previous_note):
    task.completion_undo = {
        "version": str(uuid.uuid4()), "reminder": reminder_snapshot(reminder),
        "successor": pending_snapshot(successor), "previous_note": previous_note,
        "completed_updated_at": str(task.updated_at),
    }
    # Persist metadata without changing the receipt timestamp used for eligibility.
    ReminderTask.objects.filter(pk=task.pk).update(completion_undo=task.completion_undo)


def eligible(task, reminder, successor, latest_id, user):
    state = task.completion_undo
    return bool(user and user.is_active and task.user_id == user.pk and reminder.user_id == user.pk
        and reminder.plant.user_id == user.pk and reminder.is_active and task.status == "completed"
        and task.completed_at and latest_id == task.pk and isinstance(state, dict)
        and state.get("version") and state.get("completed_updated_at") == str(task.updated_at)
        and state.get("reminder") == reminder_snapshot(reminder)
        and successor is not None and successor.status == "pending"
        and state.get("successor") == pending_snapshot(successor))


def undo_versions(tasks, user):
    """Three bounded queries for a page; never one query per historical tile."""
    tasks = [task for task in tasks if task.user_id == user.pk and task.completion_undo]
    if not tasks:
        return {}
    ids = {task.reminder_id for task in tasks}
    latest = ReminderTask.objects.filter(reminder_id=OuterRef("pk"), status="completed").order_by("-updated_at", "-pk")
    reminders = {r.pk: r for r in Reminder.objects.filter(pk__in=ids).select_related("plant").annotate(
        latest_completed_id=Subquery(latest.values("pk")[:1]))}
    pending = {t.reminder_id: t for t in ReminderTask.objects.filter(reminder_id__in=ids, status="pending")}
    return {task.pk: task.completion_undo["version"] for task in tasks
        if (reminder := reminders.get(task.reminder_id)) is not None
        and eligible(task, reminder, pending.get(reminder.pk), reminder.latest_completed_id, user)}


@transaction.atomic
def undo_completion(task_id, actor, expected_completion):
    initial = ReminderTask.objects.filter(pk=task_id, user=actor).values("reminder_id").first()
    if initial is None:
        raise Http404
    # Lock every affected user's XP domain before plant/reminder/task locks,
    # including the caregiver whose original reward must be reversed.
    awarded_to = TaskXPAward.objects.filter(source_task_id=task_id, is_reversed=False).values_list("user_id", flat=True).first()
    list(get_user_model().objects.select_for_update().filter(pk__in=sorted({actor.pk, awarded_to} - {None})).order_by("pk"))
    plant_id = Reminder.objects.filter(pk=initial["reminder_id"]).values_list("plant_id", flat=True).first()
    with locked_plant_access(actor, plant_id, require_completion=False) as plant:
        if plant.user_id != actor.pk:
            raise Http404
        reminder = Reminder.objects.select_for_update().get(pk=initial["reminder_id"])
        reminder.plant = plant
        task = ReminderTask.objects.select_for_update().get(pk=task_id, reminder=reminder, user=actor)
        successor = ReminderTask.objects.select_for_update().filter(reminder=reminder, status="pending").first()
        latest_id = ReminderTask.objects.filter(reminder=reminder, status="completed").order_by("-updated_at", "-pk").values_list("pk", flat=True).first()
        if (not eligible(task, reminder, successor, latest_id, actor)
                or task.completion_undo["version"] != str(expected_completion)):
            raise ValidationError("This completion can no longer be undone. Reload the journal.", code="undo_unavailable")
        award = TaskXPAward.objects.select_for_update().filter(source_task_id=task.pk, is_reversed=False).first()
        if (award.user_id if award else None) != awarded_to:
            raise ValidationError("The completion changed. Reload the journal.", code="undo_unavailable")
        if award:
            progression = AccountProgression.objects.select_for_update().get(user_id=award.user_id)
            progression.total_xp = max(0, progression.total_xp - award.xp)
            progression.save(update_fields=["total_xp", "updated_at"])
            award.is_reversed = True
            award.save(update_fields=["is_reversed"])
        previous_note = task.completion_undo.get("previous_note")
        successor.delete()
        task.status = "pending"
        task.completed_at = None
        task.completed_by = None
        task.completed_event = None
        task.completion_undo = None
        task.note = previous_note
        task.save(update_fields=["status", "completed_at", "completed_by", "completed_event", "completion_undo", "note", "updated_at"])
        # Stop unclaimed completion messages. Already sent/in-flight deliveries
        # cannot be recalled; retries also recheck that the task is completed.
        from sharing.models import SharedCareNotification
        SharedCareNotification.objects.filter(source_task_id=task.pk, status="pending").update(status="skipped")
        return task
