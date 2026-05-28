from __future__ import annotations

from datetime import datetime

from django.conf import settings
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
    start_date = models.DateField()               # logical “anchor”
    interval_value = models.PositiveIntegerField()  # e.g. 7
    interval_unit = models.CharField(max_length=8, choices=UNIT_CHOICES, default="days")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("plant", "type")]  # one reminder per type per plant
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.plant_id}:{self.type} every {self.interval_value} {self.interval_unit}"

    def _next_due_from_anchor(self, today=None):
        """
        Rules:
        - if start_date > today: next = start_date
        - if start_date == today: next = start_date + interval
        - if start_date < today: add interval * n until > today
        """
        if today is None:
            today = timezone.localdate()
        sd = self.start_date

        if self.interval_unit == "days":
            from datetime import timedelta

            if sd > today:
                return sd
            if sd == today:
                return sd + timedelta(days=self.interval_value)
            diff_days = (today - sd).days
            n = diff_days // self.interval_value
            candidate = sd + timedelta(days=(n * self.interval_value))
            if candidate <= today:
                candidate = candidate + timedelta(days=self.interval_value)
            return candidate

        from dateutil.relativedelta import relativedelta

        if sd > today:
            return sd
        if sd == today:
            return sd + relativedelta(months=self.interval_value)

        months_passed = (today.year - sd.year) * 12 + (today.month - sd.month)
        n = months_passed // self.interval_value
        candidate = sd + relativedelta(months=n * self.interval_value)
        if candidate <= today:
            candidate = candidate + relativedelta(months=self.interval_value)
        return candidate

    @transaction.atomic
    def ensure_one_pending_task(self):
        """Guarantee exactly one pending task exists if reminder is active."""
        if not self.is_active:
            return None
        pending = self.tasks.filter(status="pending").first()
        if pending:
            return pending
        due = self._next_due_from_anchor()
        return ReminderTask.objects.create(
            reminder=self,
            user=self.user,
            due_date=due,
            status="pending",
        )


class ReminderTask(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
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

    note = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "id"]

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
        if interval_unit == "days":
            from datetime import timedelta

            return anchor_date + timedelta(days=interval_value)

        from dateutil.relativedelta import relativedelta

        return anchor_date + relativedelta(months=interval_value)

    @transaction.atomic
    def mark_complete_and_spawn_next(self, note=None, completed_date=None):
        """
        Complete this task and create the next pending one.

        Rules:
        - Anchor the next task on the actual completion date.
        - If repeated intervals would land in the past or today, advance until
          the next due date is strictly after today.
        - Ensure at most ONE pending task exists per reminder.
        """
        if self.status == "completed":
            return None  # idempotent

        today = timezone.localdate()
        if completed_date is None:
            completed_date = today
        if completed_date > today:
            raise ValueError("completed_date cannot be in the future.")

        if note is not None:
            self.note = note

        self.status = "completed"
        self.completed_at = self._completed_at_for_date(completed_date)
        self.save(update_fields=["status", "completed_at", "updated_at", "note"])

        rem = self.reminder

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
