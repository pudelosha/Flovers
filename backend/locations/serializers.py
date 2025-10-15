from rest_framework import serializers
from .models import Location

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = ["id", "name", "category", "created_at", "updated_at"]

    # Make extra-sure we don’t accept blank names from API
    def validate_name(self, value: str):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Name is required.")
        return v
