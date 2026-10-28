import re

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from contacts.models import Connection


pytestmark = pytest.mark.django_db
BASE = "/contacts/"


def snapshot(response, *, status=200):
    assert response.status_code == status, response.content
    body = response.json()
    assert body["status"] == "success"
    data = body["data"]
    assert {"current_user", "contacts", "invitations", "counts"} <= data.keys()
    assert data["counts"] == {
        "contacts": len(data["contacts"]),
        "incoming": sum(item["direction"] == "incoming" for item in data["invitations"]),
        "outgoing": sum(item["direction"] == "outgoing" for item in data["invitations"]),
    }
    for person in [data["current_user"], *data["contacts"], *(item["contact"] for item in data["invitations"])]:
        assert {"id", "name", "email", "flovers_id"} <= person.keys()
        assert isinstance(person["id"], str)
        assert re.fullmatch(r"FL-[0-9A-F]{32}", person["flovers_id"])
        assert not {"password", "is_staff", "is_superuser", "user_permissions", "groups"} & person.keys()
    for invitation in data["invitations"]:
        assert isinstance(invitation["id"], str)
    return data


def invite(client, identifier):
    response = client.post(BASE + "invitations/", {"identifier": identifier}, format="json")
    assert response.status_code in (200, 201), response.content
    data = snapshot(response, status=response.status_code)
    assert len(data["invitations"]) >= 1
    return data["invitations"][-1]["id"]


def connect(people):
    invitation_id = invite(people.a, people.recipient.email)
    snapshot(people.b.post(BASE + f"invitations/{invitation_id}/accept/", {}, format="json"))
    return invitation_id


def error(response, code, status):
    assert response.status_code == status, response.content
    body = response.json()
    assert body["status"] == "error"
    assert body["code"] == code


def test_empty_contacts_snapshot_and_api_prefix_are_authenticated_and_consistent(people):
    data = snapshot(people.a.get(BASE))
    assert data["current_user"]["id"] == str(people.owner.pk)
    assert data["current_user"]["email"] == people.owner.email
    assert data["contacts"] == data["invitations"] == []
    assert snapshot(people.a.get("/api/contacts/")) == data


@pytest.mark.parametrize("method,path,payload", [
    ("get", "/contacts/", None),
    ("post", "/contacts/invitations/", {"identifier": "recipient@example.test"}),
    ("post", "/contacts/invitations/1/accept/", {}),
    ("delete", "/contacts/invitations/1/", None),
    ("patch", "/contacts/1/", {"name": "Alias"}),
    ("delete", "/contacts/1/", None),
])
def test_every_contacts_endpoint_requires_authentication(method, path, payload):
    client = APIClient()
    response = getattr(client, method)(path, payload, format="json") if payload is not None else getattr(client, method)(path)
    assert response.status_code == 401


def test_real_jwt_authentication_rejects_an_account_disabled_after_token_issue(people):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer " + str(RefreshToken.for_user(people.owner).access_token))
    assert snapshot(client.get(BASE))["current_user"]["id"] == str(people.owner.pk)
    get_user_model().objects.filter(pk=people.owner.pk).update(is_active=False)
    assert client.get(BASE).status_code == 401


def test_invitation_is_visible_only_to_sender_and_recipient_without_granting_contact_status(people, mailoutbox):
    invitation_id = invite(people.a, "  RECIPIENT@EXAMPLE.TEST  ")
    sender = snapshot(people.a.get(BASE))
    recipient = snapshot(people.b.get(BASE))
    assert sender["contacts"] == recipient["contacts"] == []
    assert sender["invitations"][0]["direction"] == "outgoing"
    assert sender["invitations"][0]["contact"]["id"] == str(people.recipient.pk)
    assert recipient["invitations"][0]["id"] == invitation_id
    assert recipient["invitations"][0]["direction"] == "incoming"
    assert recipient["invitations"][0]["contact"]["id"] == str(people.owner.pk)
    assert snapshot(people.c.get(BASE))["invitations"] == []
    assert mailoutbox == []


