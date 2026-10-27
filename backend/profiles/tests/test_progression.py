from datetime import date, datetime, timedelta, timezone as dt_timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from locations.models import Location
from plant_instances.models import PlantInstance
from profiles.models import AccountProgression, TaskXPAward
from profiles.progression import level_progress
from readings.models import AccountSecret, PumpTask, ReadingDevice
from reminders.models import Reminder, ReminderTask


pytestmark = pytest.mark.django_db
UTC = dt_timezone.utc


@pytest.fixture
def clock():
    current = [datetime(2026, 10, 27, 12, 0, tzinfo=UTC)]
    with patch("django.utils.timezone.now", side_effect=lambda: current[0]):
        yield current


@pytest.fixture
def scene(clock):
    user = get_user_model().objects.create_user(email="xp@example.test", password="xp-test-password")
    location = Location.objects.create(user=user, name="Living room", category="indoor")
    client = APIClient()
    client.force_authenticate(user=user)
    return SimpleNamespace(user=user, location=location, client=client, clock=clock)


def make_task(scene, *, plant=None, kind="water", due=None, interval=7):
    if plant is None:
        plant = PlantInstance.objects.create(
            user=scene.user, location=scene.location, display_name="XP plant",
        )
    due = due or scene.clock[0].date()
    reminder = Reminder.objects.create(
        user=scene.user, plant=plant, type=kind, start_date=due,
        interval_value=interval, interval_unit="days",
    )
    return ReminderTask.objects.create(reminder=reminder, user=scene.user, due_date=due)


def complete(scene, task, payload=None):
    response = scene.client.post(
        reverse("reminder-task-complete", args=[task.pk]),
        payload or {}, format="json",
    )
    assert response.status_code == 200, response.data
    return response.data


def progression(scene):
    response = scene.client.get(reverse("profile-progression"))
    assert response.status_code == 200, response.data
    return response.data["data"]


def test_progression_requires_authentication():
    assert APIClient().get(reverse("profile-progression")).status_code == 401


def test_new_account_starts_without_backfill_or_read_side_effects(scene):
    old = make_task(scene, due=date(2026, 1, 1))
    old.status = "completed"
    old.completed_at = scene.clock[0] - timedelta(days=30)
    old.save()
    data = progression(scene)
    assert data == {
        "total_xp": 0, "level": 1, "rank_key": "seedling",
        "xp_into_level": 0, "xp_for_next_level": 100,
        "daily_xp": 0, "daily_cap": 250,
    }
    assert not AccountProgression.objects.filter(user=scene.user).exists()
    assert not TaskXPAward.objects.filter(user=scene.user).exists()
    complete(scene, old)
    assert progression(scene)["total_xp"] == 0


def test_progression_reads_only_authenticated_account_and_is_not_writable(scene):
    other = get_user_model().objects.create_user(email="other-xp@example.test", password="xp-test-password")
    AccountProgression.objects.create(user=other, total_xp=5500)
    response = scene.client.get(reverse("profile-progression"), {"user_id": other.pk})
    assert response.status_code == 200
    assert response.data["data"]["total_xp"] == 0
    for method in ("post", "patch", "put"):
        response = getattr(scene.client, method)(
            reverse("profile-progression"), {"total_xp": 194625, "level": 100}, format="json",
        )
        assert response.status_code == 405
    assert AccountProgression.objects.get(user=other).total_xp == 5500
    assert not AccountProgression.objects.filter(user=scene.user).exists()


def test_real_completion_rewards_first_task_and_duplicate_requests_only_once(scene):
    task = make_task(scene)
    data = complete(scene, task)
    assert data["next_task"]["status"] == "pending"
    assert progression(scene) == {
        "total_xp": 100, "level": 2, "rank_key": "seedling",
        "xp_into_level": 0, "xp_for_next_level": 200,
        "daily_xp": 100, "daily_cap": 250,
    }
    for _ in range(3):
        complete(scene, task)
    assert TaskXPAward.objects.filter(user=scene.user, source_task_id=task.pk).count() == 1
    assert progression(scene)["total_xp"] == 100
    assert task.reminder.tasks.filter(status="pending").count() == 1


def test_daily_diminishing_rewards_and_cap_are_shared_across_plants(scene):
    expected = [100, 50, 30, 20, 10, 10, 10, 10, 10, 0, 0, 0]
    for xp in expected:
        task = make_task(scene)
        complete(scene, task)
        assert TaskXPAward.objects.get(source_task_id=task.pk).xp == xp
    data = progression(scene)
    assert data["total_xp"] == data["daily_xp"] == data["daily_cap"] == 250
    assert TaskXPAward.objects.filter(user=scene.user).count() == len(expected)


