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
            "last_read_at",
            "latest",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "device_key",
            "plant_name",
            "plant_location",
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
        sensors = attrs.get("sensors", {})
        if sensors and sensors.get("moisture_alert_enabled"):
            pct = sensors.get("moisture_alert_pct", None)
            if pct is None or not (0 <= int(pct) <= 100):
                raise serializers.ValidationError(
                    {"sensors": {"moisture_alert_pct": "0..100 required when alert is enabled"}}
                )
        return attrs

class ReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reading
        fields = ("timestamp", "temperature", "humidity", "light", "moisture")
