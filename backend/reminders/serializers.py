from rest_framework import serializers
from django.utils import timezone
from .models import Reminder, ReminderTask


class ReminderSerializer(serializers.ModelSerializer):
    interval_value = serializers.IntegerField(min_value=1)

    class Meta:
        model = Reminder
        fields = [
            "id", "plant", "type", "start_date", "interval_value",
            "interval_unit", "is_active", "created_at", "updated_at",
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
    class Meta:
        model = ReminderTask
        fields = [
            "id", "reminder", "due_date", "status", "completed_at", "note",
            "created_at", "updated_at",
            "completed_event",
        ]
        read_only_fields = ["id", "status", "completed_at", "created_at", "updated_at", "completed_event"]


class ReminderTaskJournalSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField()

    def get_type(self, obj):
        return obj.event["type"]

    class Meta:
        model = ReminderTask
        fields = ["id", "type", "completed_at", "note"]


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
