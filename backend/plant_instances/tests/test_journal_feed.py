from datetime import timedelta
from types import SimpleNamespace
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core import signing
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from locations.models import Location
from reminders.models import Reminder, ReminderTask
from plant_instances.models import PlantInstance, PlantImage, JournalPhotoEntry
from sharing.models import PlantShare

pytestmark = pytest.mark.django_db


@pytest.fixture
def feed():
    User = get_user_model()
    owner = User.objects.create_user(email="feed-owner@example.test", password="test", is_active=True)
    reader = User.objects.create_user(email="feed-reader@example.test", password="test", is_active=True)
    other = User.objects.create_user(email="feed-other@example.test", password="test", is_active=True)
    location = Location.objects.create(user=owner, name="Kitchen")
    plant = PlantInstance.objects.create(user=owner, location=location, display_name="Fern")
    second = PlantInstance.objects.create(user=owner, location=location, display_name="Orchid")
    low, high = sorted((owner.pk, reader.pk))
    contact = Connection.objects.create(user_low_id=low, user_high_id=high, initiator=owner, status="accepted")
    share = PlantShare.objects.create(plant=plant, recipient=reader, connection=contact, can_complete_tasks=True)
    client = APIClient()
    client.force_authenticate(owner)
    now = timezone.now() - timedelta(days=1)

    def task(plant=plant, when=now, kind="water"):
        reminder, _ = Reminder.objects.get_or_create(plant=plant, user=owner, type=kind,
            defaults={"start_date": now.date(), "interval_value": 7})
        return ReminderTask.objects.create(reminder=reminder, user=owner, due_date=when.date(),
            status="completed", completed_at=when, completed_by=reader, created_at=when)

    def photo(plant=plant, when=now):
        entry = JournalPhotoEntry.objects.create(plant=plant, created_at=when)
        PlantImage.objects.create(plant=plant, journal_entry=entry, purpose="journal", upload_key=uuid.uuid4(),
            directory=uuid.uuid4().hex, width=80, height=80, byte_size=1200)
        return entry

    def get(**query):
        result = client.get(reverse("journal-feed"), query)
        assert result.status_code == 200, result.data
        return result.data

    return SimpleNamespace(owner=owner, reader=reader, other=other, plant=plant, second=second,
        share=share, client=client, now=now, task=task, photo=photo, get=get)


def keys(data):
    return [(row["kind"], row["data"]["id"]) for row in data["results"]]


@pytest.mark.parametrize("sortKey", ["completedAt", "plant", "location"])
@pytest.mark.parametrize("sortDir", ["asc", "desc"])
def test_mixed_cursor_pages_have_stable_ties_and_order(feed, sortKey, sortDir):
    # Same timestamps exercise kind and primary-key cursor tie breakers.
    for plant in [feed.plant, feed.second]:
        for _ in range(3):
            feed.task(plant=plant)
            feed.photo(plant=plant)
    expected = keys(feed.get(sortKey=sortKey, sortDir=sortDir, limit=100))
    actual, cursor = [], None
    while True:
        page = feed.get(sortKey=sortKey, sortDir=sortDir, limit=2, **({"cursor": cursor} if cursor else {}))
        actual += keys(page)
        cursor = page["next_cursor"]
        if not cursor: break
    assert actual == expected
    assert len(actual) == len(set(actual)) == 12


def test_filters_and_options_are_server_side_not_page_scoped(feed):
    task = feed.task()
    photo = feed.photo(plant=feed.second)
    feed.task(plant=feed.second, kind="care", when=feed.now-timedelta(days=5))
    assert keys(feed.get(types="photo", plantId=feed.second.pk)) == [("photo", str(photo.pk))]
    assert keys(feed.get(types="watering", location="Kitchen")) == [("task", str(task.pk))]
    assert len(feed.get(completedFrom=feed.now.date().isoformat(), completedTo=feed.now.date().isoformat())["results"]) == 2
    assert feed.get(types="photo")["can_manage_tasks"] is False
    options = feed.client.get(reverse("journal-options")).data
    assert {p["name"] for p in options["plants"]} == {"Fern", "Orchid"}
    assert {p["id"] for p in options["delete_plants"]} == {str(feed.plant.pk), str(feed.second.pk)}
    assert all(set(p) == {"id", "name", "location"} for p in options["owned_plants"])
    assert feed.get(limit=1)["can_manage_tasks"] is True


def test_sharing_and_revocation_are_rechecked_on_each_page(feed):
    for plant in [feed.plant, feed.second]:
        feed.task(plant=plant)
        feed.photo(plant=plant)
    feed.client.force_authenticate(feed.reader)
    first = feed.get(limit=1)
    assert first["next_cursor"] and not first["can_manage_tasks"]
    assert {row["data"]["plant_id"] for row in feed.get()["results"]} == {str(feed.plant.pk)}
    assert feed.client.get(reverse("journal-options")).data["owned_plants"] == []
    feed.share.delete()
    assert feed.get(limit=1, cursor=first["next_cursor"])["results"] == []
    feed.client.force_authenticate(feed.other)
    assert feed.get()["results"] == []


def test_history_uses_event_plant_after_reminder_moves(feed):
    task = feed.task()
    task.reminder.plant = feed.second
    task.reminder.save()
    feed.client.force_authenticate(feed.reader)
    data = feed.get(plantId=feed.plant.pk)["results"][0]["data"]
    assert data["plant_name"] == "Fern" and data["plant_id"] == str(feed.plant.pk)
    assert data["access"]["is_shared"] and data["completed_by"]["id"] == str(feed.reader.pk)
    assert feed.get(plantId=feed.second.pk)["results"] == []


