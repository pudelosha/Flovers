from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView

from .models import PlantInstance
from .serializers import (
    PlantInstanceSerializer,
    PlantInstanceListSerializer,
    PlantInstanceDetailSerializer,  # NEW
)


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
    GET    /api/plant-instances/<id>/  -> retrieve single (FULL detail read-format)
    PATCH  /api/plant-instances/<id>/  -> partial update (responds with list/read-format)
    PUT    /api/plant-instances/<id>/  -> full update (responds with list/read-format)
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

    # keep default write serializer choice for PATCH/PUT via DRF, but override responses

    def retrieve(self, request, *args, **kwargs):
        """Return FULL detail shape needed by the mobile edit screen."""
        instance = self.get_object()
        serializer = PlantInstanceDetailSerializer(instance, context={"request": request})
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self._update_and_respond(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        return self._update_and_respond(request, *args, **kwargs)

    def _update_and_respond(self, request, *args, **kwargs):
        """Apply write serializer for validation, then respond with list/read shape."""
        partial = kwargs.get("partial", False)
        instance = self.get_object()
        write_ser = PlantInstanceSerializer(
            instance, data=request.data, partial=partial, context={"request": request}
        )
        write_ser.is_valid(raise_exception=True)
        obj = write_ser.save()
        read_ser = PlantInstanceListSerializer(obj, context={"request": request})
        return Response(read_ser.data)


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

        # return the READ shape, same as list/detail GET (list shape is fine here)
        data = PlantInstanceListSerializer(plant, context={"request": request}).data
        return Response(data, status=status.HTTP_200_OK)
