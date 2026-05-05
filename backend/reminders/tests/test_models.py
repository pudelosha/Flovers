from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from locations.models import Location
from plant_instances.models import PlantInstance
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _plant(user):
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    return PlantInstance.objects.create(user=user, location=location, display_name="Monstera")


@pytest.mark.django_db
def test_reminder_string_representation():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=date(2026, 5, 5),
        interval_value=7,
        interval_unit="days",
    )

    assert str(reminder) == f"{plant.id}:water every 7 days"


@pytest.mark.django_db
def test_next_due_from_anchor_for_days_future_today_and_past():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    today = date(2026, 5, 5)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=today,
        interval_value=7,
        interval_unit="days",
    )

    reminder.start_date = today + timedelta(days=2)
    assert reminder._next_due_from_anchor(today=today) == today + timedelta(days=2)

    reminder.start_date = today
    assert reminder._next_due_from_anchor(today=today) == today + timedelta(days=7)

    reminder.start_date = today - timedelta(days=10)
    assert reminder._next_due_from_anchor(today=today) == today + timedelta(days=4)


@pytest.mark.django_db
def test_ensure_one_pending_task_is_idempotent():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
        interval_unit="days",
    )

    first = reminder.ensure_one_pending_task()
    second = reminder.ensure_one_pending_task()

    assert first == second
    assert reminder.tasks.filter(status="pending").count() == 1


@pytest.mark.django_db
def test_inactive_reminder_does_not_create_pending_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
        interval_unit="days",
        is_active=False,
    )

    assert reminder.ensure_one_pending_task() is None
    assert reminder.tasks.exists() is False


@pytest.mark.django_db
def test_mark_complete_and_spawn_next_updates_task_and_creates_next():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
        interval_unit="days",
    )
    task = ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="pending",
    )

    next_task = task.mark_complete_and_spawn_next(note="Done")
    task.refresh_from_db()

    assert task.status == "completed"
    assert task.note == "Done"
    assert task.completed_at is not None
    assert next_task.status == "pending"
    assert next_task.due_date == timezone.localdate() + timedelta(days=7)


@pytest.mark.django_db
def test_mark_complete_is_idempotent_for_completed_task():
    user = User.objects.create_user(email="test@example.com", password="strong-password-123")
    plant = _plant(user)
    reminder = Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
        interval_unit="days",
    )
    task = ReminderTask.objects.create(
        reminder=reminder,
        user=user,
        due_date=timezone.localdate(),
        status="completed",
        completed_at=timezone.now(),
    )

    assert task.mark_complete_and_spawn_next() is None