@pytest.mark.parametrize("style", ["canonical", "lowercase", "uuid-dashes"])
def test_invitation_lookup_accepts_public_flovers_ids_case_insensitively(people, style):
    public_id = snapshot(people.b.get(BASE))["current_user"]["flovers_id"]
    identifier = public_id if style == "canonical" else public_id.lower() if style == "lowercase" else "fl-" + str(people.recipient.flovers_id)
    invite(people.a, identifier)
    assert snapshot(people.a.get(BASE))["invitations"][0]["contact"]["id"] == str(people.recipient.pk)


@pytest.mark.parametrize("identifier", [None, "", "  ", "not-an-email", "FL-NOT-A-UUID", [], {}, 12, True])
def test_invalid_identifiers_are_rejected_without_creating_connections(people, identifier):
    error(people.a.post(BASE + "invitations/", {"identifier": identifier}, format="json"), "invalid", 400)
    assert Connection.objects.count() == 0


def test_missing_identifier_is_rejected(people):
    error(people.a.post(BASE + "invitations/", {}, format="json"), "invalid", 400)
    assert Connection.objects.count() == 0


@pytest.mark.parametrize("target", ["email", "flovers_id"])
def test_self_invitation_is_rejected(people, target):
    identifier = people.owner.email.upper() if target == "email" else snapshot(people.a.get(BASE))["current_user"]["flovers_id"].lower()
    error(people.a.post(BASE + "invitations/", {"identifier": identifier}, format="json"), "self", 400)
    assert Connection.objects.count() == 0


@pytest.mark.parametrize("target", ["unknown", "inactive_email", "inactive_id"])
def test_unknown_and_inactive_accounts_cannot_be_invited(people, target):
    identifier = "missing@example.test" if target == "unknown" else people.inactive.email if target == "inactive_email" else "FL-" + people.inactive.flovers_id.hex.upper()
    error(people.a.post(BASE + "invitations/", {"identifier": identifier}, format="json"), "notFound", 404)
    assert Connection.objects.count() == 0


def test_duplicate_and_reversed_pending_requests_do_not_create_another_relationship(people):
    invitation_id = invite(people.a, people.recipient.email)
    error(people.a.post(BASE + "invitations/", {"identifier": people.recipient.email}, format="json"), "alreadyPending", 409)
    error(people.b.post(BASE + "invitations/", {"identifier": people.owner.email}, format="json"), "alreadyPending", 409)
    assert Connection.objects.count() == 1
    assert snapshot(people.b.get(BASE))["invitations"][0]["id"] == invitation_id


def test_only_the_recipient_can_accept_and_acceptance_is_mutual_and_repeatable(people):
    invitation_id = invite(people.a, people.recipient.email)
    path = BASE + f"invitations/{invitation_id}/accept/"
    error(people.a.post(path, {}, format="json"), "notFound", 404)
    error(people.c.post(path, {}, format="json"), "notFound", 404)
    accepted = snapshot(people.b.post(path, {}, format="json"))
    assert accepted["invitations"] == []
    assert accepted["contacts"][0]["id"] == str(people.owner.pk)
    assert snapshot(people.a.get(BASE))["contacts"][0]["id"] == str(people.recipient.pk)
    assert snapshot(people.b.post(path, {}, format="json")) == accepted
    assert Connection.objects.count() == 1
    error(people.a.post(BASE + "invitations/", {"identifier": people.recipient.email}, format="json"), "alreadyContact", 409)
    error(people.b.post(BASE + "invitations/", {"identifier": people.owner.email}, format="json"), "alreadyContact", 409)


