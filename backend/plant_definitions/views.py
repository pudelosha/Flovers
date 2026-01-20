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

class PopularPlantDefinitionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
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
        data = PopularPlantDefinitionSerializer(qs, many=True, context={"request": request}).data
        return Response(data)

class PlantDefinitionSearchIndexView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        search_query = request.query_params.get("search", "").strip()

        # If there's a search query, filter by the latin field (with or without underscores)
        if search_query:
            # Replace underscores with spaces before querying
            search_query = search_query.replace("_", " ")
            qs = (
                PlantDefinition.objects.filter(latin__icontains=search_query)  # Case insensitive search
                .prefetch_related("translations")
                .only("id", "external_id", "name", "latin")
            )
        else:
            # If no search query, return all plants
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
            print(f"Fetching plant profile for external_id: {plant_key}")  # Log the external_id
            plant = self.get_object()
            serializer = self.get_serializer(plant)
            return Response(serializer.data)
        except PlantDefinition.DoesNotExist:
            return Response({"error": "Plant not found"}, status=404)
        except Exception as e:
            print(f"Error fetching plant profile: {str(e)}")  # Log the error for debugging
            return Response({"error": str(e)}, status=500)


