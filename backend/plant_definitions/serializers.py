from rest_framework import serializers
from .models import PlantDefinition, PlantDefinitionTranslation


def _pick_language(request) -> str:
    if request is None:
        return "en"
    lang = (request.query_params.get("lang") or "").strip().lower()
    if lang:
        return lang
    accept = (request.headers.get("Accept-Language") or "").strip().lower()
    if accept:
        first = accept.split(",")[0].strip()
        return first.split("-")[0] if first else "en"
    return "en"


def _get_translation(obj: PlantDefinition, lang: str) -> PlantDefinitionTranslation | None:
    tr = obj.translations.filter(language_code=lang).first()
    if tr:
        return tr
    return obj.translations.filter(language_code="en").first()


class PopularPlantDefinitionSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PlantDefinition
        fields = ["id", "external_id", "display_name", "latin", "image", "sun", "water", "difficulty"]

    def get_image(self, obj: PlantDefinition):
        request = self.context.get("request")
        if obj.image_thumb:
            return request.build_absolute_uri(obj.image_thumb.url) if request else obj.image_thumb.url
        if obj.image_hero:
            return request.build_absolute_uri(obj.image_hero.url) if request else obj.image_hero.url
        return None

    def get_display_name(self, obj: PlantDefinition):
        request = self.context.get("request")
        lang = _pick_language(request)
        tr = _get_translation(obj, lang)
        if tr and tr.common_name.strip():
            return tr.common_name.strip()
        return obj.name.strip() or obj.latin


class PlantDefinitionSuggestionSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PlantDefinition
        fields = ["id", "external_id", "display_name", "latin"]

    def get_display_name(self, obj: PlantDefinition):
        request = self.context.get("request")
        lang = _pick_language(request)
        tr = _get_translation(obj, lang)
        if tr and tr.common_name.strip():
            return tr.common_name.strip()
        return obj.name.strip() or obj.latin


class PlantDefinitionProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    image = serializers.SerializerMethodField()
    image_thumb = serializers.SerializerMethodField()

    class Meta:
        model = PlantDefinition
        fields = [
            "id",
            "external_id",
            "display_name",
            "latin",
            "image",
            "image_thumb",
            "description",
            "traits",  # JSON field kept for now
            "sun",
            "water",
            "difficulty",
            "recommended_pot_materials",
            "recommended_soil_mixes",
            "water_required",
            "water_interval_days",
            "moisture_required",
            "moisture_interval_days",
            "fertilize_required",
            "fertilize_interval_days",
            "repot_required",
            "repot_interval_months",
        ]

    def get_image(self, obj: PlantDefinition):
        request = self.context.get("request")
        if obj.image_hero:
            return request.build_absolute_uri(obj.image_hero.url) if request else obj.image_hero.url
        if obj.image_thumb:
            return request.build_absolute_uri(obj.image_thumb.url) if request else obj.image_thumb.url
        return None

    def get_image_thumb(self, obj: PlantDefinition):
        request = self.context.get("request")
        if obj.image_thumb:
            return request.build_absolute_uri(obj.image_thumb.url) if request else obj.image_thumb.url
        return None

    def get_display_name(self, obj: PlantDefinition):
        request = self.context.get("request")
        lang = _pick_language(request)
        tr = _get_translation(obj, lang)
        if tr and tr.common_name.strip():
            return tr.common_name.strip()
        return obj.name.strip() or obj.latin

    def get_description(self, obj: PlantDefinition):
        request = self.context.get("request")
        lang = _pick_language(request)
        tr = _get_translation(obj, lang)
        if tr and tr.description.strip():
            return tr.description.strip()
        return ""
