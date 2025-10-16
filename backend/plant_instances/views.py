from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView

from .models import PlantInstance
from .serializers import PlantInstanceSerializer, PlantInstanceListSerializer


class PlantInstanceListCreateView(ListCreateAPIView):
    """
    GET  /api/plant-instances/  -> list current user's plant instances
    POST /api/plant-instances/  -> create a plant instance for current user
    """
    permission_classes = [IsAuthenticated]

    # Use the read-only list serializer on GET, and the write serializer on POST
    def get_serializer_class(self):
        if self.request.method == "GET":
            return PlantInstanceListSerializer
        return PlantInstanceSerializer

    def get_queryset(self):
        return (
            PlantInstance.objects
            .filter(user=self.request.user)
            .select_related("location", "plant_definition")
        )

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        data = self.get_serializer(qs, many=True).data
        return Response(data)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        # return with write-serializer (includes all fields)
        out = PlantInstanceSerializer(obj, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)
