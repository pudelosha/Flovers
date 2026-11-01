"""Bounded, permission-filtered mixed Task Journal feed for current clients."""
import hashlib
import json
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core import signing
from django.db import connection
from django.db.models import CharField, F, Q, TextField, Value
from django.db.models.fields.json import KeyTextTransform
from django.db.models.functions import Coalesce, Collate, Lower, NullIf
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contacts.views import ActiveAccountPermission
from reminders.views import _visible_tasks, UI_TO_MODEL_TYPE
from reminders.serializers import ReminderTaskJournalSerializer
from sharing.permissions import visible_plant_ids
from .models import PlantInstance, JournalPhotoEntry
from .journal_views import entry_data
from .journal_storage import next_photo_at

SALT = "flovers.journal.feed.v1"
KINDS = set(UI_TO_MODEL_TYPE) | {"photo"}


class FeedQuery(serializers.Serializer):
    plantId = serializers.IntegerField(required=False, min_value=1)
    location = serializers.CharField(required=False, max_length=200)
    types = serializers.CharField(required=False, allow_blank=True, max_length=100, default="")
    completedFrom = serializers.DateField(required=False)
    completedTo = serializers.DateField(required=False)
    sortKey = serializers.ChoiceField(choices=["completedAt", "plant", "location"], default="completedAt")
    sortDir = serializers.ChoiceField(choices=["asc", "desc"], default="desc")
    limit = serializers.IntegerField(default=30, min_value=1, max_value=100)
    cursor = serializers.CharField(required=False, max_length=4096)
    timezone = serializers.CharField(default="Europe/Warsaw", max_length=64)

    def validate_types(self, value):
        result = sorted(set(value.split(","))) if value else []
        if not set(result) <= KINDS:
            raise serializers.ValidationError("Unknown journal entry type.")
        return result

    def validate_timezone(self, value):
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError("Unknown timezone.")
        return value

    def validate(self, value):
        if value.get("completedTo") == date.max:
            raise serializers.ValidationError("End date is out of range.")
        if value.get("completedFrom") and value.get("completedTo") and value["completedFrom"] > value["completedTo"]:
            raise serializers.ValidationError("Start date must not follow end date.")
        return value


def collections(user):
    tasks = _visible_tasks(user).filter(status="completed", completed_at__isnull=False).annotate(
        _name=Coalesce(KeyTextTransform("plant_name", "completed_event"), Value(""), output_field=TextField()),
        _location=Coalesce(KeyTextTransform("location_name", "completed_event"), Value(""), output_field=TextField()),
        _when=F("completed_at"),
    ).order_by()
    photos = JournalPhotoEntry.objects.filter(plant_id__in=visible_plant_ids(user)).annotate(
        _name=Coalesce(NullIf(F("plant__display_name"), Value("")), "plant__plant_definition__name", Value(""), output_field=CharField()),
        _location=Coalesce(F("plant__location__name"), Value("")), _when=F("created_at"),
    ).order_by()
    return tasks, photos


def filtered(user, query):
    tasks, photos = collections(user)
    if "plantId" in query:
        tasks = tasks.filter(_event_plant_id=query["plantId"])
        photos = photos.filter(plant_id=query["plantId"])
    if "location" in query:
        tasks, photos = tasks.filter(_location=query["location"]), photos.filter(_location=query["location"])
    types = query["types"]
    if types:
        tasks = tasks.filter(completed_event__type__in=[UI_TO_MODEL_TYPE[t] for t in types if t != "photo"])
        if "photo" not in types:
            photos = photos.none()
    tz = ZoneInfo(query["timezone"])
    for key, lookup, extra_day in [("completedFrom", "_when__gte", 0), ("completedTo", "_when__lt", 1)]:
        if key in query:
            boundary = datetime.combine(query[key] + timedelta(days=extra_day), time.min, tzinfo=tz)
            tasks, photos = tasks.filter(**{lookup: boundary}), photos.filter(**{lookup: boundary})
    return tasks, photos


def ordered(qs, sort_key, direction):
    if sort_key == "completedAt":
        qs = qs.annotate(_sort=F("_when"))
    else:
        # Match SQL and Python ordering exactly when merging the two bounded lists.
        collation = "C" if connection.vendor == "postgresql" else "BINARY"
        qs = qs.annotate(_sort=Collate(Lower(F("_name" if sort_key == "plant" else "_location")), collation))
    prefix = "-" if direction == "desc" else ""
    return qs.order_by(prefix + "_sort", prefix + "_when", prefix + "pk")


def after(qs, kind, position, descending, sort_key):
    primary, when, previous_kind, identifier = position
    if sort_key == "completedAt":
        primary = parse_datetime(primary)
    when = parse_datetime(when)
    if primary is None or when is None:
        raise ValidationError("Invalid journal cursor.")
    op = "lt" if descending else "gt"
    same = Q(_sort=primary, _when=when)
    predicate = Q(**{f"_sort__{op}": primary}) | Q(_sort=primary, **{f"_when__{op}": when})
    if kind == previous_kind:
        predicate |= same & Q(**{f"pk__{op}": identifier})
    elif (kind < previous_kind) if descending else (kind > previous_kind):
        predicate |= same
    return qs.filter(predicate)


def item_key(row, kind):
    return row._sort, row._when, kind, (row.pk.hex if kind == "photo" else row.pk)


