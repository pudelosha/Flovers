"""Real DRF routes/permissions/serializers; only time and external delivery are isolated."""
from datetime import datetime, timedelta, timezone as utc
from io import BytesIO
import json
import os
import socket
from types import SimpleNamespace
from unittest.mock import patch
from urllib.parse import parse_qsl, urlencode, urlsplit
import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from contacts.models import Connection, EmailInvitation, InvitationEmailDelivery
from locations.models import Location
from plant_definitions.models import PlantDefinition
from plant_instances.models import JournalPhotoEntry, PlantInstance
from profiles.models import AccountProgression
from readings.models import AccountSecret, PumpTask, Reading, ReadingDevice
from reminders.models import Reminder, ReminderTask
from sharing.models import PlantShare
from contracts.api.validation import assert_contract, canonical, digest, manifest

pytestmark = pytest.mark.django_db
NOW = datetime(2026, 11, 19, 12, tzinfo=utc.utc)
PHOTO = "00000000-0000-4000-8000-000000000501"


def image():
    output = BytesIO()
    Image.new("RGB", (96, 64), "green").save(output, "JPEG")
    return SimpleUploadedFile("synthetic.jpg", output.getvalue(), content_type="image/jpeg")


@pytest.fixture
def scene(settings, tmp_path):
    assert settings.EMAIL_BACKEND == "django.core.mail.backends.locmem.EmailBackend"
    assert settings.CELERY_BROKER_URL == "memory://"
    if os.environ.get("CI_DATABASE_URL"):
        from django.db import connection
        assert connection.vendor == "postgresql" and 160000 <= connection.pg_version < 170000
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private"
    settings.MEDIA_ROOT = tmp_path / "public"
    cache.clear()
    # HTTP requests are in-process; fail if application code tries external I/O.
    with patch("django.utils.timezone.now", return_value=NOW), patch.object(socket.socket, "connect", side_effect=AssertionError("Network disabled in contract tests")):
        users = {}
        for pk, name in enumerate(["owner", "caregiver", "viewer", "stranger", "expired"], 101):
            users[name] = get_user_model().objects.create_user(pk=pk, email=name+"@contract.invalid", password="synthetic", first_name=name.title(), is_active=True, flovers_id=uuid.UUID(int=pk))
        owner = users["owner"]
        location = Location.objects.create(pk=301, user=owner, name="Kitchen", category="indoor")
        plant = PlantInstance.objects.create(pk=201, user=owner, location=location, display_name="Contract fern", qr_code="contract-qr", created_at=NOW-timedelta(days=2))
        for name in ["caregiver", "viewer", "expired"]:
            user = users[name]
            connection = Connection.objects.create(user_low=owner, user_high=user, initiator=owner, status="accepted")
            PlantShare.objects.create(plant=plant, recipient=user, connection=connection, can_complete_tasks=name=="caregiver", expires_at=NOW-timedelta(days=1) if name=="expired" else None)
        reminder = Reminder.objects.create(pk=402, user=owner, plant=plant, type="water", start_date=NOW.date(), interval_value=7, interval_unit="days")
        task = ReminderTask.objects.create(pk=401, user=owner, reminder=reminder, due_date=NOW.date(), created_at=NOW-timedelta(days=1))
        AccountSecret.objects.create(user=owner, secret="contract-only-device-secret")
        device = ReadingDevice.objects.create(pk=601, user=owner, plant=plant, device_name="Contract device", device_key="AB12CD34", interval_minutes=60, pump_included=True, supports_manual_duration=True)
        yield SimpleNamespace(users=users, owner=owner, plant=plant, reminder=reminder, task=task, device=device, photo_id=None)
    cache.clear()


def client_for(s, actor):
    client = APIClient()
    if actor != "anonymous":
        user = s.users["viewer" if actor == "revoked" else "owner" if actor == "expired-token" else actor]
        token = AccessToken.for_user(user)
        if actor == "expired-token":
            token.set_exp(lifetime=timedelta(seconds=-1))
        client.credentials(HTTP_AUTHORIZATION="Bearer " + str(token))
    return client


