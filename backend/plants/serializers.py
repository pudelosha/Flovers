from rest_framework import serializers
from .models import Plant

class PopularPlantSerializer(serializers.ModelSerializer):
    # map to the field the app expects as "image"
    image = serializers.SerializerMethodField()

    class Meta:
        model = Plant
        fields = ["id", "name", "latin", "image", "sun", "water", "difficulty"]

    def get_image(self, obj: Plant) -> str:
        return obj.image_thumb_url or ""

class PlantSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plant
        fields = ["id", "name", "latin"]

class PlantProfileSerializer(serializers.ModelSerializer):
    # Step 2 expects these names
    image = serializers.SerializerMethodField()

    class Meta:
        model = Plant
        fields = ["id", "name", "latin", "image", "description", "traits"]

    def get_image(self, obj: Plant) -> str:
        return obj.image_hero_url or ""
