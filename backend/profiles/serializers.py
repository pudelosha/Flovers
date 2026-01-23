from __future__ import annotations

from decimal import Decimal, InvalidOperation

from rest_framework import serializers

from .models import (
    ProfileSettings,
    ProfileNotifications,
    PushDevice,
    LANG_CHOICES,
    TEMP_CHOICES,
    MEASURE_CHOICES,
    BACKGROUND_CHOICES,
    FAB_CHOICES,
    TILE_MOTIVE_CHOICES,
)


class ProfileSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileSettings
        fields = [
            "language",
            "date_format",
            "temperature_unit",
            "measure_unit",
            "tile_transparency",
            "tile_motive",
            "background",
            "fab_position",
        ]

    def validate_language(self, v):
        valid = {c for c, _ in LANG_CHOICES}
        if v not in valid:
            raise serializers.ValidationError("Invalid language.")
        return v

    def validate_temperature_unit(self, v):
        valid = {c for c, _ in TEMP_CHOICES}
        if v not in valid:
            raise serializers.ValidationError("Invalid temperature unit.")
        return v

    def validate_measure_unit(self, v):
        valid = {c for c, _ in MEASURE_CHOICES}
        if v not in valid:
            raise serializers.ValidationError("Invalid measure unit.")
        return v

    def validate_background(self, v):
        valid = {c for c, _ in BACKGROUND_CHOICES}
        if v not in valid:
            raise serializers.ValidationError("Invalid background option.")
        return v

    def validate_fab_position(self, v):
        valid = {c for c, _ in FAB_CHOICES}
        if v not in valid:
            raise serializers.ValidationError("Invalid FAB position.")
        return v

    def validate_tile_motive(self, v):
        valid = {c for c, _ in TILE_MOTIVE_CHOICES}
        if v not in valid:
            raise serializers.ValidationError("Invalid tile motive.")
        return v

    def validate_tile_transparency(self, v):
        # Accept numbers/strings; coerce to Decimal within bounds 0.00..0.60
        try:
            d = Decimal(str(v))
        except (InvalidOperation, TypeError, ValueError):
            raise serializers.ValidationError("Invalid transparency value.")
        if d < Decimal("0.00") or d > Decimal("0.60"):
            raise serializers.ValidationError("Transparency must be between 0.00 and 0.60.")
        return d.quantize(Decimal("0.01"))


class ProfileNotificationsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileNotifications
        fields = [
            "timezone",
            "email_daily",
            "email_hour",
            "email_minute",
            "email_24h",
            "push_daily",
            "push_hour",
            "push_minute",
            "push_24h",
        ]

    def validate_timezone(self, v: str):
        if not isinstance(v, str) or not v.strip():
            raise serializers.ValidationError("timezone must be a non-empty string.")
        return v.strip()

    def validate_email_hour(self, v):
        if not isinstance(v, int) or v < 0 or v > 23:
            raise serializers.ValidationError("email_hour must be an integer between 0 and 23.")
        return v

    def validate_email_minute(self, v):
        if not isinstance(v, int) or v < 0 or v > 59:
            raise serializers.ValidationError("email_minute must be an integer between 0 and 59.")
        return v

    def validate_push_hour(self, v):
        if not isinstance(v, int) or v < 0 or v > 23:
            raise serializers.ValidationError("push_hour must be an integer between 0 and 23.")
        return v

    def validate_push_minute(self, v):
        if not isinstance(v, int) or v < 0 or v > 59:
            raise serializers.ValidationError("push_minute must be an integer between 0 and 59.")
        return v

class PushDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushDevice
        fields = ["token", "platform", "is_active", "last_seen_at"]
        read_only_fields = ["is_active", "last_seen_at"]
        extra_kwargs = {
            # IMPORTANT: allow re-posting same token (upsert in the view)
            "token": {"validators": []},
        }

    def validate_token(self, v: str):
        if not isinstance(v, str) or not v.strip():
            raise serializers.ValidationError("token must be a non-empty string.")
        return v.strip()

    def validate_platform(self, v: str):
        if not isinstance(v, str):
            raise serializers.ValidationError("platform must be a string.")
        v = v.strip().lower()
        if v not in {PushDevice.PLATFORM_ANDROID, PushDevice.PLATFORM_IOS}:
            raise serializers.ValidationError("platform must be 'android' or 'ios'.")
        return v

