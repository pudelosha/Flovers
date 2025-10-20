from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView

from .models import PlantInstance
from .serializers import PlantInstanceSerializer, PlantInstanceListSerializer


class PlantInstanceListCreateView(ListCreateAPIView):
    """
    GET  /api/plant-instances/      -> list current user's plant instances
    POST /api/plant-instances/      -> create a plant instance for current user
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # read-optimized on GET; write serializer on POST
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
        out = PlantInstanceSerializer(obj, context={"request": request}).data
        return Response(out, status=status.HTTP_201_CREATED)


class PlantInstanceDetailView(RetrieveUpdateDestroyAPIView):
    """
    GET    /api/plant-instances/<id>/  -> retrieve single (read-format)
    PATCH  /api/plant-instances/<id>/  -> partial update (write-format)
    PUT    /api/plant-instances/<id>/  -> full update (write-format)
    DELETE /api/plant-instances/<id>/  -> delete
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # protect by user
        return (
            PlantInstance.objects
            .filter(user=self.request.user)
            .select_related("location", "plant_definition")
        )

    def get_serializer_class(self):
        if self.request.method in ["GET"]:
            return PlantInstanceListSerializer
        # for write operations, use the write serializer
        return PlantInstanceSerializer


class PlantInstanceByQRView(APIView):
    """
    GET /api/plant-instances/by-qr/?code=<opaque>
    Requires auth. Returns 404 if code not found for this user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        code = request.query_params.get("code")
        if not code:
            return Response({"detail": "Missing 'code' query parameter."},
                            status=status.HTTP_400_BAD_REQUEST)

        plant = (
            PlantInstance.objects
            .filter(user=request.user, qr_code=code)
            .select_related("location", "plant_definition")
            .first()
        )
        if not plant:
            # 404 to avoid leaking whether the code exists for other users
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        data = PlantInstanceSerializer(plant, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)
