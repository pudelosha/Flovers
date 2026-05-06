from rest_framework import serializers
from .models import ReadingDevice, Reading, PumpTask


class ReadingDeviceAutoPumpSerializer(serializers.Serializer):
    automatic_pump_launch = serializers.BooleanField()
    pump_threshold_pct = serializers.FloatField(required=False, allow_null=True)


class PumpTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = PumpTask
        fields = (
            "id",
            "source",
            "status",
            "requested_at",
            "delivered_at",
            "executed_at",
            "cancelled_at",
            "expires_at",
            "moisture_at_request",
            "threshold_at_request",
            "error_message",
        )
        read_only_fields = fields


class ReadingDeviceSerializer(serializers.ModelSerializer):
    latest = serializers.SerializerMethodField()
    pending_pump_task = serializers.SerializerMethodField()

    # UI alias fields (write-only) so current modal payload can be sent as-is
    mode = serializers.CharField(write_only=True, required=False)
    plantId = serializers.IntegerField(write_only=True, required=False)
    name = serializers.CharField(write_only=True, required=False)
    enabled = serializers.BooleanField(write_only=True, required=False)
    intervalHours = serializers.IntegerField(write_only=True, required=False)

    sendEmailNotifications = serializers.BooleanField(write_only=True, required=False)
    sendPushNotifications = serializers.BooleanField(write_only=True, required=False)

    pumpIncluded = serializers.BooleanField(write_only=True, required=False)
    automaticPumpLaunch = serializers.BooleanField(write_only=True, required=False)
    pumpThresholdPct = serializers.FloatField(write_only=True, required=False)

    sendEmailWateringNotifications = serializers.BooleanField(write_only=True, required=False)
    sendPushWateringNotifications = serializers.BooleanField(write_only=True, required=False)

    class Meta:
        model = ReadingDevice
        fields = (
            # canonical API/model fields
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

            "send_email_notifications",
            "send_push_notifications",

            "pump_included",
            "automatic_pump_launch",
            "pump_threshold_pct",

            "send_email_watering_notifications",
            "send_push_watering_notifications",

            "last_pump_run_at",
            "last_pump_run_source",
            "pump_cooldown_minutes",
            "pending_pump_task",

            "last_read_at",
            "latest",
            "created_at",
            "updated_at",

            # UI alias fields (write-only)
            "mode",
            "plantId",
            "name",
            "enabled",
            "intervalHours",

            "sendEmailNotifications",
            "sendPushNotifications",

            "pumpIncluded",
            "automaticPumpLaunch",
            "pumpThresholdPct",

            "sendEmailWateringNotifications",
            "sendPushWateringNotifications",
        )
        read_only_fields = (
            "device_key",
            "plant_name",
            "plant_location",
            "last_pump_run_at",
            "last_pump_run_source",
            "pending_pump_task",
            "moisture_alert_active",
            "last_read_at",
            "latest",
            "created_at",
            "updated_at",
        )

    def get_latest(self, obj):
        return obj.latest_snapshot or None

    def get_pending_pump_task(self, obj):
        task = (
            obj.pump_tasks
            .filter(
                source=PumpTask.SOURCE_MANUAL,
                status__in=[PumpTask.STATUS_PENDING, PumpTask.STATUS_DELIVERED],
            )
            .order_by("-requested_at")
            .first()
        )

        if not task:
            return None

        data = PumpTaskSerializer(task).data
        data.pop("expires_at", None)
        return data

    def to_internal_value(self, data):
        data = data.copy()

        # ---- UI aliases -> model fields ----
        if "plantId" in data and "plant" not in data:
            data["plant"] = data.get("plantId")

        if "name" in data and "device_name" not in data:
            data["device_name"] = data.get("name")

        if "enabled" in data and "is_active" not in data:
            data["is_active"] = data.get("enabled")

        if "intervalHours" in data and "interval_hours" not in data:
            data["interval_hours"] = data.get("intervalHours")

        if "sendEmailNotifications" in data and "send_email_notifications" not in data:
            data["send_email_notifications"] = data.get("sendEmailNotifications")

        if "sendPushNotifications" in data and "send_push_notifications" not in data:
            data["send_push_notifications"] = data.get("sendPushNotifications")

        if "pumpIncluded" in data and "pump_included" not in data:
            data["pump_included"] = data.get("pumpIncluded")

        if "automaticPumpLaunch" in data and "automatic_pump_launch" not in data:
            data["automatic_pump_launch"] = data.get("automaticPumpLaunch")

        if "pumpThresholdPct" in data and "pump_threshold_pct" not in data:
            data["pump_threshold_pct"] = data.get("pumpThresholdPct")

        if (
            "sendEmailWateringNotifications" in data
            and "send_email_watering_notifications" not in data
        ):
            data["send_email_watering_notifications"] = data.get(
                "sendEmailWateringNotifications"
            )

        if (
            "sendPushWateringNotifications" in data
            and "send_push_watering_notifications" not in data
        ):
            data["send_push_watering_notifications"] = data.get(
                "sendPushWateringNotifications"
            )

        # ---- nested modal sensors payload ----
        sensors = data.get("sensors")
        if isinstance(sensors, dict):
            if "moistureAlertEnabled" in sensors and "moisture_alert_enabled" not in data:
                data["moisture_alert_enabled"] = sensors.get("moistureAlertEnabled")

            if "moistureAlertPct" in sensors and "moisture_alert_threshold" not in data:
                data["moisture_alert_threshold"] = sensors.get("moistureAlertPct")

            # keep only actual sensor toggles in sensors JSON
            normalized_sensors = dict(sensors)
            normalized_sensors.pop("moistureAlertEnabled", None)
            normalized_sensors.pop("moistureAlertPct", None)
            data["sensors"] = normalized_sensors

        # UI-only field, ignored by backend
        data.pop("mode", None)

        return super().to_internal_value(data)

    def validate_interval_hours(self, value: int):
        if not 1 <= value <= 24:
            raise serializers.ValidationError("interval_hours must be between 1 and 24")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        sensors = attrs.get("sensors", getattr(instance, "sensors", {}) or {})
        moisture_sensor_enabled = bool(sensors.get("moisture", True))

        moisture_alert_enabled = attrs.get(
            "moisture_alert_enabled",
            getattr(instance, "moisture_alert_enabled", False),
        )
        moisture_alert_threshold = attrs.get(
            "moisture_alert_threshold",
            getattr(instance, "moisture_alert_threshold", None),
        )

        pump_included = attrs.get(
            "pump_included",
            getattr(instance, "pump_included", False),
        )
        automatic_pump_launch = attrs.get(
            "automatic_pump_launch",
            getattr(instance, "automatic_pump_launch", False),
        )
        pump_threshold_pct = attrs.get(
            "pump_threshold_pct",
            getattr(instance, "pump_threshold_pct", None),
        )

        # If moisture sensor is off, dependent moisture features are disabled/reset.
        # This keeps backend state valid even if an older app or manual API request sends inconsistent values.
        if not moisture_sensor_enabled:
            attrs["moisture_alert_enabled"] = False
            attrs["moisture_alert_threshold"] = None
            attrs["send_email_notifications"] = False
            attrs["send_push_notifications"] = False

            # Automatic watering depends on soil moisture readings.
            attrs["automatic_pump_launch"] = False
            attrs["pump_threshold_pct"] = None

        # Validate moisture alert threshold
        final_moisture_alert_enabled = attrs.get(
            "moisture_alert_enabled",
            moisture_alert_enabled,
        )

        if final_moisture_alert_enabled:
            threshold = attrs.get("moisture_alert_threshold", moisture_alert_threshold)
            if threshold is None:
                raise serializers.ValidationError({
                    "moisture_alert_threshold": "This field is required when moisture alert is enabled."
                })

            try:
                threshold_f = float(threshold)
            except (TypeError, ValueError):
                raise serializers.ValidationError({
                    "moisture_alert_threshold": "A valid number is required."
                })

            if threshold_f < 0 or threshold_f > 100:
                raise serializers.ValidationError({
                    "moisture_alert_threshold": "Must be between 0 and 100."
                })

        # Normalize pump fields
        final_pump_included = attrs.get("pump_included", pump_included)
        final_automatic_pump_launch = attrs.get(
            "automatic_pump_launch",
            automatic_pump_launch,
        )

        if not final_pump_included:
            attrs["automatic_pump_launch"] = False
            attrs["pump_threshold_pct"] = None
            attrs["send_email_watering_notifications"] = False
            attrs["send_push_watering_notifications"] = False

        # Validate pump threshold
        if attrs.get("automatic_pump_launch", final_automatic_pump_launch):
            if not attrs.get("pump_included", final_pump_included):
                raise serializers.ValidationError({
                    "automatic_pump_launch": "Pump must be included to enable automatic pump launch."
                })

            threshold = attrs.get("pump_threshold_pct", pump_threshold_pct)
            if threshold is None:
                raise serializers.ValidationError({
                    "pump_threshold_pct": "This field is required when automatic pump launch is enabled."
                })

            try:
                threshold_f = float(threshold)
            except (TypeError, ValueError):
                raise serializers.ValidationError({
                    "pump_threshold_pct": "A valid number is required."
                })

            if threshold_f < 0 or threshold_f > 100:
                raise serializers.ValidationError({
                    "pump_threshold_pct": "Must be between 0 and 100."
                })

        return attrs

    def update(self, instance, validated_data):
        if validated_data.get("moisture_alert_enabled") is False:
            validated_data["moisture_alert_active"] = False

        if validated_data.get("pump_included") is False:
            validated_data["automatic_pump_launch"] = False
            validated_data["pump_threshold_pct"] = None
            validated_data["send_email_watering_notifications"] = False
            validated_data["send_push_watering_notifications"] = False

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