def test_non_due_recurring_tasks_cannot_be_farmed_or_advance_daily_reward_slot(scene):
    task = make_task(scene, interval=1)
    next_id = complete(scene, task)["next_task"]["id"]
    for _ in range(5):
        current = ReminderTask.objects.get(pk=next_id)
        assert current.due_date > scene.clock[0].date()
        next_id = complete(scene, current)["next_task"]["id"]
        assert TaskXPAward.objects.get(source_task_id=current.pk).xp == 0
    another = make_task(scene)
    complete(scene, another)
    assert TaskXPAward.objects.get(source_task_id=another.pk).xp == 50
    assert progression(scene)["total_xp"] == 150


def test_backdated_completion_does_not_reset_daily_quota(scene):
    for _ in range(9):
        complete(scene, make_task(scene))
    task = make_task(scene)
    complete(scene, task, {"completedDate": "2026-10-01"})
    award = TaskXPAward.objects.get(source_task_id=task.pk)
    task.refresh_from_db()
    assert task.completed_at.date() == date(2026, 10, 1)
    assert award.earned_on == date(2026, 10, 27)
    assert award.xp == 0
    assert progression(scene)["daily_xp"] == 250


def test_utc_day_reset_grants_first_reward_even_when_completion_is_backdated(scene):
    complete(scene, make_task(scene))
    scene.clock[0] = datetime(2026, 10, 28, 0, 1, tzinfo=UTC)
    task = make_task(scene)
    complete(scene, task, {"completedDate": "2026-10-27"})
    assert TaskXPAward.objects.get(source_task_id=task.pk).xp == 100
    assert progression(scene)["total_xp"] == 200
    assert progression(scene)["daily_xp"] == 100


@override_settings(TIME_ZONE="Europe/Warsaw")
def test_due_calendar_uses_server_timezone_but_quota_day_stays_utc(scene):
    scene.clock[0] = datetime(2026, 10, 27, 23, 30, tzinfo=UTC)
    # It is already October 28 in the server's care calendar.
    due_now = make_task(scene, due=date(2026, 10, 28))
    future = make_task(scene, due=date(2026, 10, 29))
    # Request/user timezone overrides must not move either earning day or eligibility.
    with timezone.override("Pacific/Honolulu"):
        complete(scene, due_now)
        complete(scene, future)
    assert TaskXPAward.objects.get(source_task_id=due_now.pk).xp == 100
    assert TaskXPAward.objects.get(source_task_id=due_now.pk).earned_on == date(2026, 10, 27)
    assert TaskXPAward.objects.get(source_task_id=future.pk).xp == 0
    assert progression(scene)["daily_xp"] == 100


def test_reminder_deletion_and_recreation_do_not_reset_plant_care_daily_slot(scene):
    task = make_task(scene)
    plant = task.reminder.plant
    complete(scene, task)
    task.reminder.delete()
    replacement = make_task(scene, plant=plant)
    complete(scene, replacement)
    assert TaskXPAward.objects.get(source_task_id=replacement.pk).xp == 0
    assert progression(scene)["total_xp"] == 100
    # Another type of care on the same plant is independently eligible.
    care_task = make_task(scene, plant=plant, kind="care")
    complete(scene, care_task)
    assert TaskXPAward.objects.get(source_task_id=care_task.pk).xp == 50


def test_history_and_plant_deletion_preserve_award_evidence_and_balance(scene):
    task = make_task(scene)
    plant = task.reminder.plant
    task_id = task.pk
    complete(scene, task)
    response = scene.client.delete(reverse("reminder-task-detail-delete", args=[task_id]))
    assert response.status_code == 204
    assert TaskXPAward.objects.get(source_task_id=task_id).xp == 100
    plant.delete()
    assert TaskXPAward.objects.get(source_task_id=task_id).xp == 100
    assert progression(scene)["total_xp"] == progression(scene)["daily_xp"] == 100


def test_account_deletion_removes_its_balance_and_ledger(scene):
    complete(scene, make_task(scene))
    user_id = scene.user.pk
    # Existing plant -> location PROTECT requires plant cleanup before deleting
    # the account. The new XP data must survive that cleanup, then cascade.
    PlantInstance.objects.filter(user=scene.user).delete()
    assert TaskXPAward.objects.filter(user_id=user_id).exists()
    scene.user.delete()
    assert not AccountProgression.objects.filter(user_id=user_id).exists()
    assert not TaskXPAward.objects.filter(user_id=user_id).exists()


def test_another_user_cannot_complete_a_task_to_award_xp(scene):
    task = make_task(scene)
    other = get_user_model().objects.create_user(email="foreign-xp@example.test", password="xp-test-password")
    scene.client.force_authenticate(other)
    response = scene.client.post(reverse("reminder-task-complete", args=[task.pk]), {}, format="json")
    assert response.status_code == 404
    assert not TaskXPAward.objects.exists()


