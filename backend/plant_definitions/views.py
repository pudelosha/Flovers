from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView

from .models import PlantDefinition
from .serializers import (
    PopularPlantDefinitionSerializer,
    PlantDefinitionSuggestionSerializer,
    PlantDefinitionProfileSerializer,
)
from .utils import resolve_plant_definition_by_key

def _pick_language(request) -> str:
    """
    Pick the language from the request, either from query parameters or the Accept-Language header.
    Defaults to 'en' if no language is provided.
    """
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

class PopularPlantDefinitionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lang = _pick_language(request)
        qs = (
            PlantDefinition.objects.filter(popular=True)
            .prefetch_related("translations")
            .only(
                "id",
                "external_id",
                "name",
                "latin",
                "image_thumb",
                "image_hero",
                "sun",
                "water",
                "difficulty",
                "popular",
            )
        )
        data = PopularPlantDefinitionSerializer(qs, many=True, context={"request": request, "lang": lang}).data
        return Response(data)

class PlantDefinitionSearchIndexView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search_query = request.query_params.get("search", "").strip()

        if search_query:
            search_query = search_query.replace("_", " ")
            qs = (
                PlantDefinition.objects.filter(latin__icontains=search_query)
                .prefetch_related("translations")
                .only("id", "external_id", "name", "latin")
            )
        else:
            qs = (
                PlantDefinition.objects.all()
                .prefetch_related("translations")
                .only("id", "external_id", "name", "latin")
            )

        data = PlantDefinitionSuggestionSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

class PlantDefinitionProfileView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    queryset = PlantDefinition.objects.all().prefetch_related("translations")
    serializer_class = PlantDefinitionProfileSerializer

    def get(self, request, *args, **kwargs):
        try:
            plant = self.get_object()
            serializer = self.get_serializer(plant)
            return Response(serializer.data)
        except PlantDefinition.DoesNotExist:
            return Response({"error": "Plant not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class PlantDefinitionProfileByKeyView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    lookup_field = "external_id"
    queryset = PlantDefinition.objects.all().prefetch_related("translations")
    serializer_class = PlantDefinitionProfileSerializer

    def get(self, request, *args, **kwargs):
        try:
            plant_key = kwargs.get("external_id")
            print(f"Fetching plant profile for external_id: {plant_key}")
            plant = resolve_plant_definition_by_key(plant_key)
            if plant is None:
                return Response({"error": "Plant not found"}, status=404)
            serializer = self.get_serializer(plant)
            return Response(serializer.data)
        except PlantDefinition.DoesNotExist:
            return Response({"error": "Plant not found"}, status=404)
        except Exception as e:
            print(f"Error fetching plant profile: {str(e)}")
            return Response({"error": str(e)}, status=500)