@pytest.mark.parametrize("actor", ["sender", "recipient"])
def test_pending_request_can_be_cancelled_or_declined_but_not_by_an_outsider(people, actor):
    invitation_id = invite(people.a, people.recipient.email)
    path = BASE + f"invitations/{invitation_id}/"
    error(people.c.delete(path), "notFound", 404)
    assert Connection.objects.count() == 1
    client = people.a if actor == "sender" else people.b
    assert snapshot(client.delete(path))["invitations"] == []
    assert snapshot(people.a.get(BASE))["invitations"] == []
    assert snapshot(people.b.get(BASE))["invitations"] == []
    assert Connection.objects.count() == 0
    error(client.delete(path), "notFound", 404)


def test_pending_invitation_routes_cannot_remove_an_accepted_contact(people):
    invitation_id = connect(people)
    for client in (people.a, people.b, people.c):
        error(client.delete(BASE + f"invitations/{invitation_id}/"), "notFound", 404)
    assert snapshot(people.a.get(BASE))["counts"]["contacts"] == 1


def test_alias_is_private_to_each_user_and_does_not_rename_the_other_account(people):
    connect(people)
    before_names = (people.owner.first_name, people.owner.last_name, people.recipient.first_name, people.recipient.last_name)
    data = snapshot(people.a.patch(BASE + str(people.recipient.pk) + "/", {"name": "  Mom  "}, format="json"))
    assert data["contacts"][0]["name"] == "Mom"
    other = snapshot(people.b.patch(BASE + str(people.owner.pk) + "/", {"name": "My daughter"}, format="json"))
    assert other["contacts"][0]["name"] == "My daughter"
    assert snapshot(people.a.get(BASE))["contacts"][0]["name"] == "Mom"
    assert snapshot(people.b.get(BASE))["current_user"]["name"] != "Mom"
    assert snapshot(people.c.get(BASE))["contacts"] == []
    people.owner.refresh_from_db()
    people.recipient.refresh_from_db()
    assert (people.owner.first_name, people.owner.last_name, people.recipient.first_name, people.recipient.last_name) == before_names


@pytest.mark.parametrize("name", [None, "", "  ", "a" * 81, {}, [], True])
def test_invalid_contact_alias_is_rejected_without_changing_existing_alias(people, name):
    connect(people)
    path = BASE + str(people.recipient.pk) + "/"
    snapshot(people.a.patch(path, {"name": "Mom"}, format="json"))
    error(people.a.patch(path, {"name": name}, format="json"), "invalid", 400)
    assert snapshot(people.a.get(BASE))["contacts"][0]["name"] == "Mom"


def test_pending_or_unrelated_user_ids_cannot_be_renamed_or_removed_as_contacts(people):
    invite(people.a, people.recipient.email)
    for client, user in ((people.a, people.recipient), (people.c, people.owner), (people.c, people.recipient), (people.a, people.owner)):
        path = BASE + str(user.pk) + "/"
        error(client.patch(path, {"name": "Stolen"}, format="json"), "notFound", 404)
        error(client.delete(path), "notFound", 404)
    assert Connection.objects.count() == 1


def test_contact_removal_is_mutual_and_can_only_be_performed_by_a_participant(people):
    connect(people)
    for user in (people.owner, people.recipient):
        error(people.c.delete(BASE + str(user.pk) + "/"), "notFound", 404)
    assert snapshot(people.b.delete(BASE + str(people.owner.pk) + "/"))["contacts"] == []
    assert snapshot(people.a.get(BASE))["contacts"] == []
    assert Connection.objects.count() == 0
    error(people.a.delete(BASE + str(people.recipient.pk) + "/"), "notFound", 404)


def test_missing_relationships_and_nonparticipants_receive_not_found(people):
    for client in (people.a, people.b, people.c):
        error(client.post(BASE + "invitations/999999999/accept/", {}, format="json"), "notFound", 404)
        error(client.delete(BASE + "invitations/999999999/"), "notFound", 404)
        error(client.patch(BASE + "999999999/", {"name": "Nobody"}, format="json"), "notFound", 404)
        error(client.delete(BASE + "999999999/"), "notFound", 404)


