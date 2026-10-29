from datetime import date, datetime, time, timedelta, timezone as datetime_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import F, Q
from django.http import Http404
from django.utils import timezone
from rest_framework.exceptions import APIException

from contacts.models import Connection
from contacts.services import contact_identity, contact_snapshot
from plant_definitions.serializers import _abs_media_url
from plant_instances.models import PlantInstance
from profiles.models import ProfileNotifications
from .models import PlantShare, PlantSharingVersion
from .permissions import active_shares


class SharingError(APIException):
    def __init__(self, code, message, status=400):
        self.status_code = status
        super().__init__({"status": "error", "code": code, "message": message})


def sharing_snapshot(user, request=None):
    now = timezone.now()
    outgoing = PlantShare.objects.filter(plant__user=user)
    incoming = active_shares(now).filter(recipient=user)
    rows = PlantShare.objects.filter(Q(pk__in=outgoing.values("pk")) | Q(pk__in=incoming.values("pk"))).select_related(
        "plant__location", "plant__plant_definition", "plant__user", "recipient",
    ).order_by("plant_id", "pk")
    shares = []
    for row in rows:
        plant = row.plant
        definition = plant.plant_definition
        own = plant.user_id == user.pk
        image = None
        if definition:
            photo = definition.image_thumb or definition.image_hero
            image = _abs_media_url(request, photo) if photo else None
        shares.append({
            "id": str(row.pk),
            "plant": {"id": str(plant.pk), "name": plant.display_name or (definition.name if definition else ""),
                      "latin": definition.latin if definition else "", "location": plant.location.name if plant.location_id else "",
                      "image_url": image},
            "contact_id": str(row.recipient_id if own else plant.user_id),
            "direction": "outgoing" if own else "incoming", "can_complete_tasks": row.can_complete_tasks,
            "ends_on": row.ends_on.isoformat() if row.ends_on else None,
            "expires_at": row.expires_at.isoformat() if row.expires_at else None,
            "is_expired": bool(row.expires_at and row.expires_at <= now),
        })
    revisions = dict(PlantSharingVersion.objects.filter(plant__user=user).values_list("plant_id", "revision"))
    return {"current_user": contact_identity(user), "contacts": contact_snapshot(user)["contacts"], "shares": shares,
            "versions": {str(plant_id): revision for plant_id, revision in revisions.items()}}


def _lock_users(ids, active_ids=()):
    ids = sorted(set(ids))
    users = list(get_user_model().objects.select_for_update().filter(pk__in=ids).order_by("pk"))
    active_ids = set(active_ids)
    if len(users) != len(ids) or any(not user.is_active and user.pk in active_ids for user in users):
        raise SharingError("notContact", "Choose an accepted, active contact.")


def _owner_timezone(user):
    name = ProfileNotifications.objects.filter(user=user).values_list("timezone", flat=True).first() or settings.TIME_ZONE
    try:
        return ZoneInfo(name)
    except (ValueError, ZoneInfoNotFoundError):
        return ZoneInfo(settings.TIME_ZONE)


@transaction.atomic
def update_sharing(user, updates, request=None):
    plant_ids = [update["plant_id"] for update in updates]
    requested_ids = {recipient["contact_id"] for update in updates for recipient in update["recipients"]}
    existing_ids = PlantShare.objects.filter(plant_id__in=plant_ids, plant__user=user).values_list("recipient_id", flat=True)
    _lock_users([user.pk, *requested_ids, *existing_ids], active_ids=[user.pk, *requested_ids])
    plants = {plant.pk: plant for plant in PlantInstance.objects.select_for_update().filter(pk__in=plant_ids, user=user).order_by("pk")}
    if len(plants) != len(plant_ids):
        raise SharingError("notFound", "Plant not found.", 404)
    if user.pk in requested_ids:
        raise SharingError("invalid", "A plant cannot be shared with its owner.")
    connections = {}
    for row in Connection.objects.filter(Q(user_low=user) | Q(user_high=user), status=Connection.Status.ACCEPTED):
        connections[row.user_high_id if row.user_low_id == user.pk else row.user_low_id] = row
    if not requested_ids.issubset(connections):
        raise SharingError("notContact", "Choose an accepted contact.")
    owner_zone = _owner_timezone(user)
    today = timezone.localtime(timezone.now(), owner_zone).date()
    for update in updates:
        plant = plants[update["plant_id"]]
        version, _ = PlantSharingVersion.objects.get_or_create(plant=plant)
        if version.revision != update["expected_revision"]:
            raise SharingError("conflict", "Sharing changed on another device. Refresh before saving again.", 409)
        old = {grant.recipient_id: grant for grant in PlantShare.objects.select_for_update().filter(plant=plant)}
        keep = set()
        for recipient in update["recipients"]:
            contact_id = recipient["contact_id"]
            keep.add(contact_id)
            ends_on = recipient["ends_on"]
            if ends_on == date.max:
                raise SharingError("invalid", "Choose an earlier end date.")
            previous = old.get(contact_id)
            if ends_on and ends_on < today and (previous is None or previous.ends_on != ends_on):
                raise SharingError("invalid", "The end date cannot be in the past.")
            # Expiry is inclusive of ends_on in the owner's configured timezone.
            if previous is not None and previous.ends_on == ends_on:
                expires_at = previous.expires_at
            else:
                expires_at = datetime.combine(ends_on + timedelta(days=1), time.min, tzinfo=owner_zone).astimezone(datetime_timezone.utc) if ends_on else None
            PlantShare.objects.update_or_create(plant=plant, recipient_id=contact_id, defaults={
                "connection": connections[contact_id], "can_complete_tasks": recipient["can_complete_tasks"],
                "ends_on": ends_on, "expires_at": expires_at,
            })
        PlantShare.objects.filter(plant=plant).exclude(recipient_id__in=keep).delete()
        version.revision = F("revision") + 1
        version.save(update_fields=["revision"])
    return sharing_snapshot(user, request)


@transaction.atomic
def remove_share(user, share_id, request=None):
    initial = PlantShare.objects.filter(pk=share_id).filter(Q(plant__user=user) | Q(recipient=user)).values(
        "plant_id", "plant__user_id", "recipient_id",
    ).first()
    if initial is None:
        raise Http404
    _lock_users([initial["plant__user_id"], initial["recipient_id"]], active_ids=[user.pk])
    plant = PlantInstance.objects.select_for_update().filter(pk=initial["plant_id"], user_id=initial["plant__user_id"]).first()
    if plant is None:
        raise Http404
    deleted, _ = PlantShare.objects.filter(pk=share_id, plant=plant, recipient_id=initial["recipient_id"]).delete()
    if not deleted:
        raise Http404
    version, _ = PlantSharingVersion.objects.get_or_create(plant=plant)
    version.revision = F("revision") + 1
    version.save(update_fields=["revision"])
    return sharing_snapshot(user, request)


def revoke_connection_grants(connection):
    """Called under the two contact-user locks, before deleting the connection."""
    plant_ids = list(PlantShare.objects.filter(connection=connection).values_list("plant_id", flat=True).distinct())
    list(PlantInstance.objects.select_for_update().filter(pk__in=plant_ids).order_by("pk"))
    for plant_id in plant_ids:
        version, _ = PlantSharingVersion.objects.get_or_create(plant_id=plant_id)
        version.revision = F("revision") + 1
        version.save(update_fields=["revision"])
    PlantShare.objects.filter(connection=connection).delete()
