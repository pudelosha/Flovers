from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.utils import timezone
from .models import PushDevice
from .serializers import PushDeviceSerializer

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

class PushDeviceRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Register/update a device token for push notifications.

        Body:
          token: str (FCM token)
          platform: "android" (or "ios" later)
        """
        ser = PushDeviceSerializer(data=request.data)
        if not ser.is_valid():
            return Response({"status": "error", "message": "Validation failed.", "errors": ser.errors}, status=400)

        token = ser.validated_data["token"]
        platform = ser.validated_data["platform"]

        obj, created = PushDevice.objects.get_or_create(
            token=token,
            defaults={
                "user": request.user,
                "platform": platform,
                "is_active": True,
                "last_seen_at": timezone.now(),
            },
        )

        if not created:
            # If token reappears (reinstall), re-associate and activate
            updates = {}
            if obj.user_id != request.user.id:
                updates["user"] = request.user
            if obj.platform != platform:
                updates["platform"] = platform
            if not obj.is_active:
                updates["is_active"] = True
            updates["last_seen_at"] = timezone.now()

            for k, v in updates.items():
                setattr(obj, k, v)
            obj.save(update_fields=[*updates.keys(), "updated_at"])

        return ok("Push device registered.", PushDeviceSerializer(obj).data)

# TODO Optional “disable token” endpoint (nice for logout) can be added later.