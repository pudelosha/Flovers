from rest_framework import serializers
from django.conf import settings
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


def _abs_media_url(request, value) -> str | None:
    """
    Build an absolute URL that works for real devices.

    Supports:
    - ImageField/FileField (has .url)
    - raw strings:
        - full URL: https://...
        - relative media path: plants/hero/x.jpg
        - bare filename: x.jpg (assumes plants/hero/)
    """
    if not value:
        return None

    rel = getattr(value, "url", None)

    # Support string values too (in case some rows were seeded differently)
    if not rel and isinstance(value, str):
        v = value.strip()
        if not v:
            return None

        if v.startswith("http://") or v.startswith("https://"):
            return v

        v = v.replace("\\", "/").lstrip("/")
        if "/" not in v:
            rel = f"{settings.MEDIA_URL.rstrip('/')}/plants/hero/{v}"
        else:
            rel = f"{settings.MEDIA_URL.rstrip('/')}/{v}"

    if not rel:
        return None

    base = (getattr(settings, "SITE_URL", "") or "").strip()
    if base:
        return base.rstrip("/") + rel

    return request.build_absolute_uri(rel) if request else rel


class PopularPlantDefinitionSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PlantDefinition
        fields = ["id", "external_id", "display_name", "latin", "image", "sun", "water", "difficulty"]

    def get_image(self, obj: PlantDefinition):
        request = self.context.get("request")
        if obj.image_thumb:
            return _abs_media_url(request, obj.image_thumb)
        if obj.image_hero:
            return _abs_media_url(request, obj.image_hero)
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
            "id", "external_id", "display_name", "latin", "image", "image_thumb", "description",
            "traits", "sun", "water", "difficulty", "recommended_pot_materials", "recommended_soil_mixes",
            "water_required", "water_interval_days", "moisture_required", "moisture_interval_days",
            "fertilize_required", "fertilize_interval_days", "repot_required", "repot_interval_months",
        ]

    def get_image(self, obj: PlantDefinition):
        request = self.context.get("request")
        if obj.image_hero:
            return _abs_media_url(request, obj.image_hero)
        if obj.image_thumb:
            return _abs_media_url(request, obj.image_thumb)
        return None

    def get_image_thumb(self, obj: PlantDefinition):
        request = self.context.get("request")
        if obj.image_thumb:
            return _abs_media_url(request, obj.image_thumb)
        return None

    def get_display_name(self, obj: PlantDefinition):
        request = self.context.get("request")
        lang = _pick_language(request)
        tr = _get_translation(obj, lang)
        if tr and tr.common_name.strip():
            return tr.common_name.strip()
        else:
            print(f"Warning: Missing translation for {obj.id} in {lang}, using fallback.")
            return obj.name.strip() or obj.latin

    def get_description(self, obj: PlantDefinition):
        request = self.context.get("request")
        lang = _pick_language(request)
        tr = _get_translation(obj, lang)
        if tr and tr.description.strip():
            return tr.description.strip()
        else:
            print(f"Warning: Missing description translation for {obj.id} in {lang}, using fallback.")
            return ""
