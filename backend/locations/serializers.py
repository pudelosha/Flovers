from rest_framework import serializers
from .models import Location

class LocationSerializer(serializers.ModelSerializer):
  plant_count = serializers.IntegerField(read_only=True)

  class Meta:
      model = Location
      fields = ["id", "name", "category", "plant_count", "created_at", "updated_at"]

  def validate_name(self, value: str):
      v = (value or "").strip()
      if not v:
          raise serializers.ValidationError("Name is required.")
      return v
