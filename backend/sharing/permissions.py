"""One server-side access rule for plant lists, QR, readings, and care tasks."""
from contextlib import contextmanager

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Q
from django.http import Http404
from django.utils import timezone

from contacts.models import Connection
from plant_instances.models import PlantInstance
from .models import PlantShare


def active_shares(now=None):
    return PlantShare.objects.filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now or timezone.now()),
        Q(connection__user_low_id=F("plant__user_id"), connection__user_high_id=F("recipient_id")) |
        Q(connection__user_high_id=F("plant__user_id"), connection__user_low_id=F("recipient_id")),
        connection__status=Connection.Status.ACCEPTED,
        recipient__is_active=True, plant__user__is_active=True,
    )


def visible_plant_ids(user):
    if not user or not user.is_authenticated or not user.is_active:
        return PlantInstance.objects.none().values_list("pk", flat=True)
    return PlantInstance.objects.filter(
        Q(user=user) | Q(pk__in=active_shares().filter(recipient=user).values("plant_id"))
    ).values_list("pk", flat=True)


def _owner_name(user, owner):
    if not hasattr(user, "_sharing_contact_aliases"):
        aliases = {}
        rows = Connection.objects.filter(Q(user_low=user) | Q(user_high=user), status=Connection.Status.ACCEPTED)
        for row in rows:
            low = row.user_low_id == user.pk
            aliases[row.user_high_id if low else row.user_low_id] = row.alias_low if low else row.alias_high
        user._sharing_contact_aliases = aliases
    return user._sharing_contact_aliases.get(owner.pk) or owner.get_full_name().strip() or f"FL-{owner.flovers_id.hex.upper()}"


def plant_access(user, plant):
    if not user or not user.is_authenticated or not user.is_active:
        return None
    own = plant.user_id == user.pk
    grant = None
    if not own:
        if not hasattr(user, "_sharing_access_grants"):
            user._sharing_access_grants = {row.plant_id: row for row in active_shares().filter(recipient=user)}
        grant = user._sharing_access_grants.get(plant.pk)
        if grant is None:
            return None
    owner = plant.user
    return {
        "is_owner": own, "is_shared": not own, "can_edit": own,
        "can_complete_tasks": own or bool(grant and grant.can_complete_tasks),
        "owner": {"id": str(owner.pk), "name": _owner_name(user, owner)},
        "expires_at": grant.expires_at.isoformat() if grant and grant.expires_at else None,
    }


@contextmanager
def locked_plant_access(user, plant_id, require_completion=True):
    """Use before reminder/task locks; revocation takes the same user locks."""
    with transaction.atomic():
        initial = PlantInstance.objects.filter(pk=plant_id).values("user_id").first()
        if initial is None or not user or not user.is_active:
            raise Http404
        owner_id = initial["user_id"]
        ids = sorted({owner_id, user.pk})
        users = list(get_user_model().objects.select_for_update().filter(pk__in=ids).order_by("pk"))
        if len(users) != len(ids) or not all(person.is_active for person in users):
            raise Http404
        plant = PlantInstance.objects.select_for_update().select_related("user").filter(pk=plant_id, user_id=owner_id).first()
        if plant is None:
            raise Http404
        if user.pk != owner_id:
            grant = active_shares().select_for_update(of=("self",)).filter(plant=plant, recipient=user).first()
            if grant is None or (require_completion and not grant.can_complete_tasks):
                raise Http404
        yield plant
