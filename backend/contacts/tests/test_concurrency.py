"""Run on PostgreSQL: SQLite does not implement select_for_update row locks."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from django.contrib.auth import get_user_model
from django.db import close_old_connections, connection

from contacts.models import Connection
from contacts.services import ContactError, accept_invitation, invite_contact, rename_contact

pytestmark = [pytest.mark.django_db(transaction=True), pytest.mark.skipif(
    connection.vendor != "postgresql", reason="PostgreSQL row-lock semantics required",
)]


def concurrent(first, second):
    barrier = Barrier(2)

    def worker(operation):
        close_old_connections()
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET lock_timeout = '5s'")
            barrier.wait(timeout=5)
            return operation()
        finally:
            connection.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = [pool.submit(worker, operation) for operation in (first, second)]
        return [result.result(timeout=15) for result in results]


def test_reversed_initial_invitations_create_exactly_one_pair(people):
    def send(user_id, email):
        try:
            invite_contact(get_user_model().objects.get(pk=user_id), email)
            return "created"
        except ContactError as error:
            return str(error.detail["code"])

    results = concurrent(lambda: send(people.owner.pk, people.recipient.email),
                         lambda: send(people.recipient.pk, people.owner.email))
    assert sorted(results) == ["alreadyPending", "created"]
    assert Connection.objects.count() == 1


def test_simultaneous_acceptance_is_idempotent(people):
    invite_contact(people.owner, people.recipient.email)
    invitation_id = Connection.objects.get().pk

    def accept():
        actor = get_user_model().objects.get(pk=people.recipient.pk)
        return accept_invitation(actor, invitation_id)["counts"]["contacts"]

    assert concurrent(accept, accept) == [1, 1]
    assert Connection.objects.get().status == Connection.Status.ACCEPTED


def test_simultaneous_private_alias_updates_preserve_both_names(people):
    invite_contact(people.owner, people.recipient.email)
    accept_invitation(people.recipient, Connection.objects.get().pk)

    def rename(actor_id, other_id, name):
        actor = get_user_model().objects.get(pk=actor_id)
        return rename_contact(actor, other_id, name)["contacts"][0]["name"]

    assert concurrent(lambda: rename(people.owner.pk, people.recipient.pk, "Mom"),
                      lambda: rename(people.recipient.pk, people.owner.pk, "Son")) == ["Mom", "Son"]
    row = Connection.objects.get()
    assert {row.alias_low, row.alias_high} == {"Mom", "Son"}


def test_concurrent_senders_cannot_exceed_recipient_queue_budget(people):
    from contacts.models import InvitationEmailDelivery
    from contacts.services import invite_by_email
    # Leave one recipient slot; the two competing senders both see a new pair.
    for i in range(2):
        sender=get_user_model().objects.create_user(email=f"seed{i}@example.test",is_active=True)
        invite_by_email(sender,"new@example.test","en")
    def send(pk):
        try:
            invite_by_email(get_user_model().objects.get(pk=pk),"NEW@example.test","en")
            return "queued"
        except ContactError as error:return str(error.detail["code"])
    assert sorted(concurrent(lambda:send(people.owner.pk),lambda:send(people.outsider.pk)))==["queued","throttled"]
    assert InvitationEmailDelivery.objects.count()==3


def test_concurrent_requests_cannot_exceed_sender_queue_budget(people):
    from contacts.models import InvitationEmailDelivery
    from contacts.services import invite_by_email
    for i in range(19):invite_by_email(people.owner,f"seed{i}@example.test","en")
    def send(email):
        try:
            invite_by_email(get_user_model().objects.get(pk=people.owner.pk),email,"en")
            return "queued"
        except ContactError as error:return str(error.detail["code"])
    assert sorted(concurrent(lambda:send("first@example.test"),lambda:send("second@example.test")))==["queued","throttled"]
    assert InvitationEmailDelivery.objects.count()==20


def test_concurrent_workers_claim_one_invitation_delivery(people):
    from contacts.models import InvitationEmailDelivery
    from contacts.services import invite_by_email
    from contacts.tasks import _claim
    invite_by_email(people.owner,"new@example.test","en")
    pk=InvitationEmailDelivery.objects.get().pk
    assert sorted(concurrent(lambda:_claim(pk) is not None,lambda:_claim(pk) is not None))==[False,True]
    assert InvitationEmailDelivery.objects.get().attempts==1
