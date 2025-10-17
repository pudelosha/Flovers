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
            "id", "reminder", "due_date", "status", "completed_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "completed_at", "created_at", "updated_at"]