def task_data(task, request, context):
    record = ReminderTaskJournalSerializer(task, context=context).data
    event = task.event
    return {"id": str(task.pk), "plant_id": str(event["plant_id"]), "reminder_id": str(task.reminder_id),
            "plant_name": event.get("plant_name", ""), "location_name": event.get("location_name", ""),
            "type": next((ui for ui, model in UI_TO_MODEL_TYPE.items() if model == event["type"]), "care"),
            "completed_at": task.completed_at.isoformat(), "completed_by": record["completed_by"],
            "notes": task.note or "", "access": record["access"]}


class JournalFeedView(APIView):
    permission_classes = [IsAuthenticated, ActiveAccountPermission]

    def get(self, request):
        serializer = FeedQuery(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        query = serializer.validated_data
        scope = hashlib.sha256(json.dumps({key: value for key, value in query.items() if key != "cursor"},
                                         sort_keys=True, default=str).encode()).hexdigest()
        snapshot, position = timezone.now(), None
        if "cursor" in query:
            try:
                cursor = signing.loads(query["cursor"], salt=SALT, max_age=86400)
                if cursor["user"] != request.user.pk or cursor["scope"] != scope:
                    raise ValueError
                snapshot, position = parse_datetime(cursor["snapshot"]), cursor["position"]
                if snapshot is None or timezone.is_naive(snapshot) or not isinstance(position, list) or len(position) != 4 or position[2] not in ("task", "photo"):
                    raise ValueError
            except (signing.BadSignature, ValueError, KeyError, TypeError):
                raise ValidationError("Invalid or expired journal cursor. Refresh the journal.")
        tasks, photos = filtered(request.user, query)
        can_manage = tasks.filter(user=request.user).exists()
        candidates = []
        descending = query["sortDir"] == "desc"
        limit = query["limit"]
        for kind, qs in [("task", tasks), ("photo", photos)]:
            if kind == "task":
                qs = qs.filter(updated_at__lte=snapshot)
            qs = ordered(qs.filter(created_at__lte=snapshot, _when__lte=snapshot), query["sortKey"], query["sortDir"])
            if position is not None:
                try:
                    qs = after(qs, kind, position, descending, query["sortKey"])
                except (ValueError, TypeError, serializers.ValidationError):
                    raise ValidationError("Invalid journal cursor.")
            qs = qs.select_related("reminder__plant__user", "completed_by") if kind == "task" else qs.select_related(
                "plant__user", "plant__location", "plant__plant_definition", "image")
            candidates.extend((row, kind) for row in qs[:limit + 1])
        candidates.sort(key=lambda pair: item_key(*pair), reverse=descending)
        page = candidates[:limit]
        event_ids = {row.event["plant_id"] for row, kind in page if kind == "task"}
        context = {"request": request, "event_plants": PlantInstance.objects.select_related("user").in_bulk(event_ids)}
        results = [{"kind": kind, "data": task_data(row, request, context) if kind == "task" else entry_data(row, request.user)} for row, kind in page]
        next_cursor = None
        if len(candidates) > limit and page:
            row, kind = page[-1]
            primary = row._sort.isoformat() if query["sortKey"] == "completedAt" else row._sort
            next_cursor = signing.dumps({"user": request.user.pk, "scope": scope, "snapshot": snapshot.isoformat(),
                "position": [primary, row._when.isoformat(), kind, str(row.pk)]}, salt=SALT, compress=True)
        return Response({"results": results, "next_cursor": next_cursor, "can_manage_tasks": can_manage})


class JournalOptionsView(APIView):
    permission_classes = [IsAuthenticated, ActiveAccountPermission]

    def get(self, request):
        tasks, photos = collections(request.user)
        owned = list(PlantInstance.objects.filter(user=request.user, user__is_active=True).select_related("location", "plant_definition").only("id", "display_name", "location__name", "plant_definition__name"))
        plants, locations, delete_plants, delete_locations = {}, set(), {}, set()
        for identifier, name, location in tasks.values_list("_event_plant_id", "_name", "_location").distinct():
            plants[str(identifier)] = name
            if location: locations.add(location)
        for identifier, name, location in photos.values_list("plant_id", "_name", "_location").distinct():
            plants[str(identifier)] = name
            if location: locations.add(location)
        for identifier, name, location in tasks.filter(user=request.user).values_list("_event_plant_id", "_name", "_location").distinct():
            delete_plants[str(identifier)] = name
            if location: delete_locations.add(location)
        own_options = []
        for plant in owned:
            name = plant.display_name or (plant.plant_definition.name if plant.plant_definition else "")
            plants[str(plant.pk)] = name
            locations.add(plant.location.name)
            own_options.append({"id": str(plant.pk), "name": name, "location": plant.location.name})
        options = lambda values: [{"id": key, "name": value} for key, value in sorted(values.items(), key=lambda item: (item[1].lower(), item[0]))]
        return Response({"plants": options(plants), "locations": sorted(locations), "owned_plants": own_options,
                         "delete_plants": options(delete_plants), "delete_locations": sorted(delete_locations)})


class JournalAvailabilityView(APIView):
    permission_classes = [IsAuthenticated, ActiveAccountPermission]

    def get(self, request):
        plants = PlantInstance.objects.filter(user=request.user, user__is_active=True).only("pk", "last_journal_photo_at")
        return Response({"availability": [{"plant_id": str(plant.pk), "next_photo_at": value.isoformat() if value else None}
                         for plant in plants for value in [next_photo_at(plant)]]})
