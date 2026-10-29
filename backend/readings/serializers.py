from rest_framework import serializers
from datetime import timedelta
import math
from django.utils import timezone
from .models import ReadingDevice, Reading, PumpTask
from sharing.permissions import plant_access


class ReadingDeviceAutoPumpSerializer(serializers.Serializer):
    automatic_pump_launch = serializers.BooleanField()
    pump_threshold_pct = serializers.FloatField(required=False, allow_null=True)

    def validate_pump_threshold_pct(self, value):
        if value is not None and (not math.isfinite(value) or not 0 <= value <= 100):
            raise serializers.ValidationError("Must be a finite number between 0 and 100.")
        return value


class ReadingIngestSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField(required=False, default=timezone.now)
    metrics = serializers.DictField(allow_empty=False)

    def validate_timestamp(self, value):
        if value > timezone.now() + timedelta(minutes=5):
            raise serializers.ValidationError("Timestamp cannot be more than five minutes in the future.")
        return value

    def validate_metrics(self, values):
        allowed = {"temperature", "humidity", "light", "moisture"}
        if set(values) - allowed:
            raise serializers.ValidationError("Unknown sensor metric.")
        parsed = {}
        for name, value in values.items():
            if value is None:
                parsed[name] = None
                continue
            try:
                if isinstance(value, bool):
                    raise ValueError
                number = float(value)
                if not math.isfinite(number):
                    raise ValueError
            except (TypeError, ValueError, OverflowError):
                raise serializers.ValidationError({name: "A finite number or null is required."})
            if name in {"humidity", "moisture"} and not 0 <= number <= 100:
                raise serializers.ValidationError({name: "Must be between 0 and 100."})
            if name == "light" and number < 0:
                raise serializers.ValidationError({name: "Must not be negative."})
            parsed[name] = number
        return parsed

    def to_internal_value(self, data):
        # Older sketches use an empty timestamp when their clock is unavailable.
        if isinstance(data, dict) and data.get("timestamp") == "":
            data = {key: value for key, value in data.items() if key != "timestamp"}
        return super().to_internal_value(data)


class PumpScheduleSerializer(serializers.Serializer):
    duration_seconds = serializers.IntegerField(min_value=1, max_value=300, required=False)


class PumpTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = PumpTask
        fields = (
            "id",
            "source",
            "status",
            "requested_at",
            "duration_seconds",
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
    access = serializers.SerializerMethodField()

    def get_access(self, obj):
        return plant_access(getattr(self.context.get("request"), "user", None), obj.plant) if obj.plant_id else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["interval_minutes"] = instance.effective_interval_minutes
        caller = getattr(self.context.get("request"), "user", None)
        if caller is not None and caller.pk != instance.user_id:
            safe_fields = {"id", "plant", "plant_name", "plant_location", "device_name", "is_active", "interval_hours",
                           "interval_minutes", "sensors", "last_read_at", "latest", "created_at", "updated_at", "access"}
            data = {key: value for key, value in data.items() if key in safe_fields}
        return data
    latest = serializers.SerializerMethodField()
    pending_pump_task = serializers.SerializerMethodField()

    mode = serializers.CharField(write_only=True, required=False)
    plantId = serializers.IntegerField(write_only=True, required=False)
    name = serializers.CharField(write_only=True, required=False)
    enabled = serializers.BooleanField(write_only=True, required=False)
    intervalHours = serializers.IntegerField(write_only=True, required=False)
    interval_minutes = serializers.IntegerField(required=False, min_value=1, max_value=1440)
    intervalMinutes = serializers.IntegerField(write_only=True, required=False)

    sendEmailNotifications = serializers.BooleanField(write_only=True, required=False)
    sendPushNotifications = serializers.BooleanField(write_only=True, required=False)
    sendEmailMissingReadings = serializers.BooleanField(write_only=True, required=False)
    sendPushMissingReadings = serializers.BooleanField(write_only=True, required=False)

    pumpIncluded = serializers.BooleanField(write_only=True, required=False)
    automaticPumpLaunch = serializers.BooleanField(write_only=True, required=False)
    pumpThresholdPct = serializers.FloatField(write_only=True, required=False)

    sendEmailWateringNotifications = serializers.BooleanField(write_only=True, required=False)
    sendPushWateringNotifications = serializers.BooleanField(write_only=True, required=False)

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
            "access",
            "notes",
            "interval_hours",
            "interval_minutes",
            "sensors",

            "moisture_alert_enabled",
            "moisture_alert_threshold",
            "moisture_alert_active",

            "send_email_notifications",
            "send_push_notifications",
            "send_email_missing_readings",
            "send_push_missing_readings",

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

            "mode",
            "plantId",
            "name",
            "enabled",
            "intervalHours",
            "intervalMinutes",

            "sendEmailNotifications",
            "sendPushNotifications",
            "sendEmailMissingReadings",
            "sendPushMissingReadings",

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

        if "plantId" in data and "plant" not in data:
            data["plant"] = data.get("plantId")

        if "name" in data and "device_name" not in data:
            data["device_name"] = data.get("name")

        if "enabled" in data and "is_active" not in data:
            data["is_active"] = data.get("enabled")

        if "intervalHours" in data and "interval_hours" not in data:
            data["interval_hours"] = data.get("intervalHours")

        for alias, canonical in (("intervalMinutes", "interval_minutes"),
                                 ("sendEmailMissingReadings", "send_email_missing_readings"),
                                 ("sendPushMissingReadings", "send_push_missing_readings")):
            if alias in data and canonical not in data:
                data[canonical] = data[alias]

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

        sensors = data.get("sensors")
        if isinstance(sensors, dict):
            if "moistureAlertEnabled" in sensors and "moisture_alert_enabled" not in data:
                data["moisture_alert_enabled"] = sensors.get("moistureAlertEnabled")

            if "moistureAlertPct" in sensors and "moisture_alert_threshold" not in data:
                data["moisture_alert_threshold"] = sensors.get("moistureAlertPct")

            normalized_sensors = dict(sensors)
            normalized_sensors.pop("moistureAlertEnabled", None)
            normalized_sensors.pop("moistureAlertPct", None)
            data["sensors"] = normalized_sensors

        for alias in (
            "mode", "plantId", "name", "enabled", "intervalHours",
            "intervalMinutes", "sendEmailMissingReadings", "sendPushMissingReadings",
            "sendEmailNotifications", "sendPushNotifications", "pumpIncluded",
            "automaticPumpLaunch", "pumpThresholdPct", "sendEmailWateringNotifications",
            "sendPushWateringNotifications",
        ):
            data.pop(alias, None)

        return super().to_internal_value(data)

    def validate_plant(self, plant):
        request = self.context.get("request")
        if request is not None and plant.user_id != request.user.pk:
            raise serializers.ValidationError("Invalid plant.")
        return plant

    def validate_interval_hours(self, value: int):
        if not 1 <= value <= 24:
            raise serializers.ValidationError("interval_hours must be between 1 and 24")
        return value

    def validate_sensors(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("A sensor object is required.")
        boolean = serializers.BooleanField()
        return {key: boolean.run_validation(flag) for key, flag in value.items()}

    def validate_pump_cooldown_minutes(self, value):
        if not 1 <= value <= 32767:
            raise serializers.ValidationError("Cooldown must be between 1 and 32767 minutes.")
        return value

    def validate_pump_threshold_pct(self, value):
        if value is not None and (not math.isfinite(value) or not 0 <= value <= 100):
            raise serializers.ValidationError("Must be a finite number between 0 and 100.")
        return value

    validate_moisture_alert_threshold = validate_pump_threshold_pct

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        if "interval_minutes" in attrs:
            minutes = attrs["interval_minutes"]
            if "interval_hours" in attrs and attrs["interval_hours"] != math.ceil(minutes / 60):
                raise serializers.ValidationError({"interval_minutes": "Conflicting reading intervals."})
            # The whole-hour field is kept only for older clients.
            attrs["interval_hours"] = math.ceil(minutes / 60)
        elif "interval_hours" in attrs:
            attrs["interval_minutes"] = attrs["interval_hours"] * 60

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

            attrs["automatic_pump_launch"] = False
            attrs["pump_threshold_pct"] = None

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

        # ModelSerializer's default full save can restore a stale snapshot or
        # pump summary while a settings PATCH edits an unrelated field.
        for field, value in validated_data.items():
            setattr(instance, field, value)
        fields = set(validated_data) | {"updated_at"}
        if "plant" in fields:
            fields.update({"plant_name", "plant_location"})
        instance.save(update_fields=fields)
        return instance


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