@pytest.mark.parametrize("query", [{"limit": 101}, {"limit": 0}, {"types": "evil"},
    {"timezone": "bad/zone"}, {"plantId": -1}, {"sortKey": "id"},
    {"completedFrom": "2026-11-02", "completedTo": "2026-01-01"}, {"cursor": "bad"}])
def test_invalid_query_is_rejected(feed, query):
    assert feed.client.get(reverse("journal-feed"), query).status_code == 400


def test_cursor_is_bound_to_user_filters_and_snapshot(feed):
    for _ in range(3): feed.task()
    first = feed.get(limit=1)
    feed.photo(when=timezone.now())  # New entry must not move the existing snapshot.
    assert all(row["kind"] == "task" for row in feed.get(limit=1, cursor=first["next_cursor"])["results"])
    assert feed.client.get(reverse("journal-feed"), {"limit": 1, "cursor": first["next_cursor"], "types": "photo"}).status_code == 400
    feed.client.force_authenticate(feed.reader)
    assert feed.client.get(reverse("journal-feed"), {"limit": 1, "cursor": first["next_cursor"]}).status_code == 400


def test_availability_is_lightweight_and_private(feed):
    feed.photo()
    feed.plant.last_journal_photo_at = feed.now
    feed.plant.save(update_fields=["last_journal_photo_at"])
    result = feed.client.get(reverse("journal-photo-availability")).data
    assert len(result["availability"]) == 2
    assert next(row for row in result["availability"] if row["plant_id"] == str(feed.plant.pk))["next_photo_at"] is not None
    assert "results" not in result
    feed.client.force_authenticate(feed.reader)
    assert feed.client.get(reverse("journal-photo-availability")).data == {"availability": []}


@pytest.mark.parametrize("route", ["journal-feed", "journal-options", "journal-photo-availability"])
def test_authentication_and_active_account_required(feed, route):
    feed.client.force_authenticate(None)
    assert feed.client.get(reverse(route)).status_code in (401, 403)
    feed.owner.is_active = False
    feed.owner.save(update_fields=["is_active"])
    feed.client.force_authenticate(feed.owner)
    assert feed.client.get(reverse(route)).status_code in (401, 403)


def test_page_serializes_only_requested_rows(feed, monkeypatch):
    for _ in range(40): feed.task()
    from plant_instances import journal_feed
    original = journal_feed.task_data
    calls = []
    def counted(*args, **kwargs):
        calls.append(args[0].pk)
        return original(*args, **kwargs)
    monkeypatch.setattr(journal_feed, "task_data", counted)
    result = feed.get(limit=3)
    assert len(result["results"]) == len(calls) == 3
    assert result["next_cursor"]


def test_new_backdated_completion_does_not_enter_an_existing_snapshot(feed):
    for _ in range(3): feed.task()
    page = feed.get(limit=1)
    late = feed.task(when=feed.now-timedelta(hours=1))
    remaining = feed.get(limit=1, cursor=page["next_cursor"])
    assert str(late.pk) not in {row["data"]["id"] for row in remaining["results"]}


def test_sql_limits_rows_and_does_not_add_one_query_per_task(feed, django_assert_num_queries):
    from django.db import connection
    from django.test.utils import CaptureQueriesContext
    for _ in range(35): feed.task()
    with CaptureQueriesContext(connection) as captured:
        page = feed.get(limit=5)
    queries = [row["sql"] for row in captured]
    assert any('LIMIT 6' in sql and 'reminders_remindertask' in sql for sql in queries)
    assert len(queries) < 14, queries
    assert len(page["results"]) == 5


def test_expired_cursor_requires_refresh(feed, monkeypatch):
    for _ in range(2): feed.task()
    cursor = feed.get(limit=1)["next_cursor"]
    from django.core import signing
    with monkeypatch.context() as patch:
        patch.setattr(signing.time, "time", lambda: timezone.now().timestamp()+90000)
        assert feed.client.get(reverse("journal-feed"), {"limit":1,"cursor":cursor}).status_code == 400


def test_date_filter_respects_client_timezone_and_end_of_dst(feed):
    from datetime import datetime, timezone as utc
    before = feed.task(when=datetime(2026,10,24,21,59,tzinfo=utc.utc))
    inside = feed.task(when=datetime(2026,10,24,22,0,tzinfo=utc.utc))
    last = feed.task(when=datetime(2026,10,25,22,59,tzinfo=utc.utc))
    after = feed.task(when=datetime(2026,10,25,23,0,tzinfo=utc.utc))
    data = feed.get(completedFrom="2026-10-25",completedTo="2026-10-25",timezone="Europe/Warsaw")
    assert {row["data"]["id"] for row in data["results"]} == {str(inside.pk),str(last.pk)}
    assert feed.client.get(reverse("journal-feed"), {"completedTo":"9999-12-31"}).status_code == 400


def test_photo_only_plant_is_not_offered_for_task_deletion_and_paused_history_remains(feed):
    task=feed.task()
    task.reminder.is_active=False
    task.reminder.save(update_fields=["is_active"])
    feed.photo(plant=feed.second)
    options=feed.client.get(reverse("journal-options")).data
    assert {row["id"] for row in options["plants"]} == {str(feed.plant.pk),str(feed.second.pk)}
    assert options["delete_plants"] == [{"id":str(feed.plant.pk),"name":"Fern"}]
    assert len(feed.get(types="watering")["results"]) == 1
