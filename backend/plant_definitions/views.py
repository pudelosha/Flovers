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
        qs = (
            PlantDefinition.objects.all()
            .prefetch_related("translations")
            .only("id", "external_id", "name", "latin")
        )
        data = PlantDefinitionSuggestionSerializer(qs, many=True, context={"request": request}).data
        return Response(data)


class PlantDefinitionProfileView(RetrieveAPIView):
    """
    GET /api/plant-definitions/<id>/profile/
    """
    permission_classes = [IsAuthenticated]
    lookup_field = "pk"
    queryset = PlantDefinition.objects.all().prefetch_related("translations")
    serializer_class = PlantDefinitionProfileSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class PlantDefinitionProfileByKeyView(RetrieveAPIView):
    """
    GET /api/plant-definitions/by-key/<external_id>/profile/
    """
    permission_classes = [IsAuthenticated]
    lookup_field = "external_id"
    queryset = PlantDefinition.objects.all().prefetch_related("translations")
    serializer_class = PlantDefinitionProfileSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx
