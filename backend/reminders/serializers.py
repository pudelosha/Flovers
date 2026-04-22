from rest_framework import serializers
from django.utils import timezone
from .models import Reminder, ReminderTask


class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = [
            "id", "plant", "type", "start_date", "interval_value",
            "interval_unit", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def update(self, instance: Reminder, validated_data):
        """
        Allow normal field updates; task regeneration handled in the view's perform_update.
        """
        return super().update(instance, validated_data)


class ReminderTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderTask
        fields = [
            "id", "reminder", "due_date", "status", "completed_at", "note",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "completed_at", "created_at", "updated_at"]


class ReminderTaskJournalSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="reminder.type", read_only=True)

    class Meta:
        model = ReminderTask
        fields = ["id", "type", "completed_at", "note"]


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