def exchange(s, actor, method, path, body=None, multipart=False):
    client = client_for(s, actor)
    parts = urlsplit(path)
    query = dict(parse_qsl(parts.query))
    if method == "GET":
        response = client.get(path)
    else:
        response = getattr(client, method.lower())(path, body or {}, format="multipart" if multipart else "json")
    headers = {key.lower(): value for key, value in response.items()}
    if headers.get("content-type", "").startswith("image/"):
        raw = b"".join(response.streaming_content) if response.streaming else response.content
        with Image.open(BytesIO(raw)) as picture:
            assert picture.format == "JPEG" and picture.size == (96, 64)
        assert headers["cache-control"] == "private, no-store"
        data = {"binary_sha256": digest(raw), "bytes": len(raw)}
    else:
        data = json.loads(response.content)
    recorded = {"request": {"method": method, "path": parts.path, "query": query, "body": body},
                "response": {"status": response.status_code, "headers": headers, "body": data}}
    if multipart:
        recorded["request"]["body"] = {key: value for key, value in body.items() if key != "photo"}
        recorded["request"]["multipart"] = True
    recorded["canonical_response"] = canonical(recorded["response"]).decode()
    recorded["sha256"] = digest(recorded["canonical_response"].encode())
    return recorded


def prepare(s, case):
    setup = case.get("setup")
    if setup in ["overdue", "future"]:
        s.task.due_date = NOW.date() + timedelta(days=-3 if setup=="overdue" else 3)
        s.task.save()
    if setup=="already-completed":
        assert exchange(s,"owner","POST","/reminders/tasks/401/complete/")["response"]["status"]==200
    if setup in ["level-up", "maximum"]:
        AccountProgression.objects.create(user=s.owner,total_xp=90 if setup=="level-up" else 194625)
        if setup=="level-up":
            result=exchange(s,"owner","POST","/reminders/tasks/401/complete/")
            assert result["response"]["body"]["xp_awarded"]==100
    if setup=="definition":
        definition=PlantDefinition.objects.create(external_id="contract-fern",latin="Contractus fernus",name="Fern",sun="medium",water="medium",difficulty="easy",image_thumb="plants/thumb/contract.jpg",image_hero="plants/hero/contract.jpg")
        s.plant.plant_definition=definition;s.plant.save()
    if setup=="uploaded":
        result=exchange(s,"owner","PUT","/plant-instances/201/photo/",{"photo":image(),"upload_key":"00000000-0000-4000-8000-000000000801","expected_photo_id":"none","framing":json.dumps({"focal_x":0.4,"focal_y":0.6,"zoom":1.5})},True)
        assert result["response"]["status"]==200,result
        s.photo_id=result["response"]["body"]["id"]
    if setup in ["journal", "pagination"]:
        result=exchange(s,"owner","POST","/journal/photos/",{"photo":image(),"upload_key":"00000000-0000-4000-8000-000000000802","plant_id":"201","notes":"Growth","taken_on":""},True)
        assert result["response"]["status"]==201,result
        entry=JournalPhotoEntry.objects.get(pk=result["response"]["body"]["id"])
        # A stable entry ID preserves real uploaded bytes and metadata.
        old_id=entry.pk
        stored=entry.image
        entry.pk=uuid.UUID(PHOTO);entry.created_at=NOW-timedelta(hours=1)
        entry.save(force_insert=True)
        stored.journal_entry=entry;stored.save()
        JournalPhotoEntry.objects.filter(pk=old_id).delete()
        for n in range(31 if setup=="pagination" else 1):
            ReminderTask.objects.create(pk=410+n,user=s.owner,reminder=s.reminder,due_date=NOW.date()-timedelta(days=1),status="completed",completed_at=NOW-timedelta(minutes=n),completed_by=s.owner,note="Journal note",created_at=NOW-timedelta(days=1))
    if setup=="zero":
        Reading.objects.create(device=s.device,timestamp=NOW,temperature=0,humidity=None,light=0,moisture=0)
        s.device.last_read_at=NOW
        s.device.latest_snapshot={"temperature":0,"humidity":None,"light":0,"moisture":0}
        s.device.save()
    if setup=="hours":
        s.device.interval_minutes=None;s.device.interval_hours=2;s.device.save()
    if setup=="pending-contacts":
        for pk,initiator in [(110,s.owner),(111,None)]:
            user=get_user_model().objects.create_user(pk=pk,email=f"person{pk}@contract.invalid",password="synthetic",is_active=True,flovers_id=uuid.UUID(int=pk))
            Connection.objects.create(user_low=s.owner,user_high=user,initiator=initiator or user,status="pending")
    if setup in ["invited", "throttled"]:
        EmailInvitation.objects.create(pk=701,sender=s.owner,email="new@contract.invalid",language="en",expires_at=NOW+timedelta(days=30),closed=setup=="throttled",sent_at=NOW if setup=="throttled" else None)
    if case["request"]["actor"]=="revoked":
        PlantShare.objects.filter(plant=s.plant,recipient=s.users["viewer"]).delete()


