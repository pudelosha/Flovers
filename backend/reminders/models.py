from __future__ import annotations

from datetime import datetime

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone


class Reminder(models.Model):
    TYPE_CHOICES = [
        ("water", "Watering"),
        ("moisture", "Misting"),
        ("fertilize", "Fertilising"),
        ("care", "General care"),
        ("repot", "Repotting"),
    ]

    UNIT_CHOICES = [
        ("days", "Days"),
        ("months", "Months"),
    ]

    plant = models.ForeignKey(
        "plant_instances.PlantInstance",
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminders",
    )

    type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    start_date = models.DateField()  # first actual due date
    interval_value = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    interval_unit = models.CharField(max_length=8, choices=UNIT_CHOICES, default="days")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("plant", "type")]  # one reminder per type per plant
        ordering = ["-created_at"]
        constraints = [models.CheckConstraint(condition=models.Q(interval_value__gte=1), name="reminder_interval_positive")]

    def __str__(self):
        return f"{self.plant_id}:{self.type} every {self.interval_value} {self.interval_unit}"

    def _next_due_from_anchor(self, today=None):
        """
        Rules:
        start_date is the first due date; subsequent occurrences may fall today.
        """
        if today is None:
            today = timezone.localdate()
        self._validate_interval()
        sd = self.start_date

        if self.interval_unit == "days":
            from datetime import timedelta

            if sd >= today:
                return sd
            diff_days = (today - sd).days
            n = diff_days // self.interval_value
            candidate = sd + timedelta(days=(n * self.interval_value))
            if candidate < today:
                candidate = candidate + timedelta(days=self.interval_value)
            return candidate

        from dateutil.relativedelta import relativedelta

        if sd >= today:
            return sd

        months_passed = (today.year - sd.year) * 12 + (today.month - sd.month)
        n = months_passed // self.interval_value
        candidate = sd + relativedelta(months=n * self.interval_value)
        if candidate < today:
            candidate = candidate + relativedelta(months=self.interval_value)
        return candidate

    def _validate_interval(self):
        if self.interval_value is None or self.interval_value < 1:
            raise ValidationError({"interval_value": "Interval must be at least 1."})

    def save(self, *args, **kwargs):
        self._validate_interval()
        return super().save(*args, **kwargs)

    @transaction.atomic
    def ensure_one_pending_task(self):
        """Guarantee exactly one pending task exists if reminder is active."""
        current = type(self).objects.select_for_update().get(pk=self.pk)
        current._validate_interval()
        if not current.is_active:
            return None
        pending = current.tasks.filter(status="pending").first()
        if pending:
            return pending
        due = current._next_due_from_anchor()
        return ReminderTask.objects.create(
            reminder=current,
            user_id=current.user_id,
            due_date=due,
            status="pending",
        )


