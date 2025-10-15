from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db.models.functions import Lower
from .models import Location
from .serializers import LocationSerializer

class LocationsListCreateView(APIView):
    """
    GET  /api/locations/        -> list current user's locations
    POST /api/locations/ {name, category} -> create if not duplicate (case-insensitive)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Location.objects.filter(user=request.user).only("id", "name", "category")
        data = LocationSerializer(qs, many=True).data
        return Response(data)

    def post(self, request):
        payload = {k: request.data.get(k) for k in ("name", "category")}
        # Case-insensitive duplicate check
        exists = Location.objects.filter(
            user=request.user, name__iexact=(payload.get("name") or "").strip()
        ).exists()
        if exists:
            return Response(
                {"message": "Location with this name already exists."},
                status=status.HTTP_409_CONFLICT,
            )

        ser = LocationSerializer(data=payload)
        ser.is_valid(raise_exception=True)
        obj = ser.save(user=request.user)
        return Response(LocationSerializer(obj).data, status=status.HTTP_201_CREATED)
