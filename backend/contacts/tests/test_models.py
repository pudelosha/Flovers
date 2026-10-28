import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from contacts.models import Connection


pytestmark = pytest.mark.django_db


def test_connection_pair_is_unique_across_pending_and_accepted_states(people):
    Connection.objects.create(user_low=people.owner, user_high=people.recipient, initiator=people.owner, status="pending")
    with pytest.raises(IntegrityError), transaction.atomic():
        Connection.objects.create(user_low=people.owner, user_high=people.recipient, initiator=people.recipient, status="accepted")
    assert Connection.objects.count() == 1


@pytest.mark.parametrize("kind", ["self", "reversed"])
def test_database_rejects_self_or_unsorted_pairs(people, kind):
    low = people.owner if kind == "self" else people.recipient
    high = people.owner
    with pytest.raises(IntegrityError), transaction.atomic():
        Connection.objects.create(user_low=low, user_high=high, initiator=people.owner, status="pending")


def test_flovers_ids_are_unique_and_survive_user_updates(people):
    identifiers = {people.owner.flovers_id, people.recipient.flovers_id, people.outsider.flovers_id, people.inactive.flovers_id}
    assert len(identifiers) == 4
    original = people.owner.flovers_id
    people.owner.first_name = "Changed"
    people.owner.save(update_fields=["first_name"])
    people.owner.refresh_from_db()
    assert people.owner.flovers_id == original
    with pytest.raises(IntegrityError), transaction.atomic():
        get_user_model().objects.create_user(email="collision@example.test", password="contacts-test-password", flovers_id=original)


def test_deleting_a_user_removes_their_pending_and_accepted_connections(people):
    Connection.objects.create(user_low=people.owner, user_high=people.recipient, initiator=people.owner, status="accepted")
    Connection.objects.create(user_low=people.owner, user_high=people.outsider, initiator=people.outsider, status="pending")
    people.owner.delete()
    assert Connection.objects.count() == 0
