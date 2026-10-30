from rest_framework import serializers
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from django.core.serializers.json import DjangoJSONEncoder
import hashlib
import json

from .models import PlantInstance, PlantCreationRequest
from locations.models import Location
from plant_definitions.models import PlantDefinition
from reminders.models import Reminder
from plant_definitions.serializers import _abs_media_url
from sharing.permissions import plant_access
from .photo_storage import photo_metadata

class PlantInstanceSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        return photo_metadata(obj, self.context.get("request"))
    creation_key = serializers.UUIDField(required=False, write_only=True)
    plant_definition_id = serializers.IntegerField(required=False, allow_null=True)
    location_id = serializers.IntegerField(required=True)

    class Meta:
        model = PlantInstance
        fields = [
            "id",
            "creation_key",
            "plant_definition_id",
            "location_id",
            "display_name",
            "notes",
            "purchase_date",
            "photo",
            # IMPORTANT: do not accept/store photo from the client
            # "photo_uri",
            "light_level",
            "orientation",
            "distance_cm",
            "pot_material",
            "soil_mix",
            "create_auto_tasks",
            "water_task_enabled",
            "repot_task_enabled",
            "moisture_required",
            "fertilize_required",
            "care_required",
            "last_watered",
            "last_repotted",
            "water_interval_days",
            "moisture_interval_days",
            "fertilize_interval_days",
            "care_interval_days",
            "repot_interval_months",
            "qr_code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "qr_code", "created_at", "updated_at"]
        extra_kwargs = {
            field: {"min_value": 1}
            for field in ("water_interval_days", "moisture_interval_days", "fertilize_interval_days", "care_interval_days", "repot_interval_months")
        }

    def validate(self, attrs):
        instance = self.instance
        if instance is not None and "creation_key" in attrs:
            raise serializers.ValidationError({"creation_key": "Creation keys apply only to new plants."})
        # Released clients sent only the misting interval. Preserve their create
        # requests, while explicit watering values always remain independent.
        if (
            instance is None
            and "water_interval_days" not in self.initial_data
            and attrs.get("create_auto_tasks")
            and attrs.get("water_task_enabled")
            and attrs.get("moisture_interval_days") is not None
        ):
            attrs["water_interval_days"] = attrs["moisture_interval_days"]

        def value(field, default=None):
            return attrs.get(field, getattr(instance, field, default))

        if value("create_auto_tasks", False):
            for enabled_field, interval_field in (
                ("water_task_enabled", "water_interval_days"),
                ("moisture_required", "moisture_interval_days"),
                ("fertilize_required", "fertilize_interval_days"),
                ("care_required", "care_interval_days"),
                ("repot_task_enabled", "repot_interval_months"),
            ):
                if value(enabled_field, False) and value(interval_field) is None:
                    raise serializers.ValidationError({interval_field: "An interval is required for this care task."})
        return attrs

    def validate_location_id(self, value: int):
        request = self.context["request"]
        if not Location.objects.filter(id=value, user=request.user).exists():
            raise serializers.ValidationError("Invalid location.")
        return value

    def validate_plant_definition_id(self, value):
        if value in (None, "", 0):
            return None
        if not PlantDefinition.objects.filter(id=value).exists():
            # A shared catalog entry may disappear after a successful create.
            # Only the same owner's committed draft may retain that old ID;
            # create() still compares every normalized field under its lock
            # before returning the stored response instead of inserting a row.
            if self.instance is None:
                try:
                    key = self.fields["creation_key"].run_validation(self.initial_data.get("creation_key"))
                except serializers.ValidationError:
                    key = None
                if key is not None and PlantCreationRequest.objects.filter(
                    user=self.context["request"].user, creation_key=key,
                    response_data__plant_definition_id=value,
                ).exists():
                    return value
            raise serializers.ValidationError("Invalid plant definition.")
        return value

    @transaction.atomic
    def create(self, validated_data):
        creation_key = validated_data.pop("creation_key", None)
        self.creation_replayed = False
        if creation_key is None:
            return self._create_plant(validated_data)
        user = self.context["request"].user
        prototype = PlantInstance(user=user, **validated_data)
        writable = [field.field_name for field in self._writable_fields if field.field_name != "creation_key"]
        canonical = {name: getattr(prototype, name) for name in writable}
        request_hash = hashlib.sha256(json.dumps(canonical, cls=DjangoJSONEncoder, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        receipt, created = PlantCreationRequest.objects.get_or_create(
            user=user, creation_key=creation_key, defaults={"request_hash": request_hash},
        )
        receipt = PlantCreationRequest.objects.select_for_update().get(pk=receipt.pk)
        if not created:
            if receipt.request_hash != request_hash:
                raise serializers.ValidationError({"creation_key": "This draft already created a plant with different data. Retry the original data, or start a new draft with a new creation key."})
            if receipt.plant_id is None:
                raise serializers.ValidationError({"creation_key": "The plant created by this draft was deleted. Start a new draft."})
            self.creation_replayed = True
            self.creation_response = receipt.response_data
            return receipt.plant
        obj = self._create_plant(validated_data)
        receipt.plant = obj
        receipt.response_data = dict(PlantInstanceSerializer(obj, context=self.context).data)
        receipt.save(update_fields=["plant", "response_data"])
        self.creation_response = receipt.response_data
        return obj

    def _create_plant(self, validated_data):
        request = self.context["request"]

        plant_definition_id = validated_data.pop("plant_definition_id", None)
        location_id = validated_data.pop("location_id")

        obj = PlantInstance(
            user=request.user,
            location=Location.objects.get(id=location_id, user=request.user),
            plant_definition=PlantDefinition.objects.get(id=plant_definition_id)
            if plant_definition_id
            else None,
            **validated_data,
        )
        obj.save()

        def _mk_reminder(_type: str, interval_value: int, unit: str):
            first_due = timezone.localdate() + (
                timedelta(days=interval_value) if unit == "days" else relativedelta(months=interval_value)
            )
            r, _ = Reminder.objects.get_or_create(
                plant=obj,
                user=request.user,
                type=_type,
                defaults={
                    "start_date": first_due,
                    "interval_value": interval_value,
                    "interval_unit": unit,
                    "is_active": True,
                },
            )
            r.ensure_one_pending_task()

        if obj.create_auto_tasks:
            if obj.water_task_enabled and obj.water_interval_days:
                _mk_reminder("water", int(obj.water_interval_days), "days")

            if obj.moisture_required and obj.moisture_interval_days:
                _mk_reminder("moisture", int(obj.moisture_interval_days), "days")

            if obj.fertilize_required and obj.fertilize_interval_days:
                _mk_reminder("fertilize", int(obj.fertilize_interval_days), "days")

            if obj.care_required and obj.care_interval_days:
                _mk_reminder("care", int(obj.care_interval_days), "days")

            if obj.repot_task_enabled and obj.repot_interval_months:
                _mk_reminder("repot", int(obj.repot_interval_months), "months")

        return obj

class PlantInstanceListSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        return photo_metadata(obj, self.context.get("request"))
    location = serializers.SerializerMethodField()
    plant_definition = serializers.SerializerMethodField()
    access = serializers.SerializerMethodField()

    def get_access(self, obj):
        return plant_access(getattr(self.context.get("request"), "user", None), obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        caller = getattr(self.context.get("request"), "user", None)
        if caller is not None and caller.pk != instance.user_id:
            data["photo_uri"] = None
        return data

    class Meta:
        model = PlantInstance
        fields = [
            "id",
            "display_name",
            "notes",
            "photo_uri",
            "photo",
            "location",
            "plant_definition",
            "qr_code",
            "created_at",
            "updated_at",
            "access",
        ]

    def get_location(self, obj):
        if not obj.location_id:
            return None
        return {
            "id": obj.location_id,
            "name": obj.location.name,
            "category": obj.location.category,
        }

    def get_plant_definition(self, obj):
        if not obj.plant_definition_id:
            return None

        request = self.context.get("request")

        thumb = None
        hero = None
        if obj.plant_definition:
            if obj.plant_definition.image_thumb:
                thumb = _abs_media_url(request, obj.plant_definition.image_thumb)
            if obj.plant_definition.image_hero:
                hero = _abs_media_url(request, obj.plant_definition.image_hero)

        return {
            "id": obj.plant_definition_id,
            "name": obj.plant_definition.name,
            "latin": obj.plant_definition.latin,
            "image_thumb": thumb,
            "image": hero,
        }

# detail serializer for GET /plant-instances/<id>/
# returns the full editable payload + nested read bits
class PlantInstanceDetailSerializer(serializers.ModelSerializer):
    photo = serializers.SerializerMethodField()

    def get_photo(self, obj):
        return photo_metadata(obj, self.context.get("request"))
    location = serializers.SerializerMethodField()
    plant_definition = serializers.SerializerMethodField()
    plant_definition_id = serializers.IntegerField(source="plant_definition.id", read_only=True)
    location_id = serializers.IntegerField(source="location.id", read_only=True)
    access = serializers.SerializerMethodField()

    def get_access(self, obj):
        return plant_access(getattr(self.context.get("request"), "user", None), obj)

    class Meta:
        model = PlantInstance
        fields = [
            "id",
            "plant_definition",
            "location",
            "plant_definition_id",
            "location_id",
            "display_name",
            "notes",
            "purchase_date",
            "photo",
            # do not return backend photo_uri (local-only on device)
            # "photo_uri",
            "light_level",
            "orientation",
            "distance_cm",
            "pot_material",
            "soil_mix",
            "create_auto_tasks",
            "water_task_enabled",
            "repot_task_enabled",
            "moisture_required",
            "fertilize_required",
            "care_required",
            "last_watered",
            "last_repotted",
            "water_interval_days",
            "moisture_interval_days",
            "fertilize_interval_days",
            "care_interval_days",
            "repot_interval_months",
            "qr_code",
            "created_at",
            "updated_at",
            "access",
        ]
        read_only_fields = [
            "id",
            "plant_definition",
            "location",
            "plant_definition_id",
            "location_id",
            "qr_code",
            "created_at",
            "updated_at",
        ]

    def get_location(self, obj):
        if not obj.location_id:
            return None
        return {
            "id": obj.location_id,
            "name": obj.location.name,
            "category": obj.location.category,
        }

    def get_plant_definition(self, obj):
        if not obj.plant_definition_id:
            return None

        request = self.context.get("request")

        thumb = None
        hero = None
        if obj.plant_definition:
            if obj.plant_definition.image_thumb:
                thumb = _abs_media_url(request, obj.plant_definition.image_thumb)
            if obj.plant_definition.image_hero:
                hero = _abs_media_url(request, obj.plant_definition.image_hero)

        return {
            "id": obj.plant_definition_id,
            "name": obj.plant_definition.name,
            "latin": obj.plant_definition.latin,
            "image_thumb": thumb,
            "image": hero,
        }
