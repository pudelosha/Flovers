from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from .models import Plant
from .serializers import (
    PopularPlantSerializer,
    PlantSuggestionSerializer,
    PlantProfileSerializer,
)

class PopularPlantsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Plant.objects.filter(popular=True).only(
            "id", "name", "latin", "image_thumb_url", "image_hero_url", "sun", "water", "difficulty"
        )
        data = PopularPlantSerializer(qs, many=True).data
        return Response(data)

class PlantSearchIndexView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Plant.objects.all().only("id", "name", "latin")
        data = PlantSuggestionSerializer(qs, many=True).data
        return Response(data)

class PlantProfileView(RetrieveAPIView):
    """
    GET /api/plants/<id>/profile/
    """
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    queryset = Plant.objects.all()
    serializer_class = PlantProfileSerializer
