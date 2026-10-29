from rest_framework import serializers
from django.utils import timezone
from .models import Reminder, ReminderTask


def _access(serializer, plant):
    from sharing.permissions import plant_access
    request = serializer.context.get("request")
    return plant_access(request.user if request is not None else plant.user, plant)


def _task_plant(serializer, task):
    plant = task.reminder.plant
    event_id = (task.completed_event or {}).get("plant_id") if task.status == "completed" else None
    if event_id and event_id != plant.pk:
        from plant_instances.models import PlantInstance
        cached = serializer.context.setdefault("event_plants", {})
        if event_id not in cached:
            cached[event_id] = PlantInstance.objects.select_related("user").filter(pk=event_id).first()
        # Owners retain their immutable history when an old plant was deleted;
        # shared viewers only reach rows whose event plant is still accessible.
        plant = cached[event_id] or plant
    return plant


def _completed_by(task):
    actor = task.completed_by
    if actor is None:
        return None
    return {"id": str(actor.pk), "name": actor.get_full_name().strip() or f"FL-{actor.flovers_id.hex.upper()}"}


class ReminderSerializer(serializers.ModelSerializer):
    interval_value = serializers.IntegerField(min_value=1)
    access = serializers.SerializerMethodField()

    def get_access(self, obj):
        return _access(self, obj.plant)

    class Meta:
        model = Reminder
        fields = [
            "id", "plant", "type", "start_date", "interval_value",
            "interval_unit", "is_active", "created_at", "updated_at", "access",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_plant(self, plant):
        request = self.context.get("request")
        if request is not None and plant.user_id != request.user.pk:
            raise serializers.ValidationError("Invalid plant.")
        return plant

    def update(self, instance: Reminder, validated_data):
        """
        Allow normal field updates; task regeneration handled in the view's perform_update.
        """
        for name, value in validated_data.items():
            setattr(instance, name, value)
        instance.save(update_fields=[*validated_data, "updated_at"])
        return instance


class ReminderTaskSerializer(serializers.ModelSerializer):
    access = serializers.SerializerMethodField()
    completed_by = serializers.SerializerMethodField()
    plant = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    def get_plant(self, obj):
        event = obj.completed_event if obj.status == "completed" else None
        return (event or {}).get("plant_id", obj.reminder.plant_id)

    def get_type(self, obj):
        event = obj.completed_event if obj.status == "completed" else None
        return (event or {}).get("type", obj.reminder.type)

    def get_access(self, obj):
        return _access(self, _task_plant(self, obj))

    def get_completed_by(self, obj):
        return _completed_by(obj)

    class Meta:
        model = ReminderTask
        fields = [
            "id", "reminder", "due_date", "status", "completed_at", "note",
            "created_at", "updated_at",
            "completed_event", "completed_by", "access", "plant", "type",
        ]
        read_only_fields = ["id", "status", "completed_at", "created_at", "updated_at", "completed_event", "completed_by"]


class ReminderTaskJournalSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()
    access = serializers.SerializerMethodField()
    completed_by = serializers.SerializerMethodField()

    def get_access(self, obj):
        return _access(self, _task_plant(self, obj))

    def get_completed_by(self, obj):
        return _completed_by(obj)

    def get_type(self, obj):
        return obj.event["type"]

    class Meta:
        model = ReminderTask
        fields = ["id", "type", "completed_at", "note", "completed_by", "access"]


class ReminderTaskCompleteSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    completedDate = serializers.DateField(required=False, input_formats=["%Y-%m-%d"])
    completed_date = serializers.DateField(required=False, input_formats=["%Y-%m-%d"])

    def validate(self, attrs):
        completed_date = attrs.get("completedDate") or attrs.get("completed_date")

        if completed_date and completed_date > timezone.localdate():
            raise serializers.ValidationError(
                {"completedDate": "completedDate cannot be in the future."}
            )

        note = attrs.get("note")
        if note is None:
            note = attrs.get("notes")

        attrs["completion_date"] = completed_date
        attrs["completion_note"] = note
        return attrs


class ReminderTaskExportEmailSerializer(serializers.Serializer):
    plantId = serializers.IntegerField(required=False)
    location = serializers.CharField(required=False, allow_blank=False)
    types = serializers.ListField(
        child=serializers.ChoiceField(
            choices=["watering", "moisture", "fertilising", "care", "repot"]
        ),
        required=False,
        allow_empty=False,
    )
    completedFrom = serializers.DateField(required=False, input_formats=["%Y-%m-%d"])
    completedTo = serializers.DateField(required=False, input_formats=["%Y-%m-%d"])
    sortKey = serializers.ChoiceField(
        choices=["completedAt", "plant", "location"],
        required=False,
        default="completedAt",
    )
    sortDir = serializers.ChoiceField(
        choices=["asc", "desc"],
        required=False,
        default="desc",
    )
    includePending = serializers.BooleanField(required=False, default=False)
    lang = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        completed_from = attrs.get("completedFrom")
        completed_to = attrs.get("completedTo")

        if completed_from and completed_to and completed_from > completed_to:
            raise serializers.ValidationError(
                {"completedTo": "completedTo must be on or after completedFrom."}
            )

        return attrs