def test_disabled_accounts_are_removed_from_snapshots_and_cannot_have_requests_accepted(people):
    invitation_id = invite(people.a, people.recipient.email)
    get_user_model().objects.filter(pk=people.owner.pk).update(is_active=False)
    assert snapshot(people.b.get(BASE))["invitations"] == []
    error(people.b.post(BASE + f"invitations/{invitation_id}/accept/", {}, format="json"), "notFound", 404)


def test_public_id_survives_profile_email_changes_and_repeated_reads(people):
    public_id = snapshot(people.b.get(BASE))["current_user"]["flovers_id"]
    people.recipient.email = "new-address@example.test"
    people.recipient.save(update_fields=["email"])
    assert snapshot(people.b.get(BASE))["current_user"]["flovers_id"] == public_id
    invite(people.a, public_id)
    pending_contact = snapshot(people.a.get(BASE))["invitations"][0]["contact"]
    assert pending_contact["id"] == str(people.recipient.pk)
    assert pending_contact["email"] == ""
    people.recipient.refresh_from_db()
    assert "FL-" + people.recipient.flovers_id.hex.upper() == public_id


def test_pending_id_lookup_does_not_disclose_email_or_use_it_as_a_name_before_acceptance(people):
    people.recipient.first_name = ""
    people.recipient.last_name = ""
    people.recipient.email = "private-address@example.test"
    people.recipient.save(update_fields=["first_name", "last_name", "email"])
    public_id = snapshot(people.b.get(BASE))["current_user"]["flovers_id"]
    invitation_id = invite(people.a, public_id)
    pending = snapshot(people.a.get(BASE))
    contact = pending["invitations"][0]["contact"]
    assert contact["email"] == ""
    assert contact["name"] == public_id
    assert "private-address" not in str(pending)
    snapshot(people.b.post(BASE + f"invitations/{invitation_id}/accept/", {}, format="json"))
    assert snapshot(people.a.get(BASE))["contacts"][0]["email"] == "private-address@example.test"


def test_contact_lifecycle_never_sends_activation_or_other_emails(people, mailoutbox):
    invitation_id = invite(people.a, people.recipient.email)
    snapshot(people.b.post(BASE + f"invitations/{invitation_id}/accept/", {}, format="json"))
    snapshot(people.a.patch(BASE + str(people.recipient.pk) + "/", {"name": "Mom"}, format="json"))
    snapshot(people.a.delete(BASE + str(people.recipient.pk) + "/"))
    assert mailoutbox == []


def test_invitation_hourly_limit_is_per_user(people):
    for index in range(20):
        response = people.a.post(BASE + "invitations/", {"identifier": f"unknown-{index}@example.test"}, format="json")
        assert response.status_code == 404, response.content
    response = people.a.post(BASE + "invitations/", {"identifier": "one-too-many@example.test"}, format="json")
    assert response.status_code == 429
    assert float(response["Retry-After"]) > 0
    assert people.c.post(BASE + "invitations/", {"identifier": "other@example.test"}, format="json").status_code == 404


def test_daily_limit_still_applies_after_hourly_windows_have_passed(people, monkeypatch):
    now = [1000000.0]
    monkeypatch.setattr(SimpleRateThrottle, "timer", staticmethod(lambda: now[0]))
    cache.clear()
    for hour in range(5):
        now[0] = 1000000.0 + hour * 3601
        for index in range(20):
            response = people.a.post(BASE + "invitations/", {"identifier": f"unknown-{hour}-{index}@example.test"}, format="json")
            assert response.status_code == 404, response.content
    now[0] += 3601
    response = people.a.post(BASE + "invitations/", {"identifier": "daily-limit@example.test"}, format="json")
    assert response.status_code == 429
    assert float(response["Retry-After"]) > 0
