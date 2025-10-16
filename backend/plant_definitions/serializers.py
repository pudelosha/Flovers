from rest_framework import serializers
from .models import PlantDefinition

class PopularPlantDefinitionSerializer(serializers.ModelSerializer):
    # map to the field the app expects as "image"
    image = serializers.SerializerMethodField()

    class Meta:
        model = PlantDefinition
        fields = ["id", "name", "latin", "image", "sun", "water", "difficulty"]

    def get_image(self, obj: PlantDefinition):
        # Prefer thumb; fall back to hero; return None if neither
        url = (obj.image_thumb_url or obj.image_hero_url or "").strip()
        return url or None

class PlantDefinitionSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantDefinition
        fields = ["id", "name", "latin"]

class PlantDefinitionProfileSerializer(serializers.ModelSerializer):
    # Step 2 expects these names
    image = serializers.SerializerMethodField()

    class Meta:
        model = PlantDefinition
        fields = ["id", "name", "latin", "image", "description", "traits"]

    def get_image(self, obj: PlantDefinition):
        # Prefer hero; fall back to thumb; return None if neither
        url = (obj.image_hero_url or obj.image_thumb_url or "").strip()
        return url or None