@pytest.mark.parametrize("case",manifest()["scenarios"],ids=lambda case:case["id"])
def test_contract(scene,case,recorder):
    prepare(scene,case)
    request=case["request"]
    path=request["path"].replace("{photo_id}",str(scene.photo_id))
    body=request.get("body")
    multipart=case["operation"] in ["photo-replace","cover-upload","journal-create"]
    if multipart:
        body={**body,"photo":image()}
        if case["operation"]=="photo-replace":body["upload_key"]="00000000-0000-4000-8000-000000000803"
    if case["operation"]=="reframe":body={**body,"expected_photo_id":scene.photo_id}
    result=exchange(scene,request["actor"],request["method"],path,body,multipart)
    expected=case.get("error") or (201 if case["operation"] in ["pump","invite","journal-create"] else 200)
    assert result["response"]["status"]==expected,result["response"]
    data=result["response"]["body"]
    assert_contract(data,case["expect"])
    exchanges=[result]
    if case["operation"]=="cover-upload":
        capability=exchange(scene,"owner","GET","/plant-instances/201/photo/")
        assert capability["response"]["body"]=={"framing_supported":True}
        exchanges.insert(0,capability)
    if case["id"]=="journal-pagination":
        first=data["results"]
        assert len(first)==30
        cursor=data["next_cursor"]
        second=exchange(scene,"owner","GET","/journal/entries/?"+urlencode({"limit":30,"cursor":cursor}))
        assert second["response"]["status"]==200
        rows=first+second["response"]["body"]["results"]
        assert len(rows)==len({(r["kind"],r["data"]["id"]) for r in rows})==32
        assert second["response"]["body"]["next_cursor"] is None
        exchanges.append(second)
    if case["operation"]=="history":
        exchanges += [exchange(scene,"owner","GET","/reminders/"),exchange(scene,"owner","GET","/plant-instances/")]
        assert len(data)==1 and data[0]["completed_event"]["plant_id"]==201
    if case["operation"]=="plant" and not case.get("error"):
        if case.get("setup")=="definition":assert data["plant_definition"]["image_thumb"].endswith("/plants/thumb/contract.jpg")
        if case.get("setup")=="empty":assert data["plant_definition"] is None
    if case["operation"]=="reading-history":
        points=data["points"]
        assert any(p["value"]==0 and p["sample_count"]==1 for p in points)
        assert any(p["sample_count"]==0 for p in points)
    if case["operation"]=="complete" and not case.get("error"):
        scene.task.refresh_from_db()
        assert scene.task.status=="completed" and scene.task.completed_by_id==int(data["completed_task"]["completed_by"]["id"])
        assert_contract(data, {"completed_task.id":401, "completed_task.reminder":402,
                              "completed_task.due_date":{"$type":"string"}, "xp_awarded":{"$type":"number"}})
        assert 0 <= data["xp_awarded"] <= 100
    if case["id"]=="invitation-send":
        assert EmailInvitation.objects.count()==InvitationEmailDelivery.objects.count()==1
        assert InvitationEmailDelivery.objects.get().status=="pending"
    if case["operation"]=="sharing":
        shares=data["data"]["shares"]
        if request["actor"] in ["expired","stranger"]:assert shares==[]
        else:assert all(r["direction"]==("outgoing" if request["actor"]=="owner" else "incoming") for r in shares)
    recorder[case["id"]]={"exchanges":exchanges}
