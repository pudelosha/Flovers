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
