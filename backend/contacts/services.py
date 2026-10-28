"""Authenticated, consent-based contacts. No mail or plant access is granted here."""
from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import APIException

from .models import Connection

User = get_user_model()


class ContactError(APIException):
    def __init__(self, code, message, status=400, errors=None):
        self.status_code = status
        detail = {"status": "error", "code": code, "message": message}
        if errors:
            detail["errors"] = errors
        super().__init__(detail)


def _missing():
    return ContactError("notFound", "Contact or invitation not found.", 404)


def contact_identity(user, alias="", *, include_email=True):
    public_id = f"FL-{user.flovers_id.hex.upper()}"
    return {
        "id": str(user.pk),
        "name": alias or user.get_full_name().strip() or (user.email if include_email else public_id),
        "email": user.email if include_email else "",
        "flovers_id": public_id,
    }


def contact_snapshot(user):
    contacts, invitations = [], []
    rows = Connection.objects.filter(Q(user_low=user) | Q(user_high=user)).filter(
        user_low__is_active=True, user_high__is_active=True,
    ).select_related("user_low", "user_high").order_by("created_at", "pk")
    # One relationship query gives consistent membership and derived counts.
    for row in rows:
        is_low = row.user_low_id == user.pk
        other = row.user_high if is_low else row.user_low
        alias = (row.alias_low if is_low else row.alias_high) if row.status == Connection.Status.ACCEPTED else ""
        identity = contact_identity(other, alias, include_email=row.status == Connection.Status.ACCEPTED)
        if row.status == Connection.Status.ACCEPTED:
            contacts.append(identity)
        else:
            invitations.append({
                "id": str(row.pk), "contact": identity,
                "direction": "outgoing" if row.initiator_id == user.pk else "incoming",
            })
    contacts.sort(key=lambda contact: (contact["name"].casefold(), contact["id"]))
    incoming = sum(item["direction"] == "incoming" for item in invitations)
    return {
        "current_user": contact_identity(user), "contacts": contacts, "invitations": invitations,
        "counts": {"contacts": len(contacts), "incoming": incoming, "outgoing": len(invitations) - incoming},
    }


def _resolve_identifier(identifier):
    identifier = identifier.strip()
    if "@" in identifier:
        try:
            validate_email(identifier)
        except ValidationError:
            raise ContactError("invalid", "Enter a valid email address or Flovers ID.")
        target = User.objects.filter(email__iexact=identifier, is_active=True).first()
    else:
        raw = identifier.upper()
        if not raw.startswith("FL"):
            raise ContactError("invalid", "Enter a valid email address or Flovers ID.")
        raw = raw[2:].replace("-", "")
        try:
            if len(raw) != 32:
                raise ValueError
            public_id = uuid.UUID(hex=raw)
        except ValueError:
            raise ContactError("invalid", "Enter a valid email address or Flovers ID.")
        target = User.objects.filter(flovers_id=public_id, is_active=True).first()
    if target is None:
        raise ContactError("notFound", "No active Flovers account matches that email or ID.", 404)
    return target


def _lock_pair(actor_id, other_id):
    """Lock users in a stable order, including before a relationship exists.

    Pair-row locks alone cannot serialize two initial invitations. Both creation
    and subsequent changes take these same locks; the unique constraint is the
    database backstop. PostgreSQL is required to exercise this locking behavior.
    """
    low_id, high_id = sorted((actor_id, other_id))
    users = list(User.objects.select_for_update().filter(pk__in=[low_id, high_id]).order_by("pk"))
    if len(users) != 2 or not all(user.is_active for user in users):
        raise _missing()
    return low_id, high_id


@transaction.atomic
def invite_contact(actor, identifier):
    target = _resolve_identifier(identifier)
    if target.pk == actor.pk:
        raise ContactError("self", "You cannot invite yourself.")
    low, high = _lock_pair(actor.pk, target.pk)
    existing = Connection.objects.filter(user_low_id=low, user_high_id=high).first()
    if existing:
        if existing.status == Connection.Status.ACCEPTED:
            raise ContactError("alreadyContact", "This person is already in your contacts.", 409)
        raise ContactError("alreadyPending", "An invitation for this person is already pending.", 409)
    Connection.objects.create(user_low_id=low, user_high_id=high, initiator=actor)
    return contact_snapshot(actor)


def _find_invitation(actor, invitation_id, *, recipient_only=False):
    rows = Connection.objects.filter(Q(user_low=actor) | Q(user_high=actor), pk=invitation_id)
    if recipient_only:
        rows = rows.exclude(initiator=actor)
    row = rows.first()
    if row is None:
        raise _missing()
    return row


@transaction.atomic
def accept_invitation(actor, invitation_id):
    existing = _find_invitation(actor, invitation_id, recipient_only=True)
    _lock_pair(existing.user_low_id, existing.user_high_id)
    row = Connection.objects.select_for_update().filter(pk=existing.pk).first()
    if row is None:
        raise _missing()
    if row.status == Connection.Status.PENDING:
        row.status = Connection.Status.ACCEPTED
        row.accepted_at = timezone.now()
        row.save(update_fields=["status", "accepted_at", "updated_at"])
    # Recipient retries are idempotent, including after a lost HTTP response.
    return contact_snapshot(actor)


@transaction.atomic
def dismiss_invitation(actor, invitation_id):
    existing = _find_invitation(actor, invitation_id)
    _lock_pair(existing.user_low_id, existing.user_high_id)
    deleted, _ = Connection.objects.filter(pk=existing.pk, status=Connection.Status.PENDING).delete()
    if not deleted:
        raise _missing()
    return contact_snapshot(actor)


def _accepted_pair(actor, other_id):
    if actor.pk == other_id:
        raise _missing()
    low, high = _lock_pair(actor.pk, other_id)
    row = Connection.objects.select_for_update().filter(
        user_low_id=low, user_high_id=high, status=Connection.Status.ACCEPTED,
    ).first()
    if row is None:
        raise _missing()
    return row


@transaction.atomic
def rename_contact(actor, other_id, name):
    row = _accepted_pair(actor, other_id)
    field = "alias_low" if row.user_low_id == actor.pk else "alias_high"
    setattr(row, field, name)
    row.save(update_fields=[field, "updated_at"])
    return contact_snapshot(actor)


@transaction.atomic
def remove_contact(actor, other_id):
    row = _accepted_pair(actor, other_id)
    row.delete()
    return contact_snapshot(actor)
