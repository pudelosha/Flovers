from rest_framework import serializers
from .models import ReadingDevice, Reading


class ReadingDeviceSerializer(serializers.ModelSerializer):
    latest = serializers.SerializerMethodField()

    class Meta:
        model = ReadingDevice
        fields = (
            "id",
            "plant",
            "plant_name",
            "plant_location",
            "device_name",
            "is_active",
            "device_key",
            "notes",
            "interval_hours",
            "sensors",
            "moisture_alert_enabled",
            "moisture_alert_threshold",
            "moisture_alert_active",
            "last_read_at",
            "latest",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "device_key",
            "plant_name",
            "plant_location",
            "moisture_alert_active",
            "last_read_at",
            "latest",
            "created_at",
            "updated_at",
        )

    def get_latest(self, obj):
        return obj.latest_snapshot or None

    def validate_interval_hours(self, v: int):
        if not 1 <= v <= 24:
            raise serializers.ValidationError("interval_hours must be between 1 and 24")
        return v

    def validate(self, attrs):
        enabled = attrs.get("moisture_alert_enabled", getattr(self.instance, "moisture_alert_enabled", False))
        threshold = attrs.get("moisture_alert_threshold", getattr(self.instance, "moisture_alert_threshold", None))

        if enabled:
            if threshold is None:
                raise serializers.ValidationError(
                    {"moisture_alert_threshold": "This field is required when moisture alert is enabled."}
                )
            try:
                threshold_f = float(threshold)
            except (TypeError, ValueError):
                raise serializers.ValidationError(
                    {"moisture_alert_threshold": "A valid number is required."}
                )
            if threshold_f < 0:
                raise serializers.ValidationError(
                    {"moisture_alert_threshold": "Must be greater than or equal to 0."}
                )

        return attrs

    def update(self, instance, validated_data):
        if validated_data.get("moisture_alert_enabled") is False:
            validated_data["moisture_alert_active"] = False
        return super().update(instance, validated_data)


class ReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reading
        fields = ("timestamp", "temperature", "humidity", "light", "moisture")


class ReadingsExportEmailSerializer(serializers.Serializer):
    plantId = serializers.IntegerField(required=False)
    location = serializers.CharField(required=False, allow_blank=False)
    status = serializers.ChoiceField(
        choices=["enabled", "disabled"],
        required=False,
    )
    sortKey = serializers.ChoiceField(
        choices=["name", "location", "lastRead"],
        required=False,
        default="name",
    )
    sortDir = serializers.ChoiceField(
        choices=["asc", "desc"],
        required=False,
        default="asc",
    )
    lang = serializers.CharField(required=False, allow_blank=True)