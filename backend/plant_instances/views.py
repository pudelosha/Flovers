from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .serializers import PlantInstanceSerializer

class PlantInstanceCreateView(APIView):
    """
    POST /api/plant-instances/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = PlantInstanceSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        return Response(PlantInstanceSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)
