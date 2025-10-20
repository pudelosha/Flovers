from rest_framework import serializers
from django.utils import timezone

from .models import PlantInstance
from locations.models import Location
from plant_definitions.models import PlantDefinition
from reminders.models import Reminder


class PlantInstanceSerializer(serializers.ModelSerializer):
    # incoming payload uses these simple ids
    plant_definition_id = serializers.IntegerField(required=False, allow_null=True)
    location_id = serializers.IntegerField(required=True)

    class Meta:
        model = PlantInstance
        fields = [
            "id",
            # FKs as ids
            "plant_definition_id",
            "location_id",
            # display
            "display_name",
            "notes",
            "purchase_date",
            "photo_uri",
            # exposure
            "light_level",
            "orientation",
            "distance_cm",
            # container / soil
            "pot_material",
            "soil_mix",
            # auto tasks prefs
            "create_auto_tasks",
            "water_task_enabled",
            "repot_task_enabled",
            "moisture_required",
            "fertilize_required",
            "care_required",
            "last_watered",
            "last_repotted",
            "moisture_interval_days",
            "fertilize_interval_days",
            "care_interval_days",
            "repot_interval_months",
            # QR & meta
            "qr_code",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "qr_code", "created_at", "updated_at"]

    def validate_location_id(self, value: int):
        request = self.context["request"]
        if not Location.objects.filter(id=value, user=request.user).exists():
            raise serializers.ValidationError("Invalid location.")
        return value

    def validate_plant_definition_id(self, value):
        if value in (None, "", 0):
            return None
        if not PlantDefinition.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid plant definition.")
        return value

    def create(self, validated_data):
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

        # ---------------------------
        # Auto-reminders initialization
        # ---------------------------
        def _mk_reminder(_type: str, interval_value: int, unit: str):
            r, _ = Reminder.objects.get_or_create(
                plant=obj,
                user=request.user,
                type=_type,
                defaults={
                    "start_date": timezone.localdate(),
                    "interval_value": interval_value,
                    "interval_unit": unit,  # "days" | "months"
                    "is_active": True,
                },
            )
            r.ensure_one_pending_task()

        if obj.create_auto_tasks:
            # Watering (NOTE: currently reusing moisture_interval_days for water as well)
            if obj.water_task_enabled and obj.moisture_interval_days:
                _mk_reminder("water", int(obj.moisture_interval_days), "days")

            # Misting / moisture (NEW)
            if obj.moisture_required and obj.moisture_interval_days:
                _mk_reminder("moisture", int(obj.moisture_interval_days), "days")

            # Fertilising
            if obj.fertilize_required and obj.fertilize_interval_days:
                _mk_reminder("fertilize", int(obj.fertilize_interval_days), "days")

            # General care
            if obj.care_required and obj.care_interval_days:
                _mk_reminder("care", int(obj.care_interval_days), "days")

            # Repotting (months)
            if obj.repot_task_enabled and obj.repot_interval_months:
                _mk_reminder("repot", int(obj.repot_interval_months), "months")

        return obj


class PlantInstanceListSerializer(serializers.ModelSerializer):
    location = serializers.SerializerMethodField()
    plant_definition = serializers.SerializerMethodField()

    class Meta:
        model = PlantInstance
        fields = [
            "id",
            "display_name",
            "notes",
            "location",
            "plant_definition",
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
        return {
            "id": obj.plant_definition_id,
            "name": obj.plant_definition.name,
            "latin": obj.plant_definition.latin,
        }
