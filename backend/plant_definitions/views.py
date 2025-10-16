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
        qs = PlantDefinition.objects.filter(popular=True).only(
            "id", "name", "latin", "image_thumb_url", "image_hero_url", "sun", "water", "difficulty"
        )
        data = PopularPlantDefinitionSerializer(qs, many=True).data
        return Response(data)

class PlantDefinitionSearchIndexView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = PlantDefinition.objects.all().only("id", "name", "latin")
        data = PlantDefinitionSuggestionSerializer(qs, many=True).data
        return Response(data)

class PlantDefinitionProfileView(RetrieveAPIView):
    """
    GET /api/plant-definitions/<id>/profile/
    """
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    queryset = PlantDefinition.objects.all()
    serializer_class = PlantDefinitionProfileSerializer
