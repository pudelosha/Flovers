from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import ProfileSettings, ProfileNotifications
from .serializers import ProfileSettingsSerializer, ProfileNotificationsSerializer


def ok(message: str, data: dict | None = None, code=status.HTTP_200_OK):
    return Response({"status": "success", "message": message, "data": data or {}}, status=code)


class ProfileSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        obj, _ = ProfileSettings.objects.get_or_create(user=request.user)
        ser = ProfileSettingsSerializer(obj)
        return ok("Profile settings fetched.", ser.data)

    def patch(self, request):
        obj, _ = ProfileSettings.objects.get_or_create(user=request.user)
        ser = ProfileSettingsSerializer(instance=obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response({"status": "error", "message": "Validation failed.", "errors": ser.errors}, status=400)
        ser.save()
        return ok("Profile settings updated.", ser.data)


class ProfileNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        obj, _ = ProfileNotifications.objects.get_or_create(user=request.user)
        ser = ProfileNotificationsSerializer(obj)
        return ok("Profile notifications fetched.", ser.data)

    def patch(self, request):
        obj, _ = ProfileNotifications.objects.get_or_create(user=request.user)
        ser = ProfileNotificationsSerializer(instance=obj, data=request.data, partial=True)
        if not ser.is_valid():
            return Response({"status": "error", "message": "Validation failed.", "errors": ser.errors}, status=400)
        ser.save()
        return ok("Profile notifications updated.", ser.data)