class ReminderTask(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    reminder = models.ForeignKey(
        Reminder,
        on_delete=models.CASCADE,
        related_name="tasks",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminder_tasks",
    )
    due_date = models.DateField()
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="pending")
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="completed_care_tasks", editable=False,
    )

    note = models.TextField(null=True, blank=True)
    completed_event = models.JSONField(null=True, blank=True, editable=False)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "id"]
        constraints = [
            models.UniqueConstraint(fields=["reminder"], condition=models.Q(status="pending"), name="one_pending_task_per_reminder"),
            models.CheckConstraint(condition=~models.Q(status="completed") | models.Q(completed_event__isnull=False), name="completed_task_has_event"),
        ]

    def current_event(self):
        reminder = self.reminder
        plant = reminder.plant
        definition = plant.plant_definition
        name = plant.display_name or (definition.name if definition else "") or f"Plant #{plant.pk}"
        start_date = reminder.start_date
        return {
            "plant_id": plant.pk,
            "type": reminder.type,
            "plant_name": name,
            "location_name": plant.location.name,
            "interval_value": reminder.interval_value,
            "interval_unit": reminder.interval_unit,
            "start_date": start_date.isoformat() if hasattr(start_date, "isoformat") else str(start_date),
        }

    @property
    def event(self):
        if self.status == "completed" and self.completed_event is not None:
            return self.completed_event
        return self.current_event()

    def save(self, *args, **kwargs):
        if self.status == "completed":
            previous = type(self).objects.filter(pk=self.pk).values("status", "completed_event").first() if self.pk else None
            if previous and previous["status"] == "completed" and previous["completed_event"] is not None:
                self.completed_event = previous["completed_event"]
            elif self.completed_event is None:
                self.completed_event = self.current_event()
            if kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = set(kwargs["update_fields"]) | {"completed_event"}
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Task#{self.pk} {self.reminder.type} due {self.due_date} ({self.status})"

    @staticmethod
    def _completed_at_for_date(completed_date):
        if completed_date is None:
            return timezone.now()

        local_now = timezone.localtime(timezone.now())
        naive = datetime.combine(
            completed_date,
            local_now.time().replace(microsecond=0),
        )
        return timezone.make_aware(naive, timezone.get_current_timezone())

    @staticmethod
    def _add_interval(anchor_date, interval_value, interval_unit):
        if interval_value is None or interval_value < 1:
            raise ValidationError({"interval_value": "Interval must be at least 1."})
        if interval_unit == "days":
            from datetime import timedelta

            return anchor_date + timedelta(days=interval_value)

        from dateutil.relativedelta import relativedelta

        return anchor_date + relativedelta(months=interval_value)

    @transaction.atomic
    def mark_complete_and_spawn_next(self, note=None, completed_date=None, actor=None):
        """
        Complete this task and create the next pending one.

        Rules:
        - Anchor the next task on the actual completion date.
        - If repeated intervals would land in the past or today, advance until
          the next due date is strictly after today.
        - Ensure at most ONE pending task exists per reminder.
        """
        from sharing.permissions import locked_plant_access

        actor = actor or self.user
        plant_id = Reminder.objects.values_list("plant_id", flat=True).get(pk=self.reminder_id)
        # Sharing changes, owner edits, completion and XP use the same user ->
        # plant -> reminder -> task lock order. Recheck the relationship below:
        # the reminder may have moved after the first unprotected lookup.
        with locked_plant_access(actor, plant_id, require_completion=True) as plant:
            return self._complete_with_access(plant, actor, note, completed_date)

    def _complete_with_access(self, plant, actor, note, completed_date):
        # All recurrence transitions lock parent first, then the task. Never use
        # status or recurrence settings cached by an earlier HTTP request.
        reminder = Reminder.objects.select_for_update().get(pk=self.reminder_id)
        current = type(self).objects.select_for_update().get(pk=self.pk, reminder_id=reminder.pk)
        current.reminder = reminder
        if reminder.plant_id != plant.pk or reminder.user_id != plant.user_id or current.user_id != plant.user_id:
            from django.http import Http404
            raise Http404("Task no longer belongs to this plant.")
        if current.status == "completed":
            self.__dict__.update(current.__dict__)
            return None
        if current.status != "pending" or not reminder.is_active:
            raise ValidationError("Only an active pending task can be completed.")
        reminder._validate_interval()

        today = timezone.localdate()
        if completed_date is None:
            completed_date = today
        if completed_date > today:
            raise ValueError("completed_date cannot be in the future.")

        if note is not None:
            current.note = note

        current.status = "completed"
        current.completed_by = actor
        receipt_now = timezone.now()
        current.completed_at = self._completed_at_for_date(completed_date)
        current.completed_event = current.current_event()
        current.save(update_fields=["status", "completed_at", "completed_by", "updated_at", "note", "completed_event"])
        from profiles.progression import award_task_completion
        award_task_completion(current, receipt_now, actor=actor)
        self.__dict__.update(current.__dict__)

        rem = reminder

        existing = rem.tasks.filter(status="pending").first()
        if existing:
            return existing

        next_due = self._add_interval(
            completed_date,
            rem.interval_value,
            rem.interval_unit,
        )
        while next_due <= today:
            next_due = self._add_interval(
                next_due,
                rem.interval_value,
                rem.interval_unit,
            )

        return ReminderTask.objects.create(
            reminder=rem,
            user=self.user,
            due_date=next_due,
            status="pending",
        )
