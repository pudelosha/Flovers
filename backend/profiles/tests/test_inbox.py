from datetime import datetime,timedelta,timezone as tz
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from contacts.models import Connection
from contacts.services import invite_contact,accept_invitation
from profiles.inbox import record_notification
from profiles.models import InboxNotification,NotificationDeliveryLog
from profiles.tasks import _finish_delivery

pytestmark=pytest.mark.django_db
URL="/profile/inbox/"


@pytest.fixture
def scene():
    users=get_user_model()
    owner=users.objects.create_user(email="owner-inbox@example.test",is_active=True)
    other=users.objects.create_user(email="other-inbox@example.test",is_active=True)
    client=APIClient();client.force_authenticate(owner)
    return owner,other,client


def record(user,key="event",channel="push",source="task",**kwargs):
    return record_notification(user_id=user.pk,event_key=key,channel=channel,source=source,kind="tasks_due",**kwargs)


def test_authentication_and_owner_scoping(scene):
    owner,other,client=scene
    record(owner);foreign=record(other)
    assert APIClient().get(URL).status_code==401
    response=client.get(URL);assert response.status_code==200
    assert len(response.data['data']['items'])==1
    assert client.delete(f"{URL}{foreign.pk}/").status_code==404
    assert InboxNotification.objects.get(pk=foreign.pk).deleted_at is None


@pytest.mark.parametrize('sort',['date','source','channel'])
@pytest.mark.parametrize('direction',['asc','desc'])
def test_cursor_pagination_is_complete_and_stable_when_new_events_arrive(scene,sort,direction):
    owner,other,client=scene
    stamp=timezone.now()
    expected=set()
    for i in range(65):
        expected.add(str(record(owner,str(i),channel=['push','email','in_app'][i%3],source=['task','user','pump','device'][i%4],created_at=stamp+timedelta(seconds=i%4)).pk))
    query={'sort':sort,'direction':direction}
    page=client.get(URL,query).data['data'];ids=[x['id'] for x in page['items']]
    assert len(ids)==30 and page['total']==65
    newest=record(owner,'arrived-later',created_at=stamp)
    while page['next_cursor']:
        page=client.get(URL,{**query,'cursor':page['next_cursor']}).data['data']
        ids.extend(x['id'] for x in page['items'])
    assert len(ids)==len(set(ids))==65
    assert set(ids)==expected and str(newest.pk) not in ids


def test_cursor_cannot_cross_users_or_filters(scene):
    owner,other,client=scene
    for i in range(31):record(owner,str(i))
    cursor=client.get(URL).data['data']['next_cursor']
    assert client.get(URL,{'cursor':cursor,'source':'pump'}).status_code==400
    client.force_authenticate(other)
    assert client.get(URL,{'cursor':cursor}).status_code==400
    assert client.get(URL,{'cursor':'forged'}).status_code==400


def test_filters_use_the_selected_timezone_and_validate_input(scene):
    owner,other,client=scene
    row=record(owner,source='device',channel='email',created_at=datetime(2026,11,3,23,30,tzinfo=tz.utc))
    record(owner,'other',source='pump',channel='push')
    query={'source':'device','channel':'email','from_date':'2026-11-04','to_date':'2026-11-04','timezone':'Europe/Warsaw'}
    assert [x['id'] for x in client.get(URL,query).data['data']['items']]==[str(row.pk)]
    query['timezone']='UTC';assert client.get(URL,query).data['data']['items']==[]
    assert client.get(URL,{'from_date':'2026-11-04','to_date':'2026-11-03'}).status_code==400
    assert client.get(URL,{'source':'invalid'}).status_code==400
    assert client.get(URL,{'timezone':'not-a-zone'}).status_code==400


def test_delete_keeps_delivery_deduplication_tombstones(scene):
    owner,other,client=scene
    row=record(owner)
    assert client.delete(f"{URL}{row.pk}/").data['data']['deleted']==1
    assert client.delete(f"{URL}{row.pk}/").data['data']['deleted']==0
    assert record(owner).pk==row.pk
    assert client.get(URL).data['data']['items']==[]


def test_bulk_delete_respects_owner_filters_and_snapshot_boundary(scene):
    owner,other,client=scene
    email=record(owner,'email',channel='email');push=record(owner,'push')
    foreign=record(other)
    snapshot=client.get(URL).data['data']['snapshot']
    fresh=record(owner,'fresh',channel='email')
    response=client.post(URL+'delete/',{'snapshot':snapshot,'scope':'filtered','filters':{'channel':'email'}},format='json')
    assert response.data['data']['deleted']==1
    assert InboxNotification.objects.get(pk=email.pk).deleted_at
    assert InboxNotification.objects.get(pk=push.pk).deleted_at is None
    assert InboxNotification.objects.get(pk=fresh.pk).deleted_at is None
    assert InboxNotification.objects.get(pk=foreign.pk).deleted_at is None
    client.force_authenticate(other)
    assert client.post(URL+'delete/',{'snapshot':snapshot,'scope':'all'},format='json').status_code==400
    client.force_authenticate(owner)
    assert client.post(URL+'delete/',{'scope':'all'},format='json').status_code==400


def test_contact_requests_and_acceptance_create_private_in_app_entries(scene):
    owner,other,client=scene
    invite_contact(owner,other.email)
    entry=InboxNotification.objects.get(user=other)
    assert entry.kind=='contact_invitation' and entry.channel=='in_app'
    connection=Connection.objects.get()
    accept_invitation(other,connection.pk);accept_invitation(other,connection.pk)
    assert InboxNotification.objects.filter(user=owner,kind='contact_accepted').count()==1
    assert InboxNotification.objects.filter(user=other).count()==1


def test_failed_or_stale_delivery_never_creates_a_success_entry(scene):
    owner,other,client=scene
    log=NotificationDeliveryLog.objects.create(user=owner,channel='push',local_date=timezone.localdate(),status='sending',claim_token='live')
    _finish_delivery(log,'pending',now_utc=timezone.now(),error='test')
    assert not InboxNotification.objects.exists()
    log.status='sending';log.claim_token='fresh';log.save(update_fields=['status','claim_token'])
    old=NotificationDeliveryLog.objects.get(pk=log.pk);old.claim_token='stale'
    _finish_delivery(old,'sent',now_utc=timezone.now())
    assert not InboxNotification.objects.exists()
    _finish_delivery(log,'sent',now_utc=timezone.now(),inbox_payload={'count':3})
    _finish_delivery(log,'sent',now_utc=timezone.now())
    assert InboxNotification.objects.get().payload=={'count':3}


def test_history_backfill_is_idempotent_and_preserves_pending_requests(scene):
    import importlib
    from types import SimpleNamespace
    from django.apps import apps
    from django.db import connection
    owner, other, client = scene
    request = invite_contact(owner, other.email)
    original = InboxNotification.objects.get(user=other, kind="contact_invitation")
    timestamp = original.created_at
    InboxNotification.objects.all().delete()
    migration = importlib.import_module("profiles.migrations.0022_backfill_notification_inbox")
    editor = SimpleNamespace(connection=connection)
    migration.backfill(apps, editor)
    migration.backfill(apps, editor)
    restored = InboxNotification.objects.get(user=other)
    assert restored.kind == "contact_invitation"
    assert restored.channel == "in_app"
    assert restored.created_at == timestamp
    assert not InboxNotification.objects.filter(user=owner).exists()
