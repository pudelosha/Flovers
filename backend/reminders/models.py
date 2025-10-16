from __future__ import annotations

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

# We’ll relate to PlantInstance in plant_instances app
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

    # ---- scheduling logic ----
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
            # sd < today
            diff_days = (today - sd).days
            # number of completed intervals
            n = diff_days // self.interval_value
            candidate = sd + timedelta(days=(n * self.interval_value))
            if candidate <= today:
                candidate = candidate + timedelta(days=self.interval_value)
            return candidate

        # months
        from dateutil.relativedelta import relativedelta

        if sd > today:
            return sd
        if sd == today:
            return sd + relativedelta(months=self.interval_value)

        # sd < today
        months_passed = (today.year - sd.year) * 12 + (today.month - sd.month)
        # find n s.t. sd + n*interval > today
        n = months_passed // self.interval_value
        candidate = sd + relativedelta(months=n * self.interval_value)
        # adjust day-of-month rollover edge-cases automatically handled by relativedelta
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

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date", "id"]

    def __str__(self):
        return f"Task#{self.pk} {self.reminder.type} due {self.due_date} ({self.status})"

    @transaction.atomic
    def mark_complete_and_spawn_next(self):
        """
        Complete this task and create the next one based on the reminder’s interval.
        Creates exactly one new pending task due_date = current_due + interval.
        """
        if self.status == "completed":
            return None  # idempotent

        self.status = "completed"
        self.completed_at = timezone.now()
        self.save(update_fields=["status", "completed_at", "updated_at"])

        rem = self.reminder
        # compute next due from *this* task's due_date forward
        if rem.interval_unit == "days":
            from datetime import timedelta
            next_due = self.due_date + timedelta(days=rem.interval_value)
        else:
            from dateutil.relativedelta import relativedelta
            next_due = self.due_date + relativedelta(months=rem.interval_value)

        return ReminderTask.objects.create(
            reminder=rem,
            user=self.user,
            due_date=next_due,
            status="pending",
        )
