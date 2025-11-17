from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db.models.functions import Lower
from django.db.models import Count
from .models import Location
from .serializers import LocationSerializer
from django.shortcuts import get_object_or_404
from django.db.models import Count
from django.db.models import ProtectedError

class LocationsListCreateView(APIView):
    """
    GET  /api/locations/        -> list current user's locations (+ plant_count)
    POST /api/locations/ {name, category} -> create if not duplicate (case-insensitive)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Location.objects
            .filter(user=request.user)
            .only("id", "name", "category")  # created_at/updated_at are accessed but that's fine
            .annotate(
                plant_count=Count("plant_instances")  # uses related_name from PlantInstance
            )
        )
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

        # brand-new location: 0 plants
        obj.plant_count = 0  # attribute for serializer
        data = LocationSerializer(obj).data
        return Response(data, status=status.HTTP_201_CREATED)
    
class LocationDetailView(APIView):
    """
    GET    /api/locations/<id>/      -> single location with plant_count
    PATCH  /api/locations/<id>/      -> update name/category (duplicate-safe)
    DELETE /api/locations/<id>/      -> delete location (409 if plants linked)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        return get_object_or_404(Location, pk=pk, user=request.user)

    def get(self, request, pk):
        obj = (
            Location.objects
            .filter(user=request.user, pk=pk)
            .annotate(plant_count=Count("plant_instances"))
            .first()
        )
        if not obj:
            return Response(status=status.HTTP_404_NOT_FOUND)
        data = LocationSerializer(obj).data
        return Response(data)

    def patch(self, request, pk):
        loc = self.get_object(request, pk)

        payload = {
            "name": request.data.get("name", loc.name),
            "category": request.data.get("category", loc.category),
        }

        # If name changed, enforce case-insensitive uniqueness per user
        new_name = (payload.get("name") or "").strip()
        if new_name.lower() != loc.name.strip().lower():
            exists = Location.objects.filter(
                user=request.user,
                name__iexact=new_name,
            ).exclude(pk=loc.pk).exists()
            if exists:
                return Response(
                    {"message": "Location with this name already exists."},
                    status=status.HTTP_409_CONFLICT,
                )

        ser = LocationSerializer(loc, data=payload, partial=True)
        ser.is_valid(raise_exception=True)
        obj = ser.save()

        # annotate plant_count for response
        obj.plant_count = obj.plant_instances.count()
        data = LocationSerializer(obj).data
        return Response(data)

    def delete(self, request, pk):
        loc = self.get_object(request, pk)
        try:
            loc.delete()
        except ProtectedError:
            # There are PlantInstance rows pointing to this location
            return Response(
                {"message": "Cannot delete a location that has plants assigned."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
