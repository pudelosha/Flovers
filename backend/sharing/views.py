from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from contacts.views import ActiveAccountPermission
from .serializers import SharingUpdateSerializer
from .services import SharingError, remove_share, sharing_snapshot, update_sharing


class SharingWriteThrottle(UserRateThrottle):
    scope = "plant_sharing_write"


class SharingBaseView(APIView):
    permission_classes = [IsAuthenticated, ActiveAccountPermission]

    def get_throttles(self):
        throttles = super().get_throttles()
        if self.request.method not in {"GET", "HEAD", "OPTIONS"}:
            throttles.append(SharingWriteThrottle())
        return throttles


class SharingView(SharingBaseView):

    def get(self, request):
        return Response({"status": "success", "data": sharing_snapshot(request.user, request)})

    def put(self, request):
        serializer = SharingUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            raise SharingError("invalid", "Check the selected plants, contacts and dates.")
        data = update_sharing(request.user, serializer.validated_data["updates"], request)
        return Response({"status": "success", "data": data})


class SharingDeleteView(SharingBaseView):

    def delete(self, request, share_id):
        return Response({"status": "success", "data": remove_share(request.user, share_id, request)})