def test_pump_jobs_and_historical_rows_do_not_create_xp(scene):
    plant = PlantInstance.objects.create(user=scene.user, location=scene.location, display_name="Pump plant")
    device = ReadingDevice.objects.create(user=scene.user, plant=plant, device_name="Pump", pump_included=True)
    AccountSecret.objects.update_or_create(user=scene.user, defaults={"secret": "xp-device-secret"})
    for source in (PumpTask.SOURCE_MANUAL, PumpTask.SOURCE_AUTOMATIC):
        task = PumpTask.objects.create(
            device=device, source=source, status=PumpTask.STATUS_DELIVERED,
            requested_at=scene.clock[0], delivered_at=scene.clock[0],
        )
        response = APIClient().post(reverse("pump-complete"), {
            "secret": "xp-device-secret", "device_key": device.device_key,
            "device_id": device.pk, "task_id": task.pk, "source": source, "success": True,
        }, format="json")
        assert response.status_code == 200
    # Historical task-less firmware reports are excluded too.
    response = APIClient().post(reverse("pump-complete"), {
        "secret": "xp-device-secret", "device_key": device.device_key,
        "device_id": device.pk, "source": "automatic", "success": True,
    }, format="json")
    assert response.status_code == 200
    assert progression(scene)["total_xp"] == 0
    assert not TaskXPAward.objects.exists()


def test_recurrence_failure_rolls_back_completion_award_and_balance(scene):
    task = make_task(scene)
    with patch.object(ReminderTask.objects, "create", side_effect=RuntimeError("simulated recurrence failure")):
        with pytest.raises(RuntimeError, match="simulated recurrence failure"):
            task.mark_complete_and_spawn_next()
    task.refresh_from_db()
    assert task.status == "pending"
    assert not TaskXPAward.objects.filter(user=scene.user).exists()
    assert not AccountProgression.objects.filter(user=scene.user).exists()


@pytest.mark.parametrize("total,level,rank,into,required", [
    (0, 1, "seedling", 0, 100),
    (99, 1, "seedling", 99, 100),
    (100, 2, "seedling", 0, 200),
    (4500, 10, "seedling", 0, 1000),
    (5499, 10, "seedling", 999, 1000),
    (5500, 11, "sproutKeeper", 0, 1025),
    (16875, 21, "leafLover", 0, 1275),
    (30750, 31, "buddingGardener", 0, 1525),
    (47125, 41, "plantNurturer", 0, 1775),
    (66000, 51, "greenThumb", 0, 2025),
    (87375, 61, "gardenGuardian", 0, 2275),
    (111250, 71, "botanicalExpert", 0, 2525),
    (137625, 81, "masterGrower", 0, 2775),
    (166500, 91, "plantLegend", 0, 3025),
    (194624, 99, "plantLegend", 3224, 3225),
    (194625, 100, "plantLegend", 0, 0),
    (999999, 100, "plantLegend", 0, 0),
])
def test_level_curve_and_all_rank_boundaries(total, level, rank, into, required):
    assert level_progress(total) == {
        "level": level, "rank_key": rank,
        "xp_into_level": into, "xp_for_next_level": required,
    }


def test_final_award_is_clamped_to_maximum_level_balance(scene):
    AccountProgression.objects.create(user=scene.user, total_xp=194600)
    first = make_task(scene)
    complete(scene, first)
    assert TaskXPAward.objects.get(source_task_id=first.pk).xp == 25
    second = make_task(scene)
    complete(scene, second)
    assert TaskXPAward.objects.get(source_task_id=second.pk).xp == 0
    data = progression(scene)
    assert data["total_xp"] == 194625
    assert data["level"] == 100
    assert data["xp_for_next_level"] == data["xp_into_level"] == 0
    assert data["daily_xp"] == 25


@pytest.mark.django_db(transaction=True)
@pytest.mark.skipif(connection.vendor != "postgresql", reason="PostgreSQL row-lock concurrency check")
def test_simultaneous_completions_share_one_account_reward_order(scene):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from django.db import close_old_connections

    tasks = [make_task(scene), make_task(scene)]
    ready = Barrier(2)

    def finish(task_id):
        close_old_connections()
        try:
            client = APIClient()
            client.force_authenticate(get_user_model().objects.get(pk=scene.user.pk))
            ready.wait(timeout=10)
            return client.post(
                reverse("reminder-task-complete", args=[task_id]), {}, format="json",
            ).status_code
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(finish, [t.pk for t in tasks]))
    assert results == [200, 200]
    assert sorted(TaskXPAward.objects.filter(user=scene.user).values_list("xp", flat=True)) == [50, 100]
    assert progression(scene)["total_xp"] == progression(scene)["daily_xp"] == 150
