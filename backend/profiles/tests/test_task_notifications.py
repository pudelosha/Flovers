import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.tasks import _count_due_on_date
from reminders.models import Reminder, ReminderTask

User = get_user_model()


def _reminder(user, *, is_active=True, name="Monstera"):
    location = Location.objects.create(
        user=user,
        name=f"{name} location",
        category="indoor",
    )
    plant = PlantInstance.objects.create(
        user=user,
        location=location,
        display_name=name,
    )
    return Reminder.objects.create(
        user=user,
        plant=plant,
        type="water",
        start_date=timezone.localdate(),
        interval_value=7,
        interval_unit="days",
        is_active=is_active,
    )


@pytest.mark.django_db
def test_notification_due_count_ignores_pending_tasks_for_paused_reminders():
    user = User.objects.create_user(
        email="test@example.com",
        password="strong-password-123",
    )
    today = timezone.localdate()
    active_reminder = _reminder(user, is_active=True, name="Active")
    paused_reminder = _reminder(user, is_active=False, name="Paused")

    ReminderTask.objects.create(
        reminder=active_reminder,
        user=user,
        due_date=today,
        status="pending",
    )
    ReminderTask.objects.create(
        reminder=paused_reminder,
        user=user,
        due_date=today,
        status="pending",
    )

    assert _count_due_on_date(user.id, today) == 1